// src/index.js — HOSA Backend Server
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const app = express();

// ── Security ──────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: (process.env.FRONTEND_URL || 'http://localhost:3000').split(','),
  credentials: true,
}));

// Rate limiting (generous for internal app)
app.set('trust proxy', 1);
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, error: 'Too many login attempts. Try again in 15 minutes.' } }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, max: 300 }));

// ── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));      // 10MB for logo uploads
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0.0', time: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/members',        require('./routes/members'));
app.use('/api/contributions',  require('./routes/contributions'));
app.use('/api/donations',      require('./routes/donations'));
app.use('/api',                require('./routes/misc'));

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found: ' + req.method + ' ' + req.path });
});

// ── Error handler ─────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Server error:', err.stack || err.message);
  res.status(500).json({ success: false, error: err.message || 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000');
app.listen(PORT, () => {
  console.log(`\n🚀 HOSA Backend running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Database    : ${process.env.DB_NAME || process.env.DATABASE_URL?.split('/').pop() || 'hosa_db'}`);
  console.log(`   CORS origin : ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n`);
});

module.exports = app;
