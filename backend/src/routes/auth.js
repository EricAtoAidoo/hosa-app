// src/routes/auth.js
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, padId } = require('../utils/helpers');

const JWT_SECRET = process.env.JWT_SECRET || 'hosa_secret_2026';
const ROLE_LEVELS = {
  'Member':1,'Executive':2,'PRO':3,'Secretary':3,
  'Financial Secretary':4,'Admin':5,'Super Admin':6,
};

// ── POST /api/auth/verify-member ─────────────────────────
// Check if name exists in MEMBERS table
router.post('/verify-member', asyncHandler(async (req, res) => {
  const { name, yearGroup } = req.body;
  if (!name || !name.trim()) {
    return res.json({ success: false, error: 'Please enter your full name.' });
  }

  const { rows: members } = await pool.query(
    `SELECT m.*, u.user_id, u.roles, u.primary_role, u.executive_roles
     FROM members m
     LEFT JOIN users u ON u.member_id = m.member_id
     WHERE LOWER(TRIM(m.full_name)) = LOWER(TRIM($1))`,
    [name.trim()]
  );

  if (!members.length) {
    return res.json({
      success: true, found: false,
      message: 'You are not registered in the HOSA database. Please contact the administrator.',
    });
  }

  if (members.length > 1) {
    if (!yearGroup || !yearGroup.trim()) {
      return res.json({ success: true, found: true, multipleFound: true });
    }
    const narrowed = members.filter(
      m => (m.year_group || '').toLowerCase().trim() === yearGroup.trim().toLowerCase()
    );
    if (!narrowed.length) {
      return res.json({
        success: true, found: false,
        message: 'No member found with that name and year group. Please check and try again.',
      });
    }
    if (narrowed.length > 1) {
      return res.json({ success: false, error: 'Multiple members share this name and year group. Please contact the administrator.' });
    }
    const m = narrowed[0];
    return res.json({
      success: true, found: true,
      memberId: m.member_id, fullName: m.full_name, yearGroup: m.year_group,
      roles: m.roles || '', primaryRole: m.primary_role || '',
      executiveRoles: m.executive_roles || '', hasAccount: !!m.user_id,
    });
  }

  const m = members[0];
  return res.json({
    success: true, found: true,
    memberId: m.member_id, fullName: m.full_name, yearGroup: m.year_group,
    roles: m.roles || '', primaryRole: m.primary_role || '',
    executiveRoles: m.executive_roles || '', hasAccount: !!m.user_id,
  });
}));

// ── POST /api/auth/login ──────────────────────────────────
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, error: 'Username and password are required.' });
  }

  const { rows } = await pool.query(
    `SELECT u.*, m.full_name, m.phone, m.email, m.photo_url
     FROM users u
     LEFT JOIN members m ON m.member_id = u.member_id
     WHERE LOWER(TRIM(u.username)) = LOWER(TRIM($1))`,
    [username.trim()]
  );

  const user = rows[0];
  if (!user) {
    return res.json({ success: false, error: 'Invalid username or password.' });
  }

  const validPass = await bcrypt.compare(password, user.password_hash);
  if (!validPass) {
    return res.json({ success: false, error: 'Invalid username or password.' });
  }

  if (user.status === 'Inactive') {
    return res.json({
      success: false, blocked: true,
      error: 'Your account has been suspended. Please contact the administrator.',
    });
  }

  // Update last_login
  await pool.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);

  // Log activity
  await logActivity(pool, 'LOGIN', user.member_id + ' (' + user.username + ')', 'System');

  const token = jwt.sign(
    { userId: user.user_id, memberId: user.member_id },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  const allRoles = (user.roles || 'Member').split(',').map(r => r.trim());

  res.json({
    success: true, token,
    userId: user.user_id, memberId: user.member_id,
    username: user.username, fullName: user.full_name || user.username,
    phone: user.phone || '', roles: user.roles,
    primaryRole: user.primary_role, executiveRoles: user.executive_roles || '',
    allRoles,
  });
}));

// ── POST /api/auth/create-account ────────────────────────
router.post('/create-account', asyncHandler(async (req, res) => {
  const { memberId, password } = req.body;
  if (!memberId || !password) return res.json({ success: false, error: 'Member ID and password are required.' });
  if (password.length < 6)    return res.json({ success: false, error: 'Password must be at least 6 characters.' });

  const { rows: members } = await pool.query('SELECT * FROM members WHERE member_id = $1', [memberId]);
  if (!members.length) return res.json({ success: false, error: 'Member not found.' });

  const { rows: existing } = await pool.query('SELECT user_id FROM users WHERE member_id = $1', [memberId]);
  if (existing.length) return res.json({ success: false, error: 'This member already has an account. Please sign in.' });

  const { rows: allUsers } = await pool.query('SELECT user_id FROM users');
  const nums   = allUsers.map(u => parseInt((u.user_id || '').replace('U', ''), 10)).filter(n => !isNaN(n));
  const userId = 'U' + padId(nums.length ? Math.max(...nums) + 1 : 1, 3);
  const hash   = await bcrypt.hash(password, 12);
  const member = members[0];

  await pool.query(
    `INSERT INTO users (user_id, member_id, username, password_hash, roles, primary_role, executive_roles, status)
     VALUES ($1,$2,$3,$4,'Member','Member','','Active')`,
    [userId, memberId, member.full_name.trim(), hash]
  );
  await pool.query("UPDATE members SET status = 'Active' WHERE member_id = $1", [memberId]);

  res.json({ success: true, userId, username: member.full_name.trim(), message: 'Account created for ' + member.full_name });
}));

// ── POST /api/auth/reset-password ────────────────────────
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { memberId, newPassword } = req.body;
  if (!memberId || !newPassword) return res.json({ success: false, error: 'Member ID and new password required.' });
  if (newPassword.length < 6)    return res.json({ success: false, error: 'Password must be at least 6 characters.' });

  const { rows } = await pool.query('SELECT * FROM users WHERE member_id = $1', [memberId]);
  if (!rows.length) return res.json({ success: false, error: 'No account found for this member.' });

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE member_id = $2', [hash, memberId]);
  res.json({ success: true, username: rows[0].username, message: 'Password reset successfully.' });
}));

// ── POST /api/auth/change-password ───────────────────────
router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.json({ success: false, error: 'Both passwords are required.' });
  if (newPassword.length < 6)       return res.json({ success: false, error: 'New password must be at least 6 characters.' });

  const { rows } = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.user_id]);
  const valid = await bcrypt.compare(oldPassword, rows[0].password_hash);
  if (!valid) return res.json({ success: false, error: 'Old password is incorrect.' });

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hash, req.user.user_id]);
  res.json({ success: true, message: 'Password changed successfully.' });
}));

async function logActivity(pool, action, performedBy, target) {
  try {
    const allowed = ['EDIT_MEMBER','DELETE_MEMBER','UPDATE_ROLES','UPDATE_EXEC_ROLES','ADD_DONATION','EDIT_DONATION','DELETE_DONATION','LOGIN'];
    if (!allowed.includes(action)) return;
    const { rows } = await pool.query('SELECT COUNT(*) FROM activity_log');
    const logId = 'LOG' + String(parseInt(rows[0].count) + 1).padStart(6, '0');
    await pool.query(
      'INSERT INTO activity_log (log_id, action, performed_by, target) VALUES ($1,$2,$3,$4)',
      [logId, action, performedBy || 'System', target || '']
    );
  } catch {}
}

module.exports = router;
