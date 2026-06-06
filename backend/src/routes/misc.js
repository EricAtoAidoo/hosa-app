// src/routes/misc.js
// Programs, Announcements, Positions, Projects, Opening Balance, Receipts, Activity, Settings
const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate, requireLevel } = require('../middleware/auth');
const { asyncHandler, padId } = require('../utils/helpers');

// ══════════════ PROGRAMS ══════════════════════════════════

router.get('/programs', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM programs ORDER BY CASE status WHEN 'current' THEN 0 WHEN 'upcoming' THEN 1 WHEN 'future' THEN 2 ELSE 3 END, date ASC");
  res.json({ success: true, data: rows });
}));

router.post('/programs', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { rows: cnt } = await pool.query('SELECT COUNT(*) FROM programs');
  const programId = 'PROG' + padId(parseInt(cnt[0].count) + 1, 3);
  const { title, date, venue, budget, status, description, linked_contribution, performedBy } = req.body;
  await pool.query(
    `INSERT INTO programs (program_id, title, date, venue, budget, status, description, linked_contribution)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [programId, title?.trim(), date||null, venue?.trim()||'', parseFloat(budget)||0,
     status||'upcoming', description?.trim()||'', linked_contribution||'']
  );
  res.json({ success: true, programId, message: 'Program added: ' + title });
}));

router.put('/programs/:id', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { title, date, venue, budget, status, description } = req.body;
  await pool.query(
    `UPDATE programs SET title=$1, date=$2, venue=$3, budget=$4, status=$5, description=$6 WHERE program_id=$7`,
    [title?.trim(), date||null, venue?.trim()||'', parseFloat(budget)||0, status||'upcoming', description?.trim()||'', req.params.id]
  );
  res.json({ success: true, message: 'Program updated.' });
}));

router.delete('/programs/:id', authenticate, requireLevel(5), asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM programs WHERE program_id=$1', [req.params.id]);
  if (!rowCount) return res.json({ success: false, error: 'Program not found.' });
  res.json({ success: true });
}));

// ══════════════ ANNOUNCEMENTS ═════════════════════════════

router.get('/announcements', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
}));

router.post('/announcements', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { rows: cnt } = await pool.query('SELECT COUNT(*) FROM announcements');
  const annoId = 'ANNO' + padId(parseInt(cnt[0].count) + 1, 3);
  const { title, body, posted_by, type, date } = req.body;
  await pool.query(
    `INSERT INTO announcements (announcement_id, title, body, posted_by, type, date)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [annoId, title?.trim(), body?.trim(), posted_by||'Admin', type||'info', date||new Date().toLocaleDateString('en-GH')]
  );
  res.json({ success: true, annoId, message: 'Announcement posted.' });
}));

router.delete('/announcements/:id', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM announcements WHERE announcement_id=$1', [req.params.id]);
  if (!rowCount) return res.json({ success: false, error: 'Announcement not found.' });
  res.json({ success: true });
}));

// ══════════════ POSITIONS ═════════════════════════════════

router.get('/positions', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM positions ORDER BY level DESC');
  res.json({ success: true, data: rows });
}));

router.post('/positions', authenticate, requireLevel(5), asyncHandler(async (req, res) => {
  const { position_name, level, description, createdBy } = req.body;
  if (!position_name) return res.json({ success: false, error: 'Position name is required.' });
  const { rows: cnt } = await pool.query('SELECT COUNT(*) FROM positions');
  const positionId = 'POS' + padId(parseInt(cnt[0].count) + 1, 3);
  await pool.query(
    `INSERT INTO positions (position_id, position_name, level, description, created_by)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT (position_name) DO NOTHING`,
    [positionId, position_name.trim(), parseInt(level)||1, description?.trim()||'', createdBy||'Admin']
  );
  res.json({ success: true, positionId, message: 'Position added: ' + position_name });
}));

router.put('/positions/:id', authenticate, requireLevel(5), asyncHandler(async (req, res) => {
  const { position_name, level, description } = req.body;
  await pool.query(
    'UPDATE positions SET position_name=$1, level=$2, description=$3 WHERE position_id=$4',
    [position_name?.trim(), parseInt(level)||1, description?.trim()||'', req.params.id]
  );
  res.json({ success: true, message: 'Position updated.' });
}));

router.delete('/positions/:id', authenticate, requireLevel(6), asyncHandler(async (req, res) => {
  const protected_ = ['POS001','POS002','POS007'];
  if (protected_.includes(req.params.id)) return res.json({ success: false, error: 'Cannot delete this core system position.' });
  const { rowCount } = await pool.query('DELETE FROM positions WHERE position_id=$1', [req.params.id]);
  if (!rowCount) return res.json({ success: false, error: 'Position not found.' });
  res.json({ success: true });
}));

// ══════════════ PROJECTS ══════════════════════════════════

router.get('/projects', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
  res.json({ success: true, data: rows });
}));

router.post('/projects', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { rows: cnt } = await pool.query('SELECT COUNT(*) FROM projects');
  const projectId = 'PROJ-' + padId(parseInt(cnt[0].count) + 1, 5);
  const { organization, receiver_name, item_or_project, quantity, unit_price, total_amount, hosa_rep, date, notes, recorded_by } = req.body;
  const qty   = parseFloat(quantity)    || 1;
  const price = parseFloat(unit_price)  || 0;
  const total = parseFloat(total_amount)|| (qty * price);
  await pool.query(
    `INSERT INTO projects (project_id, organization, receiver_name, item_or_project, quantity, unit_price, total_amount, hosa_rep, date, notes, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [projectId, organization?.trim(), receiver_name?.trim(), item_or_project?.trim()||'', qty, price, total, hosa_rep?.trim()||'', date||new Date().toLocaleDateString('en-GH'), notes?.trim()||'', recorded_by||'Admin']
  );
  res.json({ success: true, projectId, message: 'Project recorded: ' + projectId });
}));

router.put('/projects/:id', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { organization, receiver_name, item_or_project, quantity, unit_price, total_amount, hosa_rep, date, notes } = req.body;
  const qty   = parseFloat(quantity)    || 1;
  const price = parseFloat(unit_price)  || 0;
  const total = parseFloat(total_amount)|| (qty * price);
  await pool.query(
    `UPDATE projects SET organization=$1, receiver_name=$2, item_or_project=$3, quantity=$4, unit_price=$5, total_amount=$6, hosa_rep=$7, date=$8, notes=$9
     WHERE project_id=$10`,
    [organization?.trim(), receiver_name?.trim(), item_or_project?.trim()||'', qty, price, total, hosa_rep?.trim()||'', date||'', notes?.trim()||'', req.params.id]
  );
  res.json({ success: true, message: 'Project updated.' });
}));

router.delete('/projects/:id', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM projects WHERE project_id=$1', [req.params.id]);
  if (!rowCount) return res.json({ success: false, error: 'Project not found.' });
  res.json({ success: true });
}));

// ══════════════ OPENING BALANCE ═══════════════════════════

router.get('/opening-balances', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM opening_balances ORDER BY year DESC');
  res.json({ success: true, data: rows });
}));

router.post('/opening-balances', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { year, opening_balance, description, recorded_by } = req.body;
  if (!year) return res.json({ success: false, error: 'Year is required.' });
  const balanceId = 'OB-' + String(year).trim();
  try {
    await pool.query(
      `INSERT INTO opening_balances (balance_id, year, opening_balance, description, recorded_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [balanceId, parseInt(year), parseFloat(opening_balance)||0, description?.trim()||'', recorded_by||'Admin']
    );
    res.json({ success: true, balanceId, message: 'Opening balance set for ' + year + '.' });
  } catch (e) {
    if (e.code === '23505') return res.json({ success: false, error: 'An opening balance for ' + year + ' already exists. Edit it instead.' });
    throw e;
  }
}));

router.put('/opening-balances/:id', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { opening_balance, description, recorded_by } = req.body;
  await pool.query(
    'UPDATE opening_balances SET opening_balance=$1, description=$2, recorded_by=$3, updated_at=NOW() WHERE balance_id=$4',
    [parseFloat(opening_balance)||0, description?.trim()||'', recorded_by||'Admin', req.params.id]
  );
  res.json({ success: true, message: 'Opening balance updated.' });
}));

router.delete('/opening-balances/:id', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM opening_balances WHERE balance_id=$1', [req.params.id]);
  if (!rowCount) return res.json({ success: false, error: 'Record not found.' });
  res.json({ success: true });
}));

// ══════════════ RECEIPTS ══════════════════════════════════

router.get('/receipts', authenticate, asyncHandler(async (req, res) => {
  const { memberId } = req.query;
  const { rows: contribIds } = await pool.query('SELECT receipt_id FROM contributions');
  const { rows: donIds }     = await pool.query('SELECT donation_id FROM donations');
  const validC = new Set(contribIds.map(r => r.receipt_id));
  const validD = new Set(donIds.map(r => r.donation_id));

  let q = 'SELECT * FROM receipts';
  const p = [];
  if (memberId) { q += ' WHERE member_id=$1'; p.push(memberId); }
  q += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(q, p);

  const live = rows.filter(r => {
    if ((r.type||'').toLowerCase() === 'contribution') return validC.has(r.receipt_id);
    if ((r.type||'').toLowerCase() === 'donation')    return validD.has(r.receipt_id);
    return true;
  });
  res.json({ success: true, data: live });
}));

// ══════════════ COMPLAINTS ════════════════════════════════

router.get('/complaints', authenticate, asyncHandler(async (req, res) => {
  const { memberId } = req.query;
  let q = 'SELECT * FROM complaints';
  const p = [];
  if (memberId) { q += ' WHERE member_id=$1'; p.push(memberId); }
  q += ' ORDER BY created_at DESC';
  const { rows } = await pool.query(q, p);
  res.json({ success: true, data: rows });
}));

router.post('/complaints', authenticate, asyncHandler(async (req, res) => {
  const { rows: cnt } = await pool.query('SELECT COUNT(*) FROM complaints');
  const complaintId = 'CMP-' + padId(parseInt(cnt[0].count) + 1, 5);
  const { member_id, member_name, subject, body, category } = req.body;
  await pool.query(
    `INSERT INTO complaints (complaint_id, member_id, member_name, subject, body, category)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [complaintId, member_id, member_name, subject?.trim(), body?.trim(), category||'General']
  );
  res.json({ success: true, complaintId, message: 'Complaint submitted.' });
}));

router.put('/complaints/:id', authenticate, asyncHandler(async (req, res) => {
  const { subject, body, category, member_id } = req.body;
  const { rows } = await pool.query('SELECT * FROM complaints WHERE complaint_id=$1', [req.params.id]);
  if (!rows.length) return res.json({ success: false, error: 'Complaint not found.' });
  if (rows[0].member_id !== member_id) return res.json({ success: false, error: 'You can only edit your own complaints.' });
  if (rows[0].status !== 'Open') return res.json({ success: false, error: 'Only open complaints can be edited.' });
  await pool.query(
    'UPDATE complaints SET subject=$1, body=$2, category=$3, updated_at=NOW() WHERE complaint_id=$4',
    [subject?.trim(), body?.trim(), category||'General', req.params.id]
  );
  res.json({ success: true, message: 'Complaint updated.' });
}));

router.patch('/complaints/:id/respond', authenticate, requireLevel(2), asyncHandler(async (req, res) => {
  const { response, responded_by, status } = req.body;
  await pool.query(
    'UPDATE complaints SET response=$1, responded_by=$2, status=$3, updated_at=NOW() WHERE complaint_id=$4',
    [response?.trim(), responded_by?.trim(), status||'Resolved', req.params.id]
  );
  res.json({ success: true, message: 'Response saved.' });
}));

router.delete('/complaints/:id', authenticate, asyncHandler(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM complaints WHERE complaint_id=$1', [req.params.id]);
  res.json(rowCount ? { success: true } : { success: false, error: 'Complaint not found.' });
}));

// ══════════════ ACTIVITY LOG ══════════════════════════════

router.get('/activity', authenticate, requireLevel(5), asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 200');
  res.json({ success: true, data: rows });
}));

// ══════════════ SETTINGS (logo) ═══════════════════════════

router.get('/settings/logo', asyncHandler(async (req, res) => {
  const { rows } = await pool.query("SELECT value FROM app_settings WHERE key='logo'");
  res.json({ success: true, dataUrl: rows[0]?.value || '' });
}));

router.post('/settings/logo', authenticate, requireLevel(5), asyncHandler(async (req, res) => {
  const { dataUrl } = req.body;
  if (!dataUrl) return res.json({ success: false, error: 'No image data provided.' });
  if (dataUrl.length > 7 * 1024 * 1024) return res.json({ success: false, error: 'Image too large. Maximum size is 5MB.' });
  await pool.query(
    "INSERT INTO app_settings (key, value, updated_at) VALUES ('logo',$1,NOW()) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()",
    [dataUrl]
  );
  res.json({ success: true, message: 'Logo saved.' });
}));

router.delete('/settings/logo', authenticate, requireLevel(5), asyncHandler(async (req, res) => {
  await pool.query("DELETE FROM app_settings WHERE key='logo'");
  res.json({ success: true });
}));

module.exports = router;
