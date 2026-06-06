# HOSA Smart Membership System v2.0
### React + Node.js + PostgreSQL

---

## 🏗️ Project Structure

```
hosa-app/
├── backend/                    # Node.js / Express API
│   ├── src/
│   │   ├── index.js            # Server entry point
│   │   ├── db/
│   │   │   ├── pool.js         # PostgreSQL connection
│   │   │   └── schema.sql      # Database schema + seed data
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.js         # Login, register, password
│   │   │   ├── members.js      # Member CRUD
│   │   │   ├── contributions.js
│   │   │   ├── donations.js
│   │   │   └── misc.js         # Programs, positions, projects, etc.
│   │   └── utils/
│   │       └── helpers.js      # Shared utilities
│   ├── .env.example            # Copy to .env and fill in
│   └── package.json
│
└── frontend/                   # React SPA
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.jsx             # Root + routing
    │   ├── index.js            # Entry point
    │   ├── index.css           # Global design system
    │   ├── context/
    │   │   └── AppContext.jsx  # Global state
    │   ├── components/
    │   │   ├── Layout.jsx      # Sidebar + topbar
    │   │   └── UI.jsx          # Shared components
    │   ├── pages/              # One file per page
    │   └── utils/
    │       ├── api.js          # All API calls
    │       └── helpers.js      # Formatting utilities
    └── package.json
```

---

## ⚡ Quick Start

### 1. PostgreSQL — Create Database

```bash
psql -U postgres
CREATE DATABASE hosa_db;
\q
```

Run the schema:
```bash
psql -U postgres -d hosa_db -f backend/src/db/schema.sql
```

> **Super Admin password** is `hosa2026`. Change it after first login.

---

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials and JWT secret
npm install
npm run dev       # Development (with nodemon)
# OR
npm start         # Production
```

The API runs on **http://localhost:5000**

#### .env Configuration
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/hosa_db
JWT_SECRET=your_long_random_secret_here_change_this
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start         # Development server on http://localhost:3000
# OR
npm run build     # Production build → build/
```

---

## 🔑 Default Login

| Field    | Value        |
|----------|--------------|
| Username | `Eric Aidoo` |
| Password | `hosa2026`   |

**Change this immediately** after first login via Settings → Change Password.

---

## 🗃️ Database Schema Summary

| Table             | Description                          |
|-------------------|--------------------------------------|
| `members`         | All registered members               |
| `users`           | Login accounts (1-to-1 with members) |
| `positions`       | Role definitions and access levels   |
| `contributions`   | Contribution payment records         |
| `donations`       | Welfare donations to members         |
| `programs`        | Events and programs                  |
| `announcements`   | Member announcements                 |
| `complaints`      | Member complaint submissions         |
| `projects`        | Community & welfare projects         |
| `opening_balances`| Financial year opening balances      |
| `receipts`        | Auto-generated receipt records       |
| `activity_log`    | Audit trail for key actions          |
| `app_settings`    | Logo and org settings                |

---

## 🔐 Role Access Levels

| Role                | Level | Access                                    |
|---------------------|-------|-------------------------------------------|
| Member              | 1     | Own profile, contributions, complaints    |
| Executive           | 2     | Tracker, complaint centre, projects       |
| Secretary / PRO     | 3     | Members, contributions, donations, reports|
| Financial Secretary | 4     | + Opening balance management              |
| Admin               | 5     | + Delete members, manage positions        |
| Super Admin         | 6     | Full system control                       |

---

## 🚀 Production Deployment

### Option A: Same Server (recommended for small orgs)

```bash
# Backend — PM2
npm install -g pm2
cd backend
pm2 start src/index.js --name hosa-api
pm2 save && pm2 startup

# Frontend — build + nginx
cd frontend
npm run build
# Point nginx to frontend/build/ and proxy /api to :5000
```

#### Nginx config snippet:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /path/to/hosa-app/frontend/build;
    index index.html;

    # React SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option B: Railway / Render / Heroku

1. Set `DATABASE_URL` environment variable (provided by the platform)
2. Deploy backend as a Node.js web service
3. Deploy frontend as a static site (or use `npm run build` in the same deploy)
4. Set `FRONTEND_URL` in backend env to your frontend domain

---

## 🔧 Regenerate Super Admin Password

If the bcrypt hash doesn't work (different bcrypt versions):

```bash
cd backend
node -e "const b=require('bcryptjs');b.hash('hosa2026',12).then(h=>console.log(h))"
```

Then run this SQL with the output:
```sql
UPDATE users SET password_hash='<output>' WHERE user_id='U001';
```

---

## 📋 API Endpoints

### Auth
| Method | Endpoint                    | Access |
|--------|-----------------------------|--------|
| POST   | /api/auth/login             | Public |
| POST   | /api/auth/verify-member     | Public |
| POST   | /api/auth/create-account    | Public |
| POST   | /api/auth/reset-password    | Public |
| POST   | /api/auth/change-password   | Auth   |

### Members
| Method | Endpoint                         | Level |
|--------|----------------------------------|-------|
| GET    | /api/members                     | 1     |
| GET    | /api/members/executives          | Public|
| GET    | /api/members/:id                 | 1     |
| POST   | /api/members                     | 3     |
| PUT    | /api/members/:id                 | 3     |
| DELETE | /api/members/:id                 | 5     |
| PATCH  | /api/members/:id/roles           | 5     |
| PATCH  | /api/members/:id/executive-roles | 5     |
| PATCH  | /api/members/:id/status          | 5     |

### Contributions, Donations, Programs, etc.
All follow standard REST patterns with appropriate access levels.

---

## 🎨 Design System

The frontend uses CSS custom properties (design tokens) matching the original Google Apps Script version exactly:

```css
--blue: #1A3A6B      /* Primary brand color */
--gold: #F5C518      /* Accent / highlight */
--ok:   #1B7A4A      /* Success green */
--err:  #C0392B      /* Error red */
--warn: #B7690A      /* Warning amber */
```

All components are built with pure CSS classes — no external UI library dependency.

---

## ✅ Feature Parity with Original GAS Version

- [x] Member verification flow (verify → create account → login)
- [x] Forgot password / reset password
- [x] Role-based access control (6 levels)
- [x] Member directory with search and filters
- [x] Smart contribution search (paid/unpaid breakdown)
- [x] Donation recording with auto-receipt
- [x] Payment tracker with PDF export
- [x] Executive board display
- [x] Programs management
- [x] Announcements
- [x] Complaint submission & response system
- [x] Community projects tracking
- [x] Opening balance register with financial timeline
- [x] Analytics with Chart.js charts
- [x] PDF report generation (browser print)
- [x] Excel/CSV export
- [x] Executive comprehensive annual report
- [x] Logo upload (persisted in PostgreSQL)
- [x] Activity log
- [x] Positions management
- [x] My Profile with edit
- [x] My Contributions with unpaid popup
- [x] My Receipts
- [x] My Donations
- [x] Inactivity auto-logout (10 min)
- [x] Session persistence (sessionStorage)
- [x] Full mobile responsive design
- [x] Identical design tokens and color system

---

*Built for HOSA — Holiness Old Students Association · v2.0 · 2026*
