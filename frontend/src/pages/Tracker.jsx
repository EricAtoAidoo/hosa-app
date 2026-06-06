// src/pages/Tracker.jsx
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { fmtAmt, fmtDate, initials, downloadCSV } from '../utils/helpers';
import { EmptyState } from '../components/UI';

// ── WhatsApp reminder helper ──────────────────────────────
function buildWALink(phone, memberName, programLabel, amount) {
  const clean = (phone || '').replace(/[\s\-\(\)]/g, '');
  let intl = clean;
  if (!clean.startsWith('+') && clean.startsWith('0')) intl = '+233' + clean.slice(1);
  else if (!clean.startsWith('+')) intl = '+233' + clean;
  const digits  = intl.replace(/\D/g, '');
  const amtPart = amount ? ` of GH₵ ${fmtAmt(amount)}` : '';
  const msg = encodeURIComponent(
    `Dear ${memberName}, this is a reminder from HOSA that your contribution for *${programLabel}*${amtPart} is outstanding. Please contact the Secretary to make your payment. Thank you. 🙏`
  );
  return `https://wa.me/${digits}?text=${msg}`;
}

function remindAll(unpaidList, progLabel, memberMap) {
  // Open WhatsApp for each unpaid member who has a phone number
  const withPhone = unpaidList.filter(p => memberMap[p.memberId]?.phone);
  if (!withPhone.length) {
    alert('None of the unpaid members have phone numbers recorded. Add phone numbers via the Members page first.');
    return;
  }
  // Open first one immediately, rest with a small delay to avoid popup blockers
  withPhone.forEach((p, i) => {
    setTimeout(() => {
      window.open(buildWALink(memberMap[p.memberId].phone, p.memberName, progLabel, null), '_blank');
    }, i * 400);
  });
}

export default function Tracker() {
  const { cache, fetchContributions, fetchPrograms, fetchMembers } = useApp();
  const [progFilter, setProgFilter] = useState('__current__');
  const [search,     setSearch]     = useState('');

  useEffect(() => {
    fetchContributions(true);
    fetchPrograms(true);
    fetchMembers(true);
  }, []);

  // Build a quick lookup: memberId → full member object (for phone numbers)
  const memberMap = {};
  cache.members.forEach(m => { memberMap[m.member_id] = m; });

  // Resolve which contributions to show
  let filtered  = cache.contributions;
  let progLabel = 'All Programs';

  if (progFilter === '__current__') {
    const cur = cache.programs.find(p => p.status === 'current');
    if (cur) {
      filtered  = filtered.filter(c => (c.program_name || '').toLowerCase() === cur.title.toLowerCase());
      progLabel = cur.title;
    } else {
      filtered  = filtered.slice(0, 50);
      progLabel = 'Recent records (no current program)';
    }
  } else if (progFilter !== '__all__') {
    filtered  = filtered.filter(c => (c.program_name || '').toLowerCase() === progFilter.toLowerCase());
    progLabel = progFilter;
  }

  // Build paid map
  const paidMap = {};
  filtered.filter(c => c.status === 'Paid').forEach(c => {
    if (!paidMap[c.member_id]) {
      paidMap[c.member_id] = { memberId: c.member_id, memberName: c.member_name, amount: 0, datePaid: c.date_paid };
    }
    paidMap[c.member_id].amount += parseFloat(c.amount || 0);
  });

  const paidIds   = new Set(Object.keys(paidMap));
  let paidList    = Object.values(paidMap);
  let unpaidList  = cache.members
    .filter(m => !paidIds.has(m.member_id))
    .map(m => ({ memberId: m.member_id, memberName: m.full_name }));

  // Search filter
  if (search) {
    const q  = search.toLowerCase();
    paidList   = paidList.filter(p => p.memberName.toLowerCase().includes(q));
    unpaidList = unpaidList.filter(p => p.memberName.toLowerCase().includes(q));
  }

  const total    = cache.members.length;
  const paidCount = Object.keys(paidMap).length;
  const paidPct  = total ? Math.round(paidCount / total * 100) : 0;
  const totalAmt = paidList.reduce((s, p) => s + p.amount, 0);

  // How many unpaid members have phone numbers (for reminder buttons)
  const unpaidWithPhone = unpaidList.filter(p => memberMap[p.memberId]?.phone);

  function downloadPDF() {
    const now      = new Date().toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' });
    const logoHtml = '<span style="font-family:serif;font-size:14px;color:#F5C518;font-weight:700">HOSA</span>';
    const paidRows   = paidList.map((p, i) => `<tr style="background:${i%2?'#F8FAFF':'#fff'}"><td style="padding:8px 10px">${i+1}</td><td style="padding:8px 10px;font-weight:600">${p.memberName}</td><td style="padding:8px 10px;text-align:right;font-weight:700;color:#1B7A4A">GH₵ ${fmtAmt(p.amount)}</td><td style="padding:8px 10px;color:#888">${fmtDate(p.datePaid)}</td></tr>`).join('');
    const unpaidRows = unpaidList.map((p, i) => `<tr style="background:${i%2?'#FFF8F8':'#fff'}"><td style="padding:8px 10px">${i+1}</td><td style="padding:8px 10px;font-weight:600">${p.memberName}</td><td style="padding:8px 10px;color:#C0392B;font-weight:600">Outstanding</td><td style="padding:8px 10px;color:#8896B3">${memberMap[p.memberId]?.phone||'—'}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>HOSA Payment Tracker</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#1E2A45;padding:32px;font-size:13px}
.header{text-align:center;padding-bottom:20px;border-bottom:2px solid #1A3A6B;margin-bottom:24px}
.logo{width:52px;height:52px;background:#1A3A6B;border-radius:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;overflow:hidden}
.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.sum-box{background:#F8FAFF;border:1px solid #E2E8F4;border-radius:8px;padding:12px;text-align:center}
.sum-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#8896B3;margin-bottom:4px}
.sum-val{font-size:22px;font-weight:300;color:#1A3A6B}
table{width:100%;border-collapse:collapse;border:1px solid #E2E8F4;margin-top:8px}
thead tr{background:#1A3A6B;color:#fff}th{padding:8px 10px;text-align:left;font-size:11px;letter-spacing:.06em}
td{border-bottom:1px solid #F1F4FA;font-size:12px}
.section-title{font-size:13px;font-weight:700;padding:8px 10px;margin-bottom:0}
.paid-title{background:#E6F7EE;color:#1B7A4A;border-radius:6px 6px 0 0}
.unpaid-title{background:#FDECEA;color:#C0392B;border-radius:6px 6px 0 0;margin-top:28px}
.footer{text-align:center;margin-top:28px;font-size:10px;color:#8896B3;border-top:1px solid #E2E8F4;padding-top:12px}
@media print{button{display:none}}</style></head>
<body><div class="header"><div class="logo">${logoHtml}</div>
<div style="font-size:18px;font-weight:700;color:#1A3A6B">HOLINESS OLD STUDENTS ASSOCIATION</div>
<div style="font-size:12px;color:#8896B3;margin-top:4px">Payment Tracker — ${progLabel} · ${now}</div></div>
<div class="summary">
<div class="sum-box"><div class="sum-lbl">Total Members</div><div class="sum-val">${total}</div></div>
<div class="sum-box"><div class="sum-lbl">Paid</div><div class="sum-val" style="color:#1B7A4A">${paidCount}</div></div>
<div class="sum-box"><div class="sum-lbl">Unpaid</div><div class="sum-val" style="color:#C0392B">${total - paidCount}</div></div>
<div class="sum-box"><div class="sum-lbl">Collected</div><div class="sum-val" style="font-size:16px">GH₵ ${fmtAmt(totalAmt)}</div></div>
</div>
<div class="section-title paid-title">✓ Paid Members (${paidList.length})</div>
<table><thead><tr><th>#</th><th>Full Name</th><th>Amount Paid</th><th>Date</th></tr></thead>
<tbody>${paidRows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#8896B3">No paid members</td></tr>'}</tbody></table>
<div class="section-title unpaid-title">⏳ Unpaid Members (${unpaidList.length})</div>
<table><thead><tr><th>#</th><th>Full Name</th><th>Status</th><th>Phone</th></tr></thead>
<tbody>${unpaidRows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#1B7A4A;font-weight:600">All members have paid! 🎉</td></tr>'}</tbody></table>
<div class="footer">HOSA Payment Tracker · ${progLabel} · ${now}</div>
<br><div style="text-align:center"><button onclick="window.print()" style="background:#1A3A6B;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Print / Save as PDF</button></div>
</body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <div className="card-title">
            <i className="fas fa-chart-pie" style={{ color: 'var(--blue)', marginRight: 7 }} />Payment Tracker
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={downloadPDF}>
              <i className="fas fa-file-pdf" /> Download PDF
            </button>
            <button className="btn btn-success btn-sm" onClick={() => {
              const headers = ['#', 'Name', 'Amount', 'Date'];
              const rows    = paidList.map((p,i) => [i+1, p.memberName, 'GH₵ '+fmtAmt(p.amount), fmtDate(p.datePaid)]);
              downloadCSV([headers,...rows], 'HOSA_Tracker_Paid.csv');
            }}>
              <i className="fas fa-file-excel" /> Export Paid
            </button>
            {/* Remind All Unpaid — only shows if there are unpaid members with phones */}
            {unpaidWithPhone.length > 0 && (
              <button
                className="btn btn-sm"
                style={{ background: '#25D366', color: '#fff', border: 'none' }}
                onClick={() => {
                  if (window.confirm(`Send WhatsApp reminders to ${unpaidWithPhone.length} unpaid member${unpaidWithPhone.length > 1 ? 's' : ''} with phone numbers?\n\nNote: Your browser may block multiple popups. Allow popups when asked.`)) {
                    remindAll(unpaidList, progLabel, memberMap);
                  }
                }}
                title={`Send payment reminders to ${unpaidWithPhone.length} unpaid members with phone numbers`}
              >
                <i className="fab fa-whatsapp" /> Remind All Unpaid ({unpaidWithPhone.length})
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label" style={{ marginBottom: 5, display: 'block' }}>Filter by Program</label>
            <select className="filter-select" style={{ width: '100%', height: 38 }} value={progFilter} onChange={e => setProgFilter(e.target.value)}>
              <option value="__current__">📌 Current Program</option>
              <option value="__all__">🌐 All Programs</option>
              {cache.programs.map(p => <option key={p.program_id} value={p.title}>{p.title} ({p.status})</option>)}
            </select>
          </div>
          <div style={{ minWidth: 200 }}>
            <label className="form-label" style={{ marginBottom: 5, display: 'block' }}>Search Member</label>
            <div className="search-box">
              <i className="fas fa-search" />
              <input placeholder="Name…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Members', val: total,          icon: 'fa-users',        si: 'si-blue' },
            { label: 'Paid',          val: paidCount,      icon: 'fa-check-circle', si: 'si-ok'   },
            { label: 'Unpaid',        val: total-paidCount,icon: 'fa-clock',        si: 'si-err'  },
            { label: 'Collected',     val: 'GH₵ '+fmtAmt(totalAmt), icon: 'fa-coins', si: 'si-gold' },
          ].map((s, i) => (
            <div key={i} className="stat-card" style={{ margin: 0 }}>
              <div className={`stat-icon ${s.si}`}><i className={`fas ${s.icon}`} /></div>
              <div className="stat-lbl">{s.label}</div>
              <div className="stat-val" style={{ fontSize: typeof s.val === 'string' ? 18 : 26 }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--g400)', marginBottom: 6 }}>
            <span>Payments for: <strong style={{ color: 'var(--g800)' }}>{progLabel}</strong></span>
            <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{paidPct}%</span>
          </div>
          <div className="progress-track" style={{ height: 10 }}>
            <div className="progress-fill" style={{ width: paidPct + '%' }} />
          </div>
        </div>

        {/* Two columns: paid / unpaid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* PAID */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--ok)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-check-circle" /> Paid ({paidList.length})
            </div>
            {paidList.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--g400)', fontSize: 13 }}>No paid members yet</div>
            )}
            {paidList.map(p => (
              <div key={p.memberId} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '1px solid var(--g50)' }}>
                <div className="av-sm" style={{ background: 'var(--ok-bg)', color: 'var(--ok)' }}>{initials(p.memberName)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--g800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.memberName}</div>
                  <div style={{ fontSize: 10, color: 'var(--g400)', fontFamily: 'var(--font-mono)' }}>{fmtDate(p.datePaid)}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ok)', whiteSpace: 'nowrap' }}>GH₵ {fmtAmt(p.amount)}</div>
              </div>
            ))}
          </div>

          {/* UNPAID */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--err)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-clock" /> Unpaid ({unpaidList.length})
            </div>
            {unpaidList.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--ok)', fontSize: 13, fontWeight: 600 }}>All members have paid! 🎉</div>
            )}
            {unpaidList.map(p => {
              const phone    = memberMap[p.memberId]?.phone || '';
              const hasPhone = phone.trim() !== '';
              return (
                <div key={p.memberId} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '1px solid var(--g50)' }}>
                  <div className="av-sm" style={{ background: 'var(--err-bg)', color: 'var(--err)' }}>{initials(p.memberName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--g800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.memberName}</div>
                    <div style={{ fontSize: 10, color: hasPhone ? 'var(--g400)' : 'var(--g200)', fontFamily: 'var(--font-mono)' }}>
                      {hasPhone ? phone : 'No phone number'}
                    </div>
                  </div>

                  {/* WhatsApp reminder button — only if phone exists */}
                  {hasPhone ? (
                    <a
                      href={buildWALink(phone, p.memberName, progLabel, null)}
                      target="_blank"
                      rel="noreferrer"
                      title={`Send WhatsApp reminder to ${p.memberName}`}
                      style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: '#25D366',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, textDecoration: 'none', transition: '.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#128C7E'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#25D366'; e.currentTarget.style.transform = ''; }}
                    >
                      <i className="fab fa-whatsapp" style={{ color: '#fff', fontSize: 16 }} />
                    </a>
                  ) : (
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--g100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="No phone number recorded">
                      <i className="fas fa-phone-slash" style={{ color: 'var(--g300)', fontSize: 12 }} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Footer note */}
            {unpaidList.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--g400)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="fab fa-whatsapp" style={{ color: '#25D366' }} />
                {unpaidWithPhone.length} of {unpaidList.length} have phone numbers for reminders
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
