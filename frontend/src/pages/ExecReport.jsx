// src/pages/ExecReport.jsx
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { fmtAmt, fmtDate } from '../utils/helpers';

export default function ExecReport() {
  const {
    cache,
    fetchMembers, fetchContributions, fetchDonations,
    fetchExecutives, fetchPrograms, fetchProjects, fetchOpeningBalances,
  } = useApp();

  const currentYear = new Date().getFullYear();
  const [year,        setYear]        = useState(currentYear);
  const [org,         setOrg]         = useState('Holiness Old Students Association (HOSA)');
  const [ack,         setAck]         = useState('');
  const [intro,       setIntro]       = useState('');
  const [projections, setProjections] = useState('');
  const [problems,    setProblems]    = useState('');
  const years = Array.from({ length: 8 }, (_, i) => currentYear - i);

  useEffect(() => {
    Promise.all([
      fetchMembers(), fetchContributions(), fetchDonations(),
      fetchExecutives(), fetchPrograms(), fetchProjects(), fetchOpeningBalances(),
    ]);
  }, []);

  // Compute year-specific data
  function getYearData(y) {
    const yr = String(y);
    const inYear = (dateStr) => {
      if (!dateStr) return false;
      const s = String(dateStr);
      return s.startsWith(yr) || s.endsWith('/' + yr) || s.includes('/' + yr + '/');
    };

    const yearContribs  = cache.contributions.filter(c => inYear(c.date_paid || c.created_at));
    const yearDonations = cache.donations.filter(d => inYear(d.date || d.created_at));
    const yearProjects  = (cache.projects || []).filter(p => inYear(p.date || p.created_at));

    const paidIds   = new Set(yearContribs.filter(c => c.status === 'Paid').map(c => c.member_id));
    const cats = {
      dues:    { label: 'Annual / Monthly Dues',  amount: 0 },
      welfare: { label: 'General Welfare Fund',   amount: 0 },
      wedding: { label: 'Wedding Donations',       amount: 0 },
      funeral: { label: 'Funeral Support',         amount: 0 },
      naming:  { label: 'Naming Ceremony',         amount: 0 },
      other:   { label: 'Other Programs',          amount: 0 },
    };
    yearContribs.filter(c => c.status === 'Paid').forEach(c => {
      const amt  = parseFloat(c.amount || 0);
      const name = (c.program_name || '').toLowerCase();
      if      (name.includes('due')  || name.includes('annual') || name.includes('monthly')) cats.dues.amount    += amt;
      else if (name.includes('welfare'))                                                       cats.welfare.amount += amt;
      else if (name.includes('wedding') || name.includes('marriage'))                          cats.wedding.amount += amt;
      else if (name.includes('funeral') || name.includes('burial'))                            cats.funeral.amount += amt;
      else if (name.includes('naming')  || name.includes('outdooring'))                        cats.naming.amount  += amt;
      else                                                                                     cats.other.amount   += amt;
    });

    const totalContrib   = Object.values(cats).reduce((s, c) => s + c.amount, 0);
    const totalDonation  = yearDonations.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
    const totalProjects_ = yearProjects.reduce((s, p)  => s + parseFloat(p.total_amount || 0), 0);
    const obRecord       = (cache.openingBalances || []).find(b => String(b.year) === yr);
    const openingBalance = obRecord ? parseFloat(obRecord.opening_balance || 0) : 0;
    const netBalance     = openingBalance + totalContrib - totalDonation - totalProjects_;

    return {
      yearContribs, yearDonations, yearProjects,
      paidIds, paidCount: paidIds.size,
      unpaidCount: cache.members.length - paidIds.size,
      cats, totalContrib, totalDonation, totalProjects: totalProjects_,
      openingBalance, netBalance,
    };
  }

  const d = getYearData(year);

  function generate() {
    const logoHtml = '<span style="font-family:serif;font-size:16px;color:#F5C518;font-weight:700">HOSA</span>';
    const nowStr   = new Date().toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' });

    const leader     = (cache.executives || []).find(e => ['president','chairman','leader'].some(kw => (e.executiveRoles||'').toLowerCase().includes(kw)));
    const leaderName = leader ? leader.fullName       : '___________________';
    const leaderRole = leader ? leader.executiveRoles : 'Chairman / President';

    const execRows = (cache.executives || []).length
      ? cache.executives.map((e,i)=>`<tr style="background:${i%2?'#F8FAFF':'#fff'}"><td style="padding:8px 10px">${i+1}</td><td style="padding:8px 10px;font-weight:600">${e.fullName}</td><td style="padding:8px 10px">${e.executiveRoles}</td><td style="padding:8px 10px;color:#8896B3">${e.phone||'—'}</td></tr>`).join('')
      : '<tr><td colspan="4" style="padding:14px;text-align:center;color:#8896B3">No executives assigned</td></tr>';

    const donRows = d.yearDonations.length
      ? d.yearDonations.map((don,i)=>`<tr style="background:${i%2?'#F8FAFF':'#fff'}"><td style="padding:8px 10px">${i+1}</td><td style="padding:8px 10px;font-weight:600">${don.beneficiary_name}</td><td style="padding:8px 10px">${don.program_name}</td><td style="padding:8px 10px;text-align:right;font-weight:700;color:#1B7A4A">GH₵ ${fmtAmt(don.amount)}</td><td style="padding:8px 10px;color:#8896B3">${fmtDate(don.date)}</td></tr>`).join('')
      : '<tr><td colspan="5" style="padding:14px;text-align:center;color:#8896B3">No donations this year</td></tr>';

    const catRows = Object.entries(d.cats).filter(([,v])=>v.amount>0).map(([,v],i)=>`<tr style="background:${i%2?'#F8FAFF':'#fff'}"><td style="padding:8px 12px">${v.label}</td><td style="padding:8px 12px;text-align:right;font-weight:700;color:#1A3A6B">GH₵ ${fmtAmt(v.amount)}</td></tr>`).join('') || '<tr><td colspan="2" style="padding:14px;text-align:center;color:#8896B3">No contributions</td></tr>';

    const projBullets = d.yearProjects.length
      ? d.yearProjects.map(p=>`<li style="margin-bottom:5px;line-height:1.6"><strong>${p.organization}</strong> — ${p.receiver_name}${p.item_or_project?' : '+p.item_or_project:''} <span style="color:#1A3A6B;font-weight:600">(GH₵ ${fmtAmt(p.total_amount)})</span></li>`).join('')
      : `<li style="color:#8896B3">No projects recorded for ${year}</li>`;

    const html = `<!DOCTYPE html><html><head><title>${org} — Executive Report ${year}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#1E2A45;font-size:13px;line-height:1.7}
.wrap{max-width:820px;margin:0 auto;padding:40px 48px}
.header{text-align:center;padding-bottom:24px;border-bottom:3px solid #1A3A6B;margin-bottom:32px}
.logo{width:64px;height:64px;background:#1A3A6B;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;overflow:hidden}
.org{font-size:20px;font-weight:700;color:#1A3A6B;margin-bottom:4px}
.rep-title{font-size:16px;font-weight:700;color:#F5C518;background:#1A3A6B;display:inline-block;padding:5px 24px;border-radius:20px;margin:8px 0}
.sec{margin-bottom:28px;page-break-inside:avoid}
.sec-title{font-size:14px;font-weight:700;color:#1A3A6B;border-left:4px solid #F5C518;padding-left:10px;margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em}
.body{font-size:13px;color:#2E3A55;line-height:1.75}
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:14px 0}
.sb{background:#EBF2FF;border-radius:8px;padding:12px;text-align:center}
.sl{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#8896B3;margin-bottom:3px}
.sv{font-size:20px;font-weight:300;color:#1A3A6B}
table{width:100%;border-collapse:collapse;border:1px solid #E2E8F4;margin-top:8px}
thead tr{background:#1A3A6B;color:#fff}
th{padding:9px 10px;text-align:left;font-size:11px;letter-spacing:.06em;font-weight:600}
td{border-bottom:1px solid #F1F4FA;font-size:12px;vertical-align:middle}
.tr-total td{background:#EBF2FF;font-weight:700;color:#1A3A6B;border-top:2px solid #1A3A6B}
ul{padding-left:20px;margin:8px 0}
.fin-table{width:100%;border-collapse:collapse;border:1px solid #E2E8F4;margin-top:10px}
.fin-table td{padding:9px 12px;font-size:13px;border-bottom:1px solid #F1F4FA}
.fin-table .cat-head td{background:#F8FAFF;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#1A3A6B}
.fin-table .total-contrib td{background:#EBF2FF;font-weight:700;color:#1A3A6B;border-top:2px solid #C8D2E8}
.fin-table .total-don td{background:#FDECEA;font-weight:700;color:#C0392B;border-top:2px solid #f5c6c1}
.fin-table .net td{font-weight:700;font-size:14px;border-top:3px solid #1A3A6B}
.sig{margin-top:48px;padding-top:24px;border-top:1px solid #E2E8F4}
.sig-line{border-bottom:1px solid #1A3A6B;width:220px;display:inline-block;margin-bottom:6px}
.footer{text-align:center;margin-top:32px;font-size:10px;color:#8896B3;padding-top:16px;border-top:1px solid #E2E8F4}
@media print{body{padding:0}.wrap{padding:20px 24px}.no-print{display:none!important}}</style></head>
<body><div class="wrap">
<div class="header"><div class="logo">${logoHtml}</div>
<div class="org">${org.toUpperCase()}</div>
<div class="rep-title">EXECUTIVE ANNUAL REPORT</div>
<div style="font-size:12px;color:#8896B3;margin-top:4px">For the Year Ended 31st December, ${year} &nbsp;·&nbsp; Generated: ${nowStr}</div></div>
${ack ? `<div class="sec"><div class="sec-title">Acknowledgement</div><div class="body">${ack.replace(/\n/g,'<br>')}</div></div>` : ''}
<div class="sec"><div class="sec-title">Introduction & General Assessment</div>
<div class="body">${intro ? intro.replace(/\n/g,'<br>')+'<br><br>' : ''}
We are reporting for the year <strong>${year}</strong>. Total membership stands at <strong>${cache.members.length}</strong> registered members.
Donations made during the year: <strong>${d.yearDonations.length}</strong>. Members who paid: <strong>${d.paidCount}</strong>. Outstanding: <strong>${d.unpaidCount}</strong>.
</div>
<div class="stat-grid">
<div class="sb"><div class="sl">Total Members</div><div class="sv">${cache.members.length}</div></div>
<div class="sb"><div class="sl">Fully Paid</div><div class="sv" style="color:#1B7A4A">${d.paidCount}</div></div>
<div class="sb"><div class="sl">Unpaid</div><div class="sv" style="color:#C0392B">${d.unpaidCount}</div></div>
<div class="sb"><div class="sl">Donations</div><div class="sv">${d.yearDonations.length}</div></div>
</div></div>
<div class="sec"><div class="sec-title">Executive Committee</div>
<table><thead><tr><th>#</th><th>Full Name</th><th>Position</th><th>Contact</th></tr></thead><tbody>${execRows}</tbody></table></div>
<div class="sec"><div class="sec-title">Donations Made (${year})</div>
<table><thead><tr><th>#</th><th>Beneficiary</th><th>Program / Purpose</th><th style="text-align:right">Amount</th><th>Date</th></tr></thead>
<tbody>${donRows}${d.yearDonations.length ? `<tr class="tr-total"><td colspan="3" style="padding:8px 10px">Total Donations</td><td style="padding:8px 10px;text-align:right">GH₵ ${fmtAmt(d.totalDonation)}</td><td></td></tr>` : ''}</tbody></table></div>
<div class="sec"><div class="sec-title">Contributions Received (${year})</div>
<div class="body" style="margin-bottom:8px">Total contributions received: <strong>GH₵ ${fmtAmt(d.totalContrib)}</strong>, broken down by category:</div>
<table><thead><tr><th>Category / Program Type</th><th style="text-align:right">Amount (GH₵)</th></tr></thead>
<tbody>${catRows}<tr class="tr-total"><td style="padding:8px 10px">Total Contributions</td><td style="padding:8px 10px;text-align:right">GH₵ ${fmtAmt(d.totalContrib)}</td></tr></tbody></table></div>
<div class="sec"><div class="sec-title">Projects & Programs Undertaken (${year})</div><ul>${projBullets}</ul></div>
${projections ? `<div class="sec"><div class="sec-title">Projections for ${parseInt(year)+1}</div><div class="body">${projections.replace(/\n/g,'<br>')}</div></div>` : ''}
${problems ? `<div class="sec"><div class="sec-title">Problems & Challenges</div><div class="body">${problems.replace(/\n/g,'<br>')}</div></div>` : ''}
<div class="sec"><div class="sec-title">Finance Summary</div>
<table class="fin-table"><tbody>
<tr style="background:#1A3A6B"><td style="color:var(--gold,#F5C518);font-weight:700;padding:10px 12px">Opening Balance (${year})</td><td style="text-align:right;font-size:16px;font-weight:700;color:#fff;padding:10px 12px">${d.openingBalance < 0 ? '−' : ''}GH₵ ${fmtAmt(Math.abs(d.openingBalance))}</td></tr>
<tr class="cat-head"><td colspan="2">Contributions Received by Category</td></tr>
${catRows}
<tr class="total-contrib"><td>Total Contributions</td><td style="text-align:right">+ GH₵ ${fmtAmt(d.totalContrib)}</td></tr>
<tr class="cat-head"><td colspan="2">Donations / Expenditure</td></tr>
${d.yearDonations.length ? d.yearDonations.map(don=>`<tr><td style="padding-left:20px">${don.beneficiary_name} — ${don.program_name}</td><td style="text-align:right;color:#C0392B">GH₵ ${fmtAmt(don.amount)}</td></tr>`).join('') : '<tr><td colspan="2" style="color:#8896B3;text-align:center">None</td></tr>'}
<tr class="total-don"><td>Total Donations</td><td style="text-align:right">− GH₵ ${fmtAmt(d.totalDonation)}</td></tr>
<tr class="cat-head"><td colspan="2">Projects / Community Expenditure</td></tr>
${d.yearProjects.length ? d.yearProjects.map(p=>`<tr><td style="padding-left:20px">${p.organization} — ${p.receiver_name}</td><td style="text-align:right;color:#C0392B">− GH₵ ${fmtAmt(p.total_amount)}</td></tr>`).join('') : '<tr><td colspan="2" style="color:#8896B3;text-align:center">None</td></tr>'}
<tr style="background:#FDECEA;font-weight:700;border-top:2px solid #f5c6c1"><td style="color:#C0392B">Total Projects</td><td style="text-align:right;color:#C0392B">− GH₵ ${fmtAmt(d.totalProjects)}</td></tr>
<tr class="net" style="background:${d.netBalance>=0?'#E6F7EE':'#FDECEA'}"><td style="color:${d.netBalance>=0?'#1B7A4A':'#C0392B'}">Net Balance ${d.netBalance<0?'(Deficit)':''}</td><td style="text-align:right;color:${d.netBalance>=0?'#1B7A4A':'#C0392B'}">GH₵ ${fmtAmt(Math.abs(d.netBalance))}</td></tr>
</tbody></table></div>
<div class="sig"><p style="margin-bottom:32px">Signed,</p>
<div class="sig-line"></div>
<div style="font-size:13px;font-weight:700;color:#1A3A6B;margin-top:6px">${leaderName}</div>
<div style="font-size:11px;color:#8896B3">${leaderRole}</div>
<div style="font-size:11px;color:#8896B3;margin-top:2px">${org}</div>
<div style="font-size:11px;color:#8896B3;margin-top:2px">Date: ${nowStr}</div></div>
<div class="footer">${org} · Executive Annual Report · ${year} · Generated: ${nowStr}</div>
<div class="no-print" style="text-align:center;margin-top:32px">
<button onclick="window.print()" style="background:#1A3A6B;color:#fff;border:none;padding:13px 36px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-right:10px">Print / Save as PDF</button>
<button onclick="window.close()" style="background:#f1f4fa;color:#1A3A6B;border:1px solid #C8D2E8;padding:13px 24px;border-radius:8px;font-size:14px;cursor:pointer">Close</button>
</div></div></body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 900);
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <div className="card-title"><i className="fas fa-file-alt" style={{ color: 'var(--blue)', marginRight: 7 }} />Executive Comprehensive Report Generator</div>
          <button className="btn btn-primary" onClick={generate}><i className="fas fa-file-pdf" /> Generate &amp; Download PDF</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--g400)', marginBottom: 20, lineHeight: 1.65 }}>
          Fill in the editable sections. All starred (*) fields are auto-fetched from the live database. Change the year to retrieve data for that period.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Report Year *</label>
            <select className="form-select" value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Organisation Name</label>
            <input className="form-input" value={org} onChange={e => setOrg(e.target.value)} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Acknowledgement <span style={{ color: 'var(--g400)', fontWeight: 400 }}>(optional)</span></label>
          <textarea className="form-textarea" style={{ minHeight: 70 }} value={ack} onChange={e => setAck(e.target.value)} placeholder="e.g. We wish to express sincere gratitude to all members for their continued support…" />
        </div>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Introduction &amp; General Assessment <span style={{ color: 'var(--g400)', fontWeight: 400 }}>(stats auto-appended)</span></label>
          <textarea className="form-textarea" style={{ minHeight: 70 }} value={intro} onChange={e => setIntro(e.target.value)} placeholder="Write your introductory paragraph here. Database statistics will be automatically appended." />
        </div>

        {/* Auto-fetched stats panel */}
        <div style={{ background: 'var(--blue-light)', border: '1px solid var(--blue-soft)', borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)' }}>
              <i className="fas fa-database" style={{ marginRight: 5 }} />Auto-Fetched Database Summary — {year}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14, fontSize: 12 }}>
            {[
              { label: 'Total Members',      val: cache.members.length, color: 'var(--blue)' },
              { label: 'Donations Made',     val: getYearData(year).yearDonations.length, color: 'var(--blue)' },
              { label: 'Members Fully Paid', val: getYearData(year).paidCount, color: 'var(--ok)' },
              { label: 'Members Unpaid',     val: getYearData(year).unpaidCount, color: 'var(--err)' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 8, padding: 10, border: '1px solid var(--blue-soft)' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--g400)', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 300, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--blue-soft)', overflow: 'hidden' }}>
            {[
              { label: 'Total Contributions', val: 'GH₵ ' + fmtAmt(getYearData(year).totalContrib), color: 'var(--blue)' },
              { label: 'Total Donations',     val: '− GH₵ ' + fmtAmt(getYearData(year).totalDonation), color: 'var(--err)' },
              { label: 'Net Balance',         val: (getYearData(year).netBalance < 0 ? '−' : '') + 'GH₵ ' + fmtAmt(Math.abs(getYearData(year).netBalance)), color: getYearData(year).netBalance >= 0 ? 'var(--ok)' : 'var(--err)' },
            ].map((r, i) => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: i < 2 ? '1px solid var(--g50)' : 'none', fontSize: 13 }}>
                <span style={{ color: 'var(--g600)' }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.color }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Projections for Next Year</label>
          <textarea className="form-textarea" style={{ minHeight: 70 }} value={projections} onChange={e => setProjections(e.target.value)} placeholder="e.g. Increase membership, build welfare fund to GH₵ 5,000…" />
        </div>
        <div className="form-group" style={{ marginBottom: 18 }}>
          <label className="form-label">Problems &amp; Challenges</label>
          <textarea className="form-textarea" style={{ minHeight: 70 }} value={problems} onChange={e => setProblems(e.target.value)} placeholder="e.g. Low participation from young members, delayed contributions…" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={generate}>
            <i className="fas fa-file-pdf" /> Generate PDF Report
          </button>
        </div>
      </div>
    </div>
  );
}
