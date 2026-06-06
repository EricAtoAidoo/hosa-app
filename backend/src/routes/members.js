// src/routes/members.js
const router = require('express').Router();
const pool   = require('../db/pool');
const { authenticate, requireLevel } = require('../middleware/auth');
const { asyncHandler, nextMemberId } = require('../utils/helpers');

// ── GET /api/members ──────────────────────────────────────
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.*,
            u.user_id, u.roles, u.primary_role, u.executive_roles,
            u.status AS user_status, u.username, u.last_login,
            COALESCE(u.status, m.status, 'Pending Setup') AS member_status
     FROM members m
     LEFT JOIN users u ON u.member_id = m.member_id
     ORDER BY m.full_name`
  );
  res.json({ success: true, data: rows.map(formatMember) });
}));

// ── GET /api/members/executives ───────────────────────────
router.get('/executives', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.member_id, m.full_name, m.phone, m.email, m.photo_url,
            u.primary_role, u.executive_roles
     FROM users u
     JOIN members m ON m.member_id = u.member_id
     WHERE u.executive_roles IS NOT NULL AND TRIM(u.executive_roles) != ''
     ORDER BY m.full_name`
  );
  res.json({
    success: true,
    data: rows.map(r => ({
      memberId: r.member_id, fullName: r.full_name, phone: r.phone,
      email: r.email, photo: r.photo_url,
      primaryRole: r.primary_role, executiveRoles: r.executive_roles,
    })),
  });
}));

// ── GET /api/members/:id ──────────────────────────────────
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.*,
            u.user_id, u.roles, u.primary_role, u.executive_roles,
            u.status AS user_status, u.username, u.last_login,
            COALESCE(u.status, m.status, 'Pending Setup') AS member_status
     FROM members m
     LEFT JOIN users u ON u.member_id = m.member_id
     WHERE m.member_id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.json({ success: false, error: 'Member not found: ' + req.params.id });
  res.json({ success: true, member: formatMember(rows[0]) });
}));

// ── POST /api/members ─────────────────────────────────────
router.post('/', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { full_name, phone, email, year_group, address, photo_url, performedBy } = req.body;
  if (!full_name) return res.json({ success: false, error: 'Full name is required.' });

  const { rows: existing } = await pool.query(
    "SELECT member_id FROM members WHERE LOWER(TRIM(full_name)) = LOWER(TRIM($1))", [full_name]
  );
  if (existing.length) {
    return res.json({ success: false, error: `"${full_name}" already exists (${existing[0].member_id}).` });
  }

  const { rows: allMembers } = await pool.query('SELECT member_id FROM members');
  const memberId = nextMemberId(allMembers.map(r => r.member_id));

  await pool.query(
    `INSERT INTO members (member_id, full_name, phone, email, year_group, address, photo_url, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'Pending Setup')`,
    [memberId, full_name.trim(), phone||'', email||'', year_group||'', address||'', photo_url||'']
  );
  await logActivity(pool, 'ADD_MEMBER', performedBy || req.user.full_name, memberId + ' — ' + full_name);
  res.json({ success: true, memberId, message: full_name + ' added as ' + memberId });
}));

// ── PUT /api/members/:id ──────────────────────────────────
router.put('/:id', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { full_name, phone, email, year_group, address, performedBy } = req.body;

  if (id === 'HOSA001' && req.user.member_id !== 'HOSA001') {
    return res.json({ success: false, error: 'The Super Admin account can only be edited by the Super Admin themselves.' });
  }

  await pool.query(
    `UPDATE members SET full_name=$1, phone=$2, email=$3, year_group=$4, address=$5
     WHERE member_id=$6`,
    [full_name?.trim()||'', phone?.trim()||'', email?.trim()||'', year_group?.trim()||'', address?.trim()||'', id]
  );

  if (full_name) {
    await pool.query('UPDATE users SET username=$1 WHERE member_id=$2', [full_name.trim(), id]);
  }

  await logActivity(pool, 'EDIT_MEMBER', performedBy || req.user.full_name, id);
  res.json({ success: true, message: 'Member updated successfully.' });
}));

// ── DELETE /api/members/:id ───────────────────────────────
router.delete('/:id', authenticate, requireLevel(5), asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (id === 'HOSA001') return res.json({ success: false, error: 'Cannot delete Super Admin (HOSA001).' });

  const { rowCount } = await pool.query('DELETE FROM members WHERE member_id = $1', [id]);
  if (!rowCount) return res.json({ success: false, error: 'Member not found: ' + id });

  await logActivity(pool, 'DELETE_MEMBER', req.user.full_name, id);
  res.json({ success: true, message: id + ' deleted.' });
}));

// ── PATCH /api/members/:id/roles ──────────────────────────
router.patch('/:id/roles', authenticate, requireLevel(5), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { roles, primaryRole } = req.body;
  if (id === 'HOSA001') return res.json({ success: false, error: 'Super Admin account roles are permanently locked.' });

  await pool.query(
    'UPDATE users SET roles=$1, primary_role=$2 WHERE member_id=$3',
    [roles?.trim(), primaryRole || roles?.split(',')[0]?.trim(), id]
  );
  await logActivity(pool, 'UPDATE_ROLES', req.user.full_name, 'New roles: ' + roles);
  res.json({ success: true, message: 'Roles updated.' });
}));

// ── PATCH /api/members/:id/executive-roles ────────────────
router.patch('/:id/executive-roles', authenticate, requireLevel(5), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { executiveRoles } = req.body;
  if (id === 'HOSA001') return res.json({ success: false, error: 'Super Admin account cannot be modified.' });

  await pool.query('UPDATE users SET executive_roles=$1 WHERE member_id=$2', [executiveRoles || '', id]);
  await logActivity(pool, 'UPDATE_EXEC_ROLES', req.user.full_name, 'Exec roles: ' + executiveRoles);
  res.json({ success: true, message: 'Executive roles updated.' });
}));

// ── PATCH /api/members/:id/status ─────────────────────────
router.patch('/:id/status', authenticate, requireLevel(5), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (id === 'HOSA001') return res.json({ success: false, error: 'Super Admin account status cannot be changed.' });

  await pool.query('UPDATE users SET status=$1 WHERE member_id=$2',   [status, id]);
  await pool.query('UPDATE members SET status=$1 WHERE member_id=$2', [status, id]);
  res.json({ success: true, message: id + ' is now ' + status + '.' });
}));

function formatMember(r) {
  return {
    member_id:      r.member_id,
    full_name:      r.full_name,
    phone:          r.phone || '',
    email:          r.email || '',
    year_group:     r.year_group || '',
    address:        r.address || '',
    photo_url:      r.photo_url || '',
    status:         r.status || '',
    created_at:     r.created_at,
    user_id:        r.user_id || null,
    roles:          r.roles || 'Member',
    primaryRole:    r.primary_role || 'Member',
    executiveRoles: r.executive_roles || '',
    hasAccount:     !!r.user_id,
    username:       r.username || '',
    memberStatus:   r.status || 'Pending Setup',
    userStatus:     r.user_status || r.status || 'Pending Setup',
    last_login:     r.last_login || null,
  };
}

async function logActivity(pool, action, performedBy, target) {
  try {
    const allowed = ['ADD_MEMBER','EDIT_MEMBER','DELETE_MEMBER','UPDATE_ROLES','UPDATE_EXEC_ROLES'];
    if (!allowed.includes(action)) return;
    const { rows } = await pool.query('SELECT COUNT(*) FROM activity_log');
    const logId = 'LOG' + String(parseInt(rows[0].count) + 1).padStart(6, '0');
    await pool.query(
      'INSERT INTO activity_log (log_id, action, performed_by, target) VALUES ($1,$2,$3,$4)',
      [logId, action, performedBy || 'Admin', target || '']
    );
  } catch {}
}

module.exports = router;

// ── POST /api/members/bulk ────────────────────────────────
// Bulk import members from CSV upload
router.post('/bulk', authenticate, requireLevel(3), asyncHandler(async (req, res) => {
  const { members: rows } = req.body;
  if (!Array.isArray(rows) || !rows.length) {
    return res.json({ success: false, error: 'No member rows provided.' });
  }

  const { rows: allMembers } = await pool.query('SELECT member_id, full_name FROM members');
  const existingNames = new Set(allMembers.map(r => (r.full_name || '').toLowerCase().trim()));
  const existingNums  = allMembers
    .map(r => parseInt((r.member_id || '').replace('HOSA', ''), 10))
    .filter(n => !isNaN(n));

  let nextNum  = existingNums.length ? Math.max(...existingNums) + 1 : 2;
  let added    = 0;
  let skipped  = 0;
  let failed   = 0;
  const errors = [];

  for (const row of rows) {
    const name = (row.full_name || '').trim();
    if (!name) { skipped++; continue; }
    if (existingNames.has(name.toLowerCase())) { skipped++; continue; }

    try {
      const memberId = 'HOSA' + String(nextNum).padStart(3, '0');
      await pool.query(
        `INSERT INTO members (member_id, full_name, phone, email, year_group, address, status)
         VALUES ($1,$2,$3,$4,$5,$6,'Pending Setup')`,
        [memberId, name, (row.phone||'').trim(), (row.email||'').trim(),
         (row.year_group||'').trim(), (row.address||'').trim()]
      );
      existingNames.add(name.toLowerCase());
      nextNum++;
      added++;
    } catch (err) {
      failed++;
      errors.push(`${name}: ${err.message}`);
    }
  }

  return res.json({
    success: true,
    added, skipped, failed,
    message: `Import complete: ${added} added, ${skipped} skipped, ${failed} failed.`,
    errors,
  });
}));
