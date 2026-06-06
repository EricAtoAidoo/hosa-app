// src/routes/donations.js
const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate, requireLevel } = require('../middleware/auth');
const { asyncHandler, genDonationId } = require('../utils/helpers');

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { memberId } = req.query;
  let q = 'SELECT * FROM donations';
  const p = [];
  if (memberId) {
    q += ' WHERE beneficiary_member_id=$1 OR donor_member_id=$1';
    p.push(memberId);
  }
  q += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(q, p);
  res.json({ success: true, data: rows });
}));

router.post('/', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { rows: count } = await pool.query('SELECT COUNT(*) FROM donations');
  const donationId = genDonationId(new Date().getFullYear(), parseInt(count[0].count));
  const { program_name, beneficiary_member_id, beneficiary_name, amount, date, donor_member_id, donor_name, status, notes, recorded_by } = req.body;

  await pool.query(
    `INSERT INTO donations (donation_id, program_name, beneficiary_member_id, beneficiary_name, amount, date, donor_member_id, donor_name, status, notes, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [donationId, program_name, beneficiary_member_id||'', beneficiary_name, parseFloat(amount)||0,
     date||new Date().toLocaleDateString('en-GH'), donor_member_id||'', donor_name||'HOSA (Association)',
     status||'Completed', notes||'', recorded_by||'Admin']
  );

  await pool.query(
    `INSERT INTO receipts (receipt_id, type, member_id, member_name, program_or_purpose, amount, date, recorded_by, status)
     VALUES ($1,'Donation',$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
    [donationId, donor_member_id||'', donor_name||'HOSA',
     'Donation for ' + beneficiary_name + ' — ' + program_name,
     parseFloat(amount)||0, date||new Date().toLocaleDateString('en-GH'),
     recorded_by||'Admin', status||'Completed']
  );

  await logActivity(pool, 'ADD_DONATION', recorded_by||'Admin', 'Donation to ' + beneficiary_name + ' — GH₵ ' + amount);
  res.json({ success: true, donationId, message: 'Donation recorded. ID: ' + donationId });
}));

router.put('/:id', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { program_name, beneficiary_member_id, beneficiary_name, amount, date, donor_member_id, donor_name, status, notes } = req.body;
  await pool.query(
    `UPDATE donations SET program_name=$1, beneficiary_member_id=$2, beneficiary_name=$3,
     amount=$4, date=$5, donor_member_id=$6, donor_name=$7, status=$8, notes=$9
     WHERE donation_id=$10`,
    [program_name, beneficiary_member_id||'', beneficiary_name, parseFloat(amount)||0, date||'',
     donor_member_id||'', donor_name||'', status||'Completed', notes||'', req.params.id]
  );
  await logActivity(pool, 'EDIT_DONATION', req.user?.full_name||'Admin', req.params.id);
  res.json({ success: true, message: 'Donation updated.' });
}));

router.delete('/:id', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM donations WHERE donation_id=$1', [req.params.id]);
  if (!rowCount) return res.json({ success: false, error: 'Donation not found: ' + req.params.id });
  await logActivity(pool, 'DELETE_DONATION', req.user?.full_name||'Admin', req.params.id);
  res.json({ success: true, message: 'Donation ' + req.params.id + ' deleted.' });
}));

async function logActivity(pool, action, performedBy, target) {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM activity_log');
    const logId = 'LOG' + String(parseInt(rows[0].count) + 1).padStart(6, '0');
    await pool.query(
      'INSERT INTO activity_log (log_id, action, performed_by, target) VALUES ($1,$2,$3,$4)',
      [logId, action, performedBy || 'Admin', target || '']
    );
  } catch {}
}

module.exports = router;
