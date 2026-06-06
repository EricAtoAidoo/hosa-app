// src/pages/Dashboard.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';
import { fmtAmt, fmtDate, cap, initials, typeColor, typeBg } from '../utils/helpers';
import { EmptyState, Avatar, StatusPill } from '../components/UI';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend);

export default function Dashboard() {
  const {
    session, getLevel, cache,
    fetchMembers, fetchContributions, fetchDonations,
    fetchPrograms, fetchAnnouncements, fetchExecutives,
    fetchProjects, fetchOpeningBalances,
    updateCache,
  } = useApp();
  const navigate  = useNavigate();
  const [loaded,  setLoaded]  = useState(false);
  const [view,    setView]    = useState('assoc'); // assoc | mine

  useEffect(() => {
    const load = async () => {
      await Promise.all([
        fetchMembers(), fetchContributions(), fetchDonations(),
        fetchPrograms(), fetchAnnouncements(), fetchExecutives(),
        fetchProjects(), fetchOpeningBalances(),
      ]);
      setLoaded(true);
    };
    load();
  }, []);

  const level   = getLevel();
  const myId    = session?.memberId;
  const total   = cache.members.length;
  const paidIds = new Set(cache.contributions.filter(c => c.status === 'Paid').map(c => c.member_id));
  const assocPaid   = paidIds.size;
  const assocUnpaid = total - assocPaid;
  const totalContribs  = cache.contributions.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
  const totalDonations = cache.donations.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
  const totalProjects  = (cache.projects || []).reduce((s, p) => s + parseFloat(p.total_amount || 0), 0);
  const currYear = new Date().getFullYear().toString();
  const obRecord = (cache.openingBalances || []).find(b => String(b.year) === currYear);
  const openingBal = obRecord ? parseFloat(obRecord.opening_balance || 0) : 0;
  const netBalance = openingBal + totalContribs - totalDonations - totalProjects;

  const myContribs = cache.contributions.filter(c => c.member_id === myId);
  const myTotal    = myContribs.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
  const myPaid     = myContribs.filter(c => c.status === 'Paid').length;
  const myPending  = myContribs.filter(c => c.status !== 'Paid').length;

  const isAdmin   = level >= 3;
  const useAssoc  = !isAdmin || view === 'assoc';

  // Monthly chart data
  const monthly = Array(12).fill(0);
  cache.contributions.forEach(c => {
    const d = new Date(c.date_paid || c.created_at || '');
    if (d.getFullYear() === parseInt(currYear)) monthly[d.getMonth()] += parseFloat(c.amount || 0);
  });

  // By program pie
  const byProg = {};
  cache.contributions.forEach(c => { byProg[c.program_name] = (byProg[c.program_name] || 0) + parseFloat(c.amount || 0); });
  const progLabels = Object.keys(byProg);
  const progData   = Object.values(byProg);
  const colors = ['#1A3A6B','#F5C518','#1B7A4A','#C0392B','#2255A4','#B7690A','#7C3AED'];

  const statCards = useAssoc ? [
    { label: 'Total Members', val: total, sub: 'Registered members', color: 'c-blue', icon: 'fa-users', si: 'si-blue' },
    { label: 'Paid Members', val: assocPaid, sub: 'All programs', color: 'c-gold', icon: 'fa-check-circle', si: 'si-gold' },
    { label: 'Unpaid Members', val: assocUnpaid, sub: 'Dues outstanding', color: 'c-err', icon: 'fa-clock', si: 'si-err' },
    {
      label: openingBal > 0 ? 'Net balance (incl. O/B)' : 'Net balance',
      val: (netBalance < 0 ? '−GH₵ ' : 'GH₵ ') + fmtAmt(Math.abs(netBalance)),
      sub: 'All contributions', color: 'c-ok', icon: 'fa-money-bill-wave', si: 'si-ok'
    },
  ] : [
    { label: 'Total Members', val: total, sub: '', color: 'c-blue', icon: 'fa-users', si: 'si-blue' },
    { label: 'My Paid Records', val: myPaid, sub: 'Contributions made', color: 'c-gold', icon: 'fa-check-circle', si: 'si-gold' },
    { label: 'My Pending', val: myPending, sub: '', color: 'c-err', icon: 'fa-clock', si: 'si-err' },
    { label: 'My Total Paid', val: 'GH₵ ' + fmtAmt(myTotal), sub: '', color: 'c-ok', icon: 'fa-money-bill-wave', si: 'si-ok' },
  ];

  return (
    <div>
      {/* Toggle (admin only) */}
      {isAdmin && (
        <div style={{ display: 'flex', background: 'var(--g50)', border: '1px solid var(--g100)', borderRadius: 10, padding: 3, gap: 3, width: 'fit-content', marginBottom: 14 }}>
          {['assoc','mine'].map(v => (
            <button key={v} className={`tab-btn${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
              <i className={`fas ${v === 'assoc' ? 'fa-building' : 'fa-user'}`} style={{ marginRight: 5 }} />
              {v === 'assoc' ? 'Association' : 'My Stats'}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        {statCards.map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.si}`}><i className={`fas ${s.icon}`} /></div>
            <div className="stat-lbl">{s.label}</div>
            <div className="stat-val">{s.val}</div>
            {s.sub && <div className="stat-sub">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Executive Board */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <div className="card-title"><i className="fas fa-star" style={{ color: 'var(--gold)', marginRight: 7 }} />Executive Board — Contact Directory</div>
          {level >= 5 && <span className="card-link" onClick={() => navigate('/members')}>Manage →</span>}
        </div>
        {cache.executives.length === 0 ? (
          <EmptyState icon="fa-users" title="No executives assigned yet" sub="Admins can assign executive roles via Members page" />
        ) : (
          <div className="exec-board">
            {cache.executives.map(e => (
              <div key={e.memberId} className="exec-card">
                <div className="exec-av">{e.photo ? <img src={e.photo} alt={e.fullName} /> : initials(e.fullName)}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g800)', marginBottom: 4 }}>{e.fullName}</div>
                <div style={{ fontSize: 11, color: 'var(--blue-mid)', fontWeight: 600, marginBottom: 8 }}>{e.executiveRoles}</div>
                {e.phone
                  ? <div style={{ fontSize: 12, color: 'var(--g400)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><i className="fas fa-phone" />{e.phone}</div>
                  : <div style={{ fontSize: 12, color: 'var(--g200)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><i className="fas fa-phone" />No phone</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Announcements + Programs */}
      <div className="grid-3" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="fas fa-bullhorn" style={{ color: 'var(--gold)', marginRight: 7 }} />Announcements</div>
            <span className="card-link" onClick={() => navigate('/announcements')}>See all →</span>
          </div>
          {cache.announcements.slice(0, 4).map(a => (
            <div key={a.announcement_id} className="announce-card" style={{ marginBottom: 8, padding: '12px 14px', borderLeft: `3px solid ${typeColor(a.type)}`, background: typeBg(a.type) + '20' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor(a.type), marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g800)', marginBottom: 3 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: 'var(--g600)', lineHeight: 1.55, marginBottom: 5 }}>{(a.body || '').substring(0, 120)}{(a.body || '').length > 120 ? '…' : ''}</div>
                <div style={{ fontSize: 10.5, color: 'var(--g400)', display: 'flex', gap: 10 }}>
                  <span><i className="fas fa-user" style={{ marginRight: 3 }} />{a.posted_by}</span>
                  <span><i className="fas fa-calendar" style={{ marginRight: 3 }} />{fmtDate(a.date)}</span>
                </div>
              </div>
            </div>
          ))}
          {!cache.announcements.length && <EmptyState icon="fa-bullhorn" title="No announcements yet" />}
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="fas fa-calendar-alt" style={{ color: 'var(--blue)', marginRight: 7 }} />Upcoming Programs</div>
            <span className="card-link" onClick={() => navigate('/programs')}>See all →</span>
          </div>
          {cache.programs.filter(p => p.status !== 'archived').slice(0, 3).map(p => {
            const d = new Date(p.date);
            return (
              <div key={p.program_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--g50)' }}>
                <div style={{ minWidth: 42, background: 'var(--blue)', borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 300, color: '#fff', lineHeight: 1 }}>{d.getDate()}</div>
                  <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)' }}>{d.toLocaleString('en', { month: 'short' })}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--g800)' }}>{p.title}</div>
                  <StatusPill status={p.status} />
                </div>
              </div>
            );
          })}
          {!cache.programs.filter(p => p.status !== 'archived').length && <EmptyState icon="fa-calendar" title="No active programs" />}
        </div>
      </div>

      {/* Recent Donations */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <div className="card-title"><i className="fas fa-hand-holding-heart" style={{ color: 'var(--gold)', marginRight: 7 }} />Recent Donations</div>
          <span className="card-link" onClick={() => navigate('/donations')}>See all →</span>
        </div>
        {cache.donations.slice(0, 4).map(d => (
          <div key={d.donation_id} className="don-card" style={{ padding: 12, marginBottom: 8 }}>
            <div className="don-icon"><i className="fas fa-hand-holding-heart" /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g800)' }}>{d.beneficiary_name}</div>
              <div style={{ fontSize: 11, color: 'var(--g400)' }}>{d.program_name} · by {d.donor_name}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', marginTop: 4 }}>GH₵ {fmtAmt(d.amount)}</div>
            </div>
            <StatusPill status={d.status || 'Completed'} />
          </div>
        ))}
        {!cache.donations.length && <EmptyState icon="fa-hand-holding-heart" title="No donations recorded yet" />}
      </div>

      {/* Charts */}
      {level >= 3 && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><div className="card-title">Monthly Contributions (GH₵)</div></div>
            <div style={{ height: 220, position: 'relative' }}>
              <Bar
                data={{
                  labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                  datasets: [{ label: 'GH₵', data: monthly, backgroundColor: '#1A3A6B', borderRadius: 6, borderSkipped: false }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#F1F4FA' }, ticks: { callback: v => 'GH₵' + v.toLocaleString(), font: { size: 11 } } }, x: { grid: { display: false }, ticks: { font: { size: 11 } } } } }}
              />
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">By Program</div></div>
            <div style={{ height: 220, position: 'relative' }}>
              {progLabels.length > 0 ? (
                <Doughnut
                  data={{
                    labels: progLabels,
                    datasets: [{ data: progData, backgroundColor: colors.slice(0, progLabels.length), borderWidth: 0 }],
                  }}
                  options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true } } } }}
                />
              ) : <EmptyState icon="fa-chart-pie" title="No contribution data yet" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
