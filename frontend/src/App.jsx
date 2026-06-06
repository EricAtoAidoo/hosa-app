// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';

// Pages
import Login            from './pages/Login';
import Dashboard        from './pages/Dashboard';
import Members          from './pages/Members';
import Contributions    from './pages/Contributions';
import Donations        from './pages/Donations';
import Programs         from './pages/Programs';
import Announcements    from './pages/Announcements';
import Tracker          from './pages/Tracker';
import MyProfile        from './pages/MyProfile';
import MyContributions  from './pages/MyContributions';
import MyReceipts       from './pages/MyReceipts';
import MyDonations      from './pages/MyDonations';
import Complaints       from './pages/Complaints';
import ComplaintCentre  from './pages/ComplaintCentre';
import Positions        from './pages/Positions';
import ActivityLog      from './pages/ActivityLog';
import Reports          from './pages/Reports';
import ExecReport       from './pages/ExecReport';
import Settings         from './pages/Settings';
import Analytics        from './pages/Analytics';
import Projects         from './pages/Projects';
import OpeningBalance   from './pages/OpeningBalance';

// ── Protected Route ────────────────────────────────────────
function ProtectedRoute({ children, minLevel = 1 }) {
  const { session, getLevel } = useApp();
  if (!session) return <Navigate to="/login" replace />;
  if (getLevel() < minLevel) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

// ── Public Route (redirect if logged in) ──────────────────
function PublicRoute({ children }) {
  const { session } = useApp();
  if (session) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

      {/* Protected — all members */}
      <Route path="/"                 element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/my-profile"       element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
      <Route path="/my-contributions" element={<ProtectedRoute><MyContributions /></ProtectedRoute>} />
      <Route path="/my-receipts"      element={<ProtectedRoute><MyReceipts /></ProtectedRoute>} />
      <Route path="/my-donations"     element={<ProtectedRoute><MyDonations /></ProtectedRoute>} />
      <Route path="/complaints"       element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
      <Route path="/programs"         element={<ProtectedRoute><Programs /></ProtectedRoute>} />
      <Route path="/announcements"    element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
      <Route path="/settings"         element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      {/* Executive+ (level 2) */}
      <Route path="/tracker"          element={<ProtectedRoute minLevel={2}><Tracker /></ProtectedRoute>} />
      <Route path="/complaint-centre" element={<ProtectedRoute minLevel={2}><ComplaintCentre /></ProtectedRoute>} />
      <Route path="/exec-report"      element={<ProtectedRoute minLevel={2}><ExecReport /></ProtectedRoute>} />
      <Route path="/projects"         element={<ProtectedRoute minLevel={2}><Projects /></ProtectedRoute>} />

      {/* Secretary+ (level 3) */}
      <Route path="/members"          element={<ProtectedRoute minLevel={3}><Members /></ProtectedRoute>} />
      <Route path="/contributions"    element={<ProtectedRoute minLevel={3}><Contributions /></ProtectedRoute>} />
      <Route path="/donations"        element={<ProtectedRoute minLevel={3}><Donations /></ProtectedRoute>} />
      <Route path="/analytics"        element={<ProtectedRoute minLevel={3}><Analytics /></ProtectedRoute>} />
      <Route path="/reports"          element={<ProtectedRoute minLevel={3}><Reports /></ProtectedRoute>} />
      <Route path="/opening-balance"  element={<ProtectedRoute minLevel={3}><OpeningBalance /></ProtectedRoute>} />

      {/* Admin+ (level 5) */}
      <Route path="/positions"        element={<ProtectedRoute minLevel={5}><Positions /></ProtectedRoute>} />
      <Route path="/activity"         element={<ProtectedRoute minLevel={5}><ActivityLog /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 10,
              boxShadow: '0 8px 32px rgba(26,58,107,.16)',
            },
            success: { iconTheme: { primary: '#1B7A4A', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#C0392B', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </AppProvider>
  );
}
