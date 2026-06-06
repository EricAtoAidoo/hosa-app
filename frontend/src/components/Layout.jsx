// src/components/Layout.jsx
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { initials, fmtDate } from '../utils/helpers';

// ── WhatsApp Executive Panel ──────────────────────────────
function WhatsAppPanel({ executives, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  function buildLink(phone, name) {
    if (!phone) return null;
    const clean = phone.replace(/[\s\-\(\)]/g, '');
    let intl = clean;
    if (!clean.startsWith('+') && clean.startsWith('0')) intl = '+233' + clean.slice(1);
    else if (!clean.startsWith('+')) intl = '+233' + clean;
    const digits = intl.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hello ${name}, I'm contacting you via the HOSA portal.`);
    return `https://wa.me/${digits}?text=${msg}`;
  }

  return (
    <div ref={panelRef} style={{
      position: 'fixed', top: 56, right: 12,
      width: 320, maxWidth: 'calc(100vw - 24px)',
      background: '#fff', border: '1px solid var(--g100)',
      borderRadius: 'var(--rl)', boxShadow: 'var(--sh-lg)',
      zIndex: 400, overflow: 'hidden', animation: 'fadeIn .2s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--g100)', background: '#25D366', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fab fa-whatsapp" style={{ color: '#fff', fontSize: 20 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Chat an Executive</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.8)' }}>Select a person to open WhatsApp</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>

      {/* Executive list */}
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {executives.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--g400)', fontSize: 13 }}>
            <i className="fas fa-users" style={{ fontSize: 28, display: 'block', marginBottom: 10, opacity: .3 }} />
            No executives assigned yet.<br />
            <span style={{ fontSize: 11 }}>Admins can assign executive roles via Members page.</span>
          </div>
        ) : (
          executives.map(exec => {
            const link = buildLink(exec.phone, exec.fullName);
            return (
              <div key={exec.memberId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--g50)', transition: '.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                {/* Avatar */}
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: 'var(--blue)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, flexShrink: 0,
                  border: '2px solid var(--gold)', overflow: 'hidden',
                }}>
                  {exec.photo
                    ? <img src={exec.photo} alt={exec.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials(exec.fullName)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exec.fullName}</div>
                  <div style={{ fontSize: 11, color: 'var(--blue-mid)', fontWeight: 600 }}>{exec.executiveRoles}</div>
                  {exec.phone && (
                    <div style={{ fontSize: 10, color: 'var(--g400)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{exec.phone}</div>
                  )}
                </div>

                {/* WhatsApp button */}
                {link ? (
                  <a href={link} target="_blank" rel="noreferrer" onClick={onClose}
                    style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, textDecoration: 'none', transition: '.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#128C7E'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#25D366'; e.currentTarget.style.transform = ''; }}
                    title={`Chat ${exec.fullName} on WhatsApp`}>
                    <i className="fab fa-whatsapp" style={{ color: '#fff', fontSize: 20 }} />
                  </a>
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--g100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="No phone number recorded">
                    <i className="fas fa-phone-slash" style={{ color: 'var(--g400)', fontSize: 14 }} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', background: 'var(--g50)', borderTop: '1px solid var(--g100)', fontSize: 11, color: 'var(--g400)', textAlign: 'center' }}>
        <i className="fab fa-whatsapp" style={{ color: '#25D366', marginRight: 4 }} />
        Tapping a button opens WhatsApp directly
      </div>
    </div>
  );
}

// ── Notification Panel ────────────────────────────────────
function NotificationPanel({ session, cache, getLevel, onClose, onNavigate }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const level  = getLevel();
  const myId   = session?.memberId;
  const items  = [];

  // 1. Unpaid programs (personal)
  const activeProgs = (cache.programs || []).filter(p => p.status === 'current' || p.status === 'upcoming');
  const myContribs  = (cache.contributions || []).filter(c => c.member_id === myId);
  const myPaidProgs = new Set(myContribs.filter(c => c.status === 'Paid').map(c => (c.program_name || '').toLowerCase().trim()));
  activeProgs.forEach(p => {
    if (!myPaidProgs.has((p.title || '').toLowerCase().trim())) {
      items.push({
        id: 'unpaid_' + p.program_id,
        icon: 'fa-exclamation-circle', iconBg: 'var(--err-bg)', iconColor: 'var(--err)',
        title: 'Outstanding Payment',
        body: `You have not paid for: ${p.title}`,
        page: '/my-contributions',
        urgent: true,
      });
    }
  });

  // 2. Open complaints count (exec+)
  if (level >= 2) {
    const openCount = (cache.complaints || []).filter(c => c.status === 'Open').length;
    if (openCount > 0) {
      items.push({
        id: 'complaints_open',
        icon: 'fa-inbox', iconBg: 'var(--warn-bg)', iconColor: 'var(--warn)',
        title: `${openCount} Open Complaint${openCount > 1 ? 's' : ''}`,
        body: `${openCount} member complaint${openCount > 1 ? 's require' : ' requires'} your attention.`,
        page: '/complaint-centre',
        urgent: openCount > 2,
      });
    }
  }

  // 3. Programs within 7 days
  const now   = new Date();
  const in7   = new Date(now); in7.setDate(in7.getDate() + 7);
  (cache.programs || []).forEach(p => {
    if (p.status === 'current' || p.status === 'upcoming') {
      const pd = new Date(p.date);
      if (!isNaN(pd) && pd >= now && pd <= in7) {
        const daysLeft = Math.ceil((pd - now) / (1000 * 60 * 60 * 24));
        items.push({
          id: 'prog_soon_' + p.program_id,
          icon: 'fa-calendar-alt', iconBg: 'var(--blue-light)', iconColor: 'var(--blue)',
          title: `${p.title} — Coming Soon`,
          body: daysLeft === 0 ? 'This program is TODAY!' : `In ${daysLeft} day${daysLeft > 1 ? 's' : ''} · ${fmtDate(p.date)}`,
          page: '/programs',
          urgent: daysLeft <= 2,
        });
      }
    }
  });

  // 4. New announcements (last 48h)
  const cutoff48h = new Date(now); cutoff48h.setHours(cutoff48h.getHours() - 48);
  (cache.announcements || []).forEach(a => {
    const ad = new Date(a.created_at || a.date);
    if (!isNaN(ad) && ad >= cutoff48h) {
      items.push({
        id: 'anno_' + a.announcement_id,
        icon: 'fa-bullhorn',
        iconBg: a.type === 'urgent' || a.type === 'emergency' ? 'var(--err-bg)' : 'var(--gold-lt)',
        iconColor: a.type === 'urgent' || a.type === 'emergency' ? 'var(--err)' : 'var(--gold-dk)',
        title: a.title,
        body: (a.body || '').substring(0, 80) + ((a.body || '').length > 80 ? '…' : ''),
        page: '/announcements',
        urgent: a.type === 'urgent' || a.type === 'emergency',
      });
    }
  });

  // 5. Unpaid members — secretary+
  if (level >= 3) {
    const currentProg = (cache.programs || []).find(p => p.status === 'current');
    if (currentProg) {
      const paidIds    = new Set((cache.contributions || []).filter(c => c.status === 'Paid' && (c.program_name || '').toLowerCase() === (currentProg.title || '').toLowerCase()).map(c => c.member_id));
      const unpaidCount = (cache.members || []).filter(m => !paidIds.has(m.member_id)).length;
      if (unpaidCount > 0) {
        items.push({
          id: 'members_unpaid',
          icon: 'fa-users', iconBg: 'var(--err-bg)', iconColor: 'var(--err)',
          title: `${unpaidCount} Member${unpaidCount > 1 ? 's' : ''} Unpaid`,
          body: `${unpaidCount} member${unpaidCount > 1 ? 's have' : ' has'} not paid for "${currentProg.title}".`,
          page: '/tracker',
          urgent: unpaidCount > 5,
        });
      }
    }
  }

  // 6. Missing opening balance — fin sec+
  if (level >= 4) {
    const currYear = new Date().getFullYear().toString();
    const hasOB    = (cache.openingBalances || []).some(b => String(b.year) === currYear);
    if (!hasOB) {
      items.push({
        id: 'ob_missing',
        icon: 'fa-vault', iconBg: 'var(--warn-bg)', iconColor: 'var(--warn)',
        title: `${currYear} Opening Balance Not Set`,
        body: `Set the opening balance for ${currYear} for accurate financial reporting.`,
        page: '/opening-balance',
        urgent: false,
      });
    }
  }

  // Sort urgent first
  items.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));

  return (
    <div ref={panelRef} style={{
      position: 'fixed', top: 56, right: 12,
      width: 340, maxWidth: 'calc(100vw - 24px)',
      background: '#fff', border: '1px solid var(--g100)',
      borderRadius: 'var(--rl)', boxShadow: 'var(--sh-lg)',
      zIndex: 400, overflow: 'hidden', animation: 'fadeIn .2s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--g100)', background: 'var(--g50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g800)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-bell" style={{ color: 'var(--blue)' }} />
          Notifications
          {items.length > 0 && (
            <span style={{ background: items.some(n => n.urgent) ? 'var(--err)' : 'var(--gold)', color: items.some(n => n.urgent) ? '#fff' : 'var(--blue)', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 7px', marginLeft: 2 }}>
              {items.length}
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--g400)', cursor: 'pointer', fontSize: 16, padding: '3px 6px', borderRadius: 5 }}>×</button>
      </div>

      {/* Items */}
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ok-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, color: 'var(--ok)' }}>
              <i className="fas fa-check-circle" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g800)', marginBottom: 4 }}>You're all caught up!</div>
            <div style={{ fontSize: 11, color: 'var(--g400)' }}>No new notifications right now.</div>
          </div>
        ) : (
          items.map(n => (
            <div key={n.id}
              onClick={() => { onNavigate(n.page); onClose(); }}
              style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 16px', borderBottom: '1px solid var(--g50)', cursor: 'pointer', transition: '.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-light)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: n.iconBg, color: n.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                <i className={`fas ${n.icon}`} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g800)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  {n.urgent && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--err)', flexShrink: 0, display: 'inline-block' }} />}
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--g400)', lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>
              </div>
              <i className="fas fa-chevron-right" style={{ color: 'var(--g200)', fontSize: 10, flexShrink: 0, marginTop: 3 }} />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--g100)', background: 'var(--g50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--g400)' }}>
            {items.filter(n => n.urgent).length} urgent · {items.length} total
          </span>
          <button onClick={() => { onNavigate('/'); onClose(); }} style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: '4px 8px', borderRadius: 5 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-light)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>
            Go to Dashboard →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Layout ────────────────────────────────────────────
export default function Layout({ children }) {
  const { session, logout, canAccess, cache, fetchLogo, fetchExecutives, getLevel } = useApp();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [logoUrl,      setLogoUrl]      = useState('');
  const [showWA,       setShowWA]       = useState(false);
  const [showNotif,    setShowNotif]    = useState(false);

  useEffect(() => {
    fetchLogo().then(url => setLogoUrl(url || ''));
  }, [cache.logo]);

  useEffect(() => {
    fetchExecutives();
  }, []);

  useEffect(() => { setSidebarOpen(false); setShowWA(false); setShowNotif(false); }, [location.pathname]);

  const doLogout = () => { logout(); navigate('/login'); toast.success('Logged out successfully.'); };

  const level = getLevel();
  const ini   = initials(session?.fullName || '?');

  // Notification dot — show if any notifications exist
  const hasUrgent = (() => {
    const myId       = session?.memberId;
    const activeProgs = (cache.programs || []).filter(p => p.status === 'current' || p.status === 'upcoming');
    const myPaid     = new Set((cache.contributions || []).filter(c => c.member_id === myId && c.status === 'Paid').map(c => (c.program_name||'').toLowerCase().trim()));
    const hasUnpaid  = activeProgs.some(p => !myPaid.has((p.title||'').toLowerCase().trim()));
    const openComplaints = level >= 2 && (cache.complaints || []).some(c => c.status === 'Open');
    return hasUnpaid || openComplaints;
  })();

  const logoBadge = logoUrl
    ? <img src={logoUrl} alt="HOSA" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
    : <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>HOSA</span>;

  const navItem = (to, icon, label, minLevel = 1, badge) => {
    if (level < minLevel) return null;
    return (
      <NavLink to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <i className={`fas ${icon}`} />
        {label}
        {badge > 0 && <span className="nav-badge">{badge}</span>}
      </NavLink>
    );
  };

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-badge">{logoBadge}</div>
          <div>
            <div className="logo-abbr">HOSA</div>
            <div className="logo-full">Holiness Old Students<br />Association</div>
          </div>
        </div>

        <nav className="nav-scroll">
          <div className="nav-lbl">Main</div>
          {navItem('/', 'fa-th-large', 'Dashboard')}
          {navItem('/members', 'fa-users', 'Members', 3, cache.members.length || 0)}
          {navItem('/contributions', 'fa-coins', 'Contributions', 3)}
          {navItem('/donations', 'fa-hand-holding-heart', 'Donations', 3, cache.donations.length || 0)}

          <div className="nav-lbl">My Account</div>
          {navItem('/my-profile', 'fa-user-circle', 'My Profile')}
          {navItem('/my-contributions', 'fa-wallet', 'My Contributions')}
          {navItem('/my-donations', 'fa-hand-holding-heart', 'My Donations')}
          {navItem('/my-receipts', 'fa-receipt', 'My Receipts')}
          {navItem('/complaints', 'fa-comment-alt', 'My Complaints')}

          <div className="nav-lbl">Management</div>
          {navItem('/tracker', 'fa-chart-pie', 'Payment Tracker', 2)}
          {navItem('/complaint-centre', 'fa-inbox', 'Complaint Centre', 2)}
          {navItem('/programs', 'fa-calendar-alt', 'Programs')}
          {navItem('/projects', 'fa-project-diagram', 'Projects', 2)}
          {level >= 3 && navItem('/opening-balance', 'fa-vault', 'Opening Balance')}
          {navItem('/announcements', 'fa-bullhorn', 'Announcements', 1, cache.announcements.length || 0)}
          {navItem('/analytics', 'fa-chart-bar', 'Analytics', 3)}

          <div className="nav-lbl">Admin</div>
          {navItem('/positions', 'fa-sitemap', 'Positions', 5)}
          {navItem('/activity', 'fa-history', 'Activity Log', 5)}
          {navItem('/reports', 'fa-file-pdf', 'Reports & Export', 3)}
          {navItem('/exec-report', 'fa-file-alt', 'Executive Report', 2)}
          {navItem('/settings', 'fa-cog', 'Settings')}
        </nav>

        <div className="sidebar-user">
          <div className="user-av">{ini}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-nm">{session?.fullName}</div>
            <div className="user-rl">{session?.primaryRole}</div>
          </div>
          <button className="icon-btn" style={{ border: 'none', background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)' }} onClick={doLogout} title="Logout">
            <i className="fas fa-sign-out-alt" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <button className="hamburger icon-btn" onClick={() => setSidebarOpen(true)}>
              <i className="fas fa-bars" />
            </button>
            <div className="page-title">{pageTitles[location.pathname] || 'HOSA'}</div>
          </div>

          <div className="topbar-right">
            {/* Quick Add — secretary+ */}
            {level >= 3 && (
              <button className="icon-btn" title="Quick Add Contribution" onClick={() => navigate('/contributions')}>
                <i className="fas fa-plus" />
              </button>
            )}

            {/* WhatsApp executives button */}
            <button
              className="icon-btn"
              title="Chat an Executive on WhatsApp"
              onClick={() => { setShowWA(v => !v); setShowNotif(false); }}
              style={{ position: 'relative', ...(showWA ? { background: '#f0fdf4', borderColor: '#25D366', color: '#25D366' } : {}) }}
            >
              <i className="fab fa-whatsapp" style={{ fontSize: 17, color: showWA ? '#25D366' : '' }} />
            </button>

            {/* Notification bell */}
            <button
              className="icon-btn"
              title="Notifications"
              onClick={() => { setShowNotif(v => !v); setShowWA(false); }}
              style={{ position: 'relative' }}
            >
              <i className="fas fa-bell" />
              {hasUrgent && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--err)', border: '1.5px solid #fff',
                }} />
              )}
            </button>

            {/* Avatar */}
            <div className="user-av" style={{ cursor: 'pointer', width: 36, height: 36, border: '2px solid var(--gold)' }} onClick={() => navigate('/settings')} title="Settings">
              {ini}
            </div>
          </div>
        </div>

        {/* WhatsApp panel */}
        {showWA && (
          <WhatsAppPanel
            executives={cache.executives || []}
            onClose={() => setShowWA(false)}
          />
        )}

        {/* Notification panel */}
        {showNotif && (
          <NotificationPanel
            session={session}
            cache={cache}
            getLevel={getLevel}
            onClose={() => setShowNotif(false)}
            onNavigate={path => { navigate(path); setSidebarOpen(false); }}
          />
        )}

        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
}

const pageTitles = {
  '/': 'Dashboard', '/members': 'Member Directory',
  '/contributions': 'Contributions', '/donations': 'Donations',
  '/my-profile': 'My Profile', '/my-contributions': 'My Contributions',
  '/my-receipts': 'My Receipts', '/my-donations': 'My Donations',
  '/tracker': 'Payment Tracker', '/complaints': 'My Complaints',
  '/complaint-centre': 'Complaint Centre', '/programs': 'Programs',
  '/announcements': 'Announcements', '/analytics': 'Analytics',
  '/positions': 'Positions & Roles', '/activity': 'Activity Log',
  '/reports': 'Reports & Export', '/exec-report': 'Executive Report',
  '/settings': 'Settings', '/projects': 'HOSA Projects',
  '/opening-balance': 'Opening Balance',
};
