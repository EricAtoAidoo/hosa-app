// src/routes/contributions.js
const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate, requireLevel } = require('../middleware/auth');
const { asyncHandler, genReceiptId } = require('../utils/helpers');

// ── GET /api/contributions ───────────────────────────────
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { program } = req.query;
  let query = 'SELECT * FROM contributions';
  const params = [];
  if (program) {
    query += ' WHERE LOWER(program_name) LIKE $1';
    params.push('%' + program.toLowerCase() + '%');
  }
  query += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(query, params);
  res.json({ success: true, data: rows });
}));

// ── GET /api/contributions/member/:memberId ───────────────
router.get('/member/:memberId', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM contributions WHERE member_id = $1 ORDER BY created_at DESC',
    [req.params.memberId]
  );
  const total = rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const byYear = {};
  const byProg = {};
  rows.forEach(r => {
    const yr = (r.date_paid || r.created_at || '').toString().substring(0, 4) || 'Unknown';
    byYear[yr] = (byYear[yr] || 0) + parseFloat(r.amount || 0);
    const p = r.program_name || 'General';
    byProg[p] = (byProg[p] || 0) + parseFloat(r.amount || 0);
  });
  res.json({ success: true, data: rows, totalAmount: total, byYear, byProgram: byProg });
}));

// ── GET /api/contributions/search ─────────────────────────
router.get('/search', authenticate, asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: false, error: 'Search term required.' });

  const { rows: contribs } = await pool.query(
    "SELECT * FROM contributions WHERE LOWER(program_name) LIKE $1",
    ['%' + q.toLowerCase() + '%']
  );
  const { rows: members } = await pool.query('SELECT member_id, full_name FROM members');

  const paidMap = {};
  contribs.filter(c => c.status === 'Paid').forEach(c => {
    paidMap[c.member_id] = {
      memberId: c.member_id, memberName: c.member_name,
      amount: parseFloat(c.amount || 0), datePaid: c.date_paid, receiptId: c.receipt_id,
    };
  });

  const paidIds    = new Set(Object.keys(paidMap));
  const paidList   = Object.values(paidMap);
  const unpaidList = members.filter(m => !paidIds.has(m.member_id))
                            .map(m => ({ memberId: m.member_id, memberName: m.full_name }));
  const total      = members.length;
  const paidPct    = total > 0 ? Math.round(paidList.length / total * 100) : 0;
  const totalAmt   = paidList.reduce((s, p) => s + p.amount, 0);

  res.json({
    success: true, query: q, total,
    paidCount: paidList.length, unpaidCount: unpaidList.length,
    paidPct, unpaidPct: 100 - paidPct, totalAmount: totalAmt,
    paidList, unpaidList,
    summary: paidList.length + ' of ' + total + ' members have paid for "' + q + '". ' +
             unpaidList.length + (unpaidList.length === 1 ? ' member has' : ' members have') + ' not paid.',
  });
}));

// ── POST /api/contributions ──────────────────────────────
router.post('/', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { rows: count } = await pool.query('SELECT COUNT(*) FROM contributions');
  const receiptId = genReceiptId(new Date().getFullYear(), parseInt(count[0].count));
  const { member_id, member_name, program_name, amount, status, date_paid, recorded_by, notes } = req.body;

  await pool.query(
    `INSERT INTO contributions (receipt_id, member_id, member_name, program_name, amount, status, date_paid, recorded_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [receiptId, member_id, member_name, program_name,
     parseFloat(amount)||0, status||'Paid',
     date_paid || new Date().toLocaleDateString('en-GH'),
     recorded_by || 'Secretary', notes || '']
  );

  // Auto-generate receipt
  await pool.query(
    `INSERT INTO receipts (receipt_id, type, member_id, member_name, program_or_purpose, amount, date, recorded_by, status)
     VALUES ($1,'Contribution',$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
    [receiptId, member_id, member_name, program_name,
     parseFloat(amount)||0, date_paid || new Date().toLocaleDateString('en-GH'),
     recorded_by || 'Secretary', status || 'Paid']
  );

  res.json({ success: true, receiptId, message: 'Contribution recorded. Receipt: ' + receiptId });
}));

// ── PUT /api/contributions/:id ───────────────────────────
router.put('/:id', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { member_name, program_name, amount, status, date_paid, notes } = req.body;
  await pool.query(
    `UPDATE contributions SET member_name=$1, program_name=$2, amount=$3, status=$4, date_paid=$5, notes=$6
     WHERE receipt_id=$7`,
    [member_name, program_name, parseFloat(amount)||0, status||'Paid', date_paid||'', notes||'', req.params.id]
  );
  res.json({ success: true, message: 'Contribution updated.' });
}));

// ── DELETE /api/contributions/:id ────────────────────────
router.delete('/:id', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM contributions WHERE receipt_id=$1', [req.params.id]);
  if (!rowCount) return res.json({ success: false, error: 'Contribution not found: ' + req.params.id });
  await pool.query('DELETE FROM receipts WHERE receipt_id=$1', [req.params.id]);
  res.json({ success: true, message: 'Contribution ' + req.params.id + ' deleted.' });
}));

module.exports = router;
