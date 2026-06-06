// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const ROLE_LEVELS = {
  'Member':              1,
  'Executive':           2,
  'PRO':                 3,
  'Secretary':           3,
  'Financial Secretary': 4,
  'Admin':               5,
  'Super Admin':         6,
};

/**
 * Verifies JWT and attaches user to req.user.
 * Does NOT check role level — use requireLevel() for that.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'hosa_secret_2026');
    } catch {
      return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
    }

    // Fetch fresh user from DB
    const { rows } = await pool.query(
      'SELECT u.*, m.full_name, m.phone, m.email, m.year_group, m.photo_url FROM users u LEFT JOIN members m ON m.member_id = u.member_id WHERE u.user_id = $1 AND u.status = $2',
      [decoded.userId, 'Active']
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
    }

    req.user = rows[0];
    req.user.allRoles = (rows[0].roles || 'Member').split(',').map(r => r.trim());
    req.user.level    = Math.max(...req.user.allRoles.map(r => ROLE_LEVELS[r] || 1));
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(500).json({ success: false, error: 'Server error during authentication.' });
  }
}

/**
 * Returns middleware that requires a minimum role level.
 * Must be used AFTER authenticate().
 */
function requireLevel(minLevel) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (req.user.level < minLevel) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Your role (${req.user.primary_role}) cannot perform this action.`,
      });
    }
    next();
  };
}

module.exports = { authenticate, requireLevel, ROLE_LEVELS };
