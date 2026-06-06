-- ============================================================
-- HOSA Smart Membership System — PostgreSQL Schema
-- Version 2.0 | 2026
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── DROP TABLES (for fresh setup) ────────────────────────
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS opening_balances CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS contributions CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS programs CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;

-- ── MEMBERS ──────────────────────────────────────────────
CREATE TABLE members (
  member_id    VARCHAR(20) PRIMARY KEY,           -- e.g. HOSA001
  full_name    VARCHAR(200) NOT NULL,
  phone        VARCHAR(30),
  email        VARCHAR(200),
  year_group   VARCHAR(20),
  address      VARCHAR(500),
  photo_url    TEXT,
  status       VARCHAR(30) DEFAULT 'Pending Setup',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── POSITIONS ─────────────────────────────────────────────
CREATE TABLE positions (
  position_id    VARCHAR(20) PRIMARY KEY,
  position_name  VARCHAR(100) NOT NULL UNIQUE,
  level          INTEGER DEFAULT 1,
  description    TEXT,
  created_by     VARCHAR(200) DEFAULT 'System',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── USERS (login accounts) ────────────────────────────────
CREATE TABLE users (
  user_id          VARCHAR(20) PRIMARY KEY,
  member_id        VARCHAR(20) REFERENCES members(member_id) ON DELETE CASCADE,
  username         VARCHAR(200) NOT NULL,
  password_hash    TEXT NOT NULL,
  roles            TEXT DEFAULT 'Member',          -- comma-separated system roles
  primary_role     VARCHAR(100) DEFAULT 'Member',
  executive_roles  TEXT DEFAULT '',               -- e.g. "Chairman", "Treasurer"
  status           VARCHAR(30) DEFAULT 'Active',   -- Active | Inactive | Pending Setup
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  last_login       TIMESTAMPTZ,
  UNIQUE(member_id)
);

-- ── PROGRAMS ──────────────────────────────────────────────
CREATE TABLE programs (
  program_id           VARCHAR(20) PRIMARY KEY,
  title                VARCHAR(300) NOT NULL,
  date                 DATE,
  venue                VARCHAR(300),
  budget               NUMERIC(12,2) DEFAULT 0,
  status               VARCHAR(30) DEFAULT 'upcoming',  -- current|upcoming|future|archived
  description          TEXT,
  linked_contribution  VARCHAR(200),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── CONTRIBUTIONS ─────────────────────────────────────────
CREATE TABLE contributions (
  receipt_id    VARCHAR(50) PRIMARY KEY,
  member_id     VARCHAR(20) REFERENCES members(member_id) ON DELETE SET NULL,
  member_name   VARCHAR(200),
  program_name  VARCHAR(300),
  amount        NUMERIC(12,2) DEFAULT 0,
  status        VARCHAR(30) DEFAULT 'Paid',          -- Paid|Unpaid|Pending
  date_paid     VARCHAR(50),                          -- stored as string (en-GH format)
  recorded_by   VARCHAR(200),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── DONATIONS ─────────────────────────────────────────────
CREATE TABLE donations (
  donation_id           VARCHAR(50) PRIMARY KEY,
  program_name          VARCHAR(300),
  beneficiary_member_id VARCHAR(20) REFERENCES members(member_id) ON DELETE SET NULL,
  beneficiary_name      VARCHAR(200),
  amount                NUMERIC(12,2) DEFAULT 0,
  date                  VARCHAR(50),
  donor_member_id       VARCHAR(20),
  donor_name            VARCHAR(200),
  status                VARCHAR(30) DEFAULT 'Completed',
  notes                 TEXT,
  recorded_by           VARCHAR(200),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── ANNOUNCEMENTS ─────────────────────────────────────────
CREATE TABLE announcements (
  announcement_id  VARCHAR(20) PRIMARY KEY,
  title            VARCHAR(300) NOT NULL,
  body             TEXT,
  posted_by        VARCHAR(200),
  type             VARCHAR(30) DEFAULT 'info',       -- info|urgent|meeting|emergency
  date             VARCHAR(50),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMPLAINTS ────────────────────────────────────────────
CREATE TABLE complaints (
  complaint_id   VARCHAR(30) PRIMARY KEY,
  member_id      VARCHAR(20) REFERENCES members(member_id) ON DELETE SET NULL,
  member_name    VARCHAR(200),
  subject        VARCHAR(300),
  body           TEXT,
  category       VARCHAR(50) DEFAULT 'General',
  status         VARCHAR(30) DEFAULT 'Open',         -- Open|In Progress|Resolved|Closed
  response       TEXT,
  responded_by   VARCHAR(200),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── PROJECTS ──────────────────────────────────────────────
CREATE TABLE projects (
  project_id     VARCHAR(30) PRIMARY KEY,
  organization   VARCHAR(300) NOT NULL,
  receiver_name  VARCHAR(200) NOT NULL,
  item_or_project TEXT,
  quantity       NUMERIC(10,2) DEFAULT 1,
  unit_price     NUMERIC(12,2) DEFAULT 0,
  total_amount   NUMERIC(12,2) DEFAULT 0,
  hosa_rep       VARCHAR(200),
  date           VARCHAR(50),
  notes          TEXT,
  recorded_by    VARCHAR(200),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── OPENING BALANCES ──────────────────────────────────────
CREATE TABLE opening_balances (
  balance_id       VARCHAR(20) PRIMARY KEY,
  year             INTEGER NOT NULL UNIQUE,
  opening_balance  NUMERIC(14,2) DEFAULT 0,
  description      TEXT,
  recorded_by      VARCHAR(200),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── RECEIPTS ──────────────────────────────────────────────
CREATE TABLE receipts (
  receipt_id         VARCHAR(50) PRIMARY KEY,
  type               VARCHAR(30),                    -- Contribution|Donation
  member_id          VARCHAR(20),
  member_name        VARCHAR(200),
  program_or_purpose TEXT,
  amount             NUMERIC(12,2) DEFAULT 0,
  date               VARCHAR(50),
  recorded_by        VARCHAR(200),
  status             VARCHAR(30) DEFAULT 'Paid',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── ACTIVITY LOG ──────────────────────────────────────────
CREATE TABLE activity_log (
  log_id        VARCHAR(30) PRIMARY KEY,
  action        VARCHAR(100),
  performed_by  VARCHAR(200),
  target        TEXT,
  timestamp     TIMESTAMPTZ DEFAULT NOW()
);

-- ── APP SETTINGS (logo, org name, etc.) ───────────────────
CREATE TABLE app_settings (
  key    VARCHAR(100) PRIMARY KEY,
  value  TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────────────────
CREATE INDEX idx_members_name       ON members(full_name);
CREATE INDEX idx_users_member       ON users(member_id);
CREATE INDEX idx_contributions_member ON contributions(member_id);
CREATE INDEX idx_contributions_prog ON contributions(program_name);
CREATE INDEX idx_donations_bene     ON donations(beneficiary_member_id);
CREATE INDEX idx_complaints_member  ON complaints(member_id);
CREATE INDEX idx_activity_ts        ON activity_log(timestamp DESC);
CREATE INDEX idx_receipts_member    ON receipts(member_id);

-- ── SEED: Default Positions ────────────────────────────────
INSERT INTO positions (position_id, position_name, level, description) VALUES
  ('POS001', 'Super Admin',          6, 'Full system control'),
  ('POS002', 'Admin',                5, 'Full management access'),
  ('POS003', 'Financial Secretary',  4, 'Payments & reports'),
  ('POS004', 'Secretary',            3, 'Contributions & members'),
  ('POS005', 'PRO',                  3, 'Announcements & programs'),
  ('POS006', 'Executive',            2, 'Limited management'),
  ('POS007', 'Member',               1, 'Personal access only')
ON CONFLICT DO NOTHING;

-- ── SEED: Eric Aidoo (Super Admin) ────────────────────────
-- Password: hosa2026 (bcrypt hash — update if needed)
INSERT INTO members (member_id, full_name, status) VALUES
  ('HOSA001', 'Eric Aidoo', 'Active')
ON CONFLICT DO NOTHING;

INSERT INTO users (user_id, member_id, username, password_hash, roles, primary_role, executive_roles, status) VALUES
  ('U001', 'HOSA001', 'Eric Aidoo',
   '$2a$12$fNQOYK2TKFCrO08aOzSaMOuMSFBAju8HkhLenocI/z0YBvrO/gVZK',
   'Super Admin,Executive', 'Super Admin', 'Executive', 'Active')
ON CONFLICT DO NOTHING;
-- Note: The hash above is bcrypt('hosa2026', 12)
-- Run: node -e "const b=require('bcryptjs');b.hash('hosa2026',12).then(h=>console.log(h))"
-- to regenerate if needed.
