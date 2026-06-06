// src/pages/Analytics.jsx
import React, { useEffect } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';
import { fmtAmt } from '../utils/helpers';

export default function Analytics() {
  const {
    cache,
    fetchMembers, fetchContributions, fetchDonations, fetchPrograms, fetchOpeningBalances,
  } = useApp();

  useEffect(() => {
    fetchMembers(true);
    fetchContributions(true);
    fetchDonations(true);
    fetchPrograms(true);
    fetchOpeningBalances(true);
  }, []);

  const income    = cache.contributions.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
  const donations = cache.donations.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
  const currYear  = new Date().getFullYear().toString();

  // Monthly income chart
  const monthly = Array(12).fill(0);
  cache.contributions.forEach(c => {
    const d = new Date(c.date_paid || c.created_at || '');
    if (d.getFullYear() === parseInt(currYear)) monthly[d.getMonth()] += parseFloat(c.amount || 0);
  });

  // By program pie
  const byProg    = {};
  cache.contributions.forEach(c => { byProg[c.program_name] = (byProg[c.program_name] || 0) + parseFloat(c.amount || 0); });
  const progLabels = Object.keys(byProg).filter(Boolean);
  const progData   = Object.values(byProg);
  const colors     = ['#1A3A6B','#F5C518','#1B7A4A','#C0392B','#2255A4','#B7690A','#7C3AED','#E91E8C'];

  // Trend: cumulative paid members
  const sorted   = [...cache.contributions].filter(c => c.status === 'Paid').sort((a, b) => new Date(a.date_paid || a.created_at) - new Date(b.date_paid || b.created_at));
  const paidSet  = new Set();
  const tLabels  = [];
  const tData    = [];
  sorted.forEach(c => {
    paidSet.add(c.member_id);
    tLabels.push(new Date(c.date_paid || c.created_at).toLocaleString('en-GH', { month: 'short', year: '2-digit' }));
    tData.push(paidSet.size);
  });

  // Opening balance trend
  const obSorted = [...cache.openingBalances].sort((a, b) => a.year - b.year);
  const obLabels = obSorted.map(b => String(b.year));
  const obData   = obSorted.map(b => parseFloat(b.opening_balance || 0));

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: '#F1F4FA' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label:'Total Income', val:'GH₵ '+fmtAmt(income), sub:'All contributions', color:'c-blue', icon:'fa-money-bill-wave', si:'si-blue' },
          { label:'Donations Given', val:'GH₵ '+fmtAmt(donations), sub:'Total donated', color:'c-err', icon:'fa-exclamation-circle', si:'si-err' },
          { label:'Programs', val: cache.programs.length, sub:'All time', color:'c-gold', icon:'fa-trophy', si:'si-gold' },
          { label:'Members', val: cache.members.length, sub:'Total registered', color:'c-ok', icon:'fa-users', si:'si-ok' },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color}`}>
            <div className={`stat-icon ${s.si}`}><i className={`fas ${s.icon}`} /></div>
            <div className="stat-lbl">{s.label}</div>
            <div className="stat-val">{s.val}</div>
            {s.sub && <div className="stat-sub">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Monthly Contributions (GH₵) — {currYear}</div></div>
          <div style={{ height: 220, position: 'relative' }}>
            <Bar
              data={{
                labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
                datasets: [{ label: 'GH₵', data: monthly, backgroundColor: '#1A3A6B', borderRadius: 6, borderSkipped: false }],
              }}
              options={{ ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, ticks: { callback: v => 'GH₵' + v.toLocaleString(), font: { size: 11 } } } } }}
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
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--g400)', fontSize: 13 }}>No contribution data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Payment Compliance Trend (Cumulative Paid Members)</div></div>
          <div style={{ height: 180, position: 'relative' }}>
            {tLabels.length > 0 ? (
              <Line
                data={{
                  labels: tLabels,
                  datasets: [{ label: 'Paid', data: tData, borderColor: '#1A3A6B', backgroundColor: 'rgba(26,58,107,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#1A3A6B', pointRadius: 4 }],
                }}
                options={{ ...chartOpts, plugins: { legend: { display: false } } }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--g400)', fontSize: 13 }}>No payment data yet</div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Opening Balance Trend (GH₵)</div></div>
          <div style={{ height: 180, position: 'relative' }}>
            {obLabels.length > 0 ? (
              <Bar
                data={{
                  labels: obLabels,
                  datasets: [{ label: 'Opening Balance', data: obData, backgroundColor: '#F5C518', borderRadius: 6 }],
                }}
                options={{ ...chartOpts, plugins: { legend: { display: false } }, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, ticks: { callback: v => 'GH₵' + v.toLocaleString(), font: { size: 11 } } } } }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--g400)', fontSize: 13 }}>No opening balance data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Financial summary card */}
      <div className="card">
        <div className="card-header"><div className="card-title">Financial Summary — {currYear}</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            { label: 'Total Contributions',  val: 'GH₵ ' + fmtAmt(income),    color: 'var(--blue)', bg: 'var(--blue-light)', border: 'var(--blue-soft)' },
            { label: 'Total Donations Given', val: 'GH₵ ' + fmtAmt(donations), color: 'var(--err)',  bg: 'var(--err-bg)',    border: '#f5c6c1' },
            { label: 'Net Balance',           val: 'GH₵ ' + fmtAmt(income - donations), color: income - donations >= 0 ? 'var(--ok)' : 'var(--err)', bg: income - donations >= 0 ? 'var(--ok-bg)' : 'var(--err-bg)', border: income - donations >= 0 ? '#a8e0c0' : '#f5c6c1' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: s.color, fontWeight: 700, marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 300, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
