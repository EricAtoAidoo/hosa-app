// src/pages/Reports.jsx
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { fmtAmt, fmtDate, downloadCSV } from '../utils/helpers';

export default function Reports() {
  const { cache, fetchContributions, fetchDonations, fetchMembers, fetchPrograms, getLevel } = useApp();
  const [filterType, setFilterType] = useState('all');
  const [rfYear,  setRfYear]   = useState(new Date().getFullYear());
  const [rfFrom,  setRfFrom]   = useState('');
  const [rfTo,    setRfTo]     = useState('');
  const [rfProg,  setRfProg]   = useState('');
  const [preview, setPreview]  = useState(null);

  useEffect(() => {
    fetchContributions(true); fetchDonations(true);
    fetchMembers(true); fetchPrograms(true);
  }, []);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - i);
  const programs = [...new Set([...cache.contributions.map(c => c.program_name), ...cache.donations.map(d => d.program_name)].filter(Boolean))].sort();

  function applyFilter(rows, dateField) {
    if (filterType === 'all') return rows;
    return rows.filter(row => {
      const rawDate = row[dateField] || row.created_at || row.date || '';
      const ghFmt = String(rawDate).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      let dt;
      if (ghFmt) dt = new Date(`${ghFmt[3]}-${ghFmt[2].padStart(2,'0')}-${ghFmt[1].padStart(2,'0')}`);
      else dt = new Date(rawDate);
      if (isNaN(dt)) return false;
      if (filterType === 'year') return dt.getFullYear() === parseInt(rfYear);
      if (filterType === 'range') {
        const ms = dt.getTime();
        if (rfFrom && rfTo) return ms >= new Date(rfFrom).getTime() && ms <= new Date(rfTo).setHours(23,59,59,999);
        if (rfFrom) return ms >= new Date(rfFrom).getTime();
        if (rfTo)   return ms <= new Date(rfTo).setHours(23,59,59,999);
        return true;
      }
      if (filterType === 'program') return !rfProg || (row.program_name||'').toLowerCase() === rfProg.toLowerCase();
      return true;
    });
  }

  const filterLabel = filterType === 'all' ? 'All Records'
    : filterType === 'year'    ? `Year ${rfYear}`
    : filterType === 'range'   ? `${rfFrom || '...'} → ${rfTo || '...'}`
    : filterType === 'program' ? `Program: ${rfProg || 'All'}`
    : 'All Records';

  function genPDF(type) {
    const logoHtml = '<span style="font-family:serif;font-size:14px;color:#F5C518;font-weight:700">HOSA</span>';
    const now = new Date().toLocaleDateString('en-GH',{day:'numeric',month:'long',year:'numeric'});
    let html = `<!DOCTYPE html><html><head><title>HOSA ${type} Report</title>
<style>body{font-family:Arial,sans-serif;padding:30px;color:#1E2A45;font-size:13px}
.header{text-align:center;padding-bottom:20px;border-bottom:2px solid #1A3A6B;margin-bottom:20px}
.logo{width:52px;height:52px;background:#1A3A6B;border-radius:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;overflow:hidden}
table{width:100%;border-collapse:collapse;border:1px solid #E2E8F4;margin-top:10px}
thead tr{background:#1A3A6B;color:#fff}th{padding:9px;text-align:left;font-size:11px}
td{border-bottom:1px solid #F1F4FA;padding:8px;font-size:12px}
.footer{text-align:center;margin-top:20px;font-size:10px;color:#8896B3}
@media print{button{display:none}}</style></head>
<body><div class="header"><div class="logo">${logoHtml}</div>
<div style="font-size:18px;font-weight:700;color:#1A3A6B">HOLINESS OLD STUDENTS ASSOCIATION</div>
<div style="font-size:12px;color:#8896B3;margin-top:4px">${type === 'members' ? 'Member Directory' : type === 'contributions' ? 'Contributions Report' : 'Donations Report'} · Generated: ${now}</div>
${filterLabel !== 'All Records' ? `<div style="display:inline-block;margin-top:8px;background:#EBF2FF;color:#1A3A6B;border-radius:20px;padding:3px 14px;font-size:11px;font-weight:700">Filter: ${filterLabel}</div>` : ''}</div>`;

    if (type === 'members') {
      html += `<table><thead><tr><th>ID</th><th>Full Name</th><th>Phone</th><th>Year</th><th>Role</th><th>Status</th></tr></thead><tbody>
${cache.members.map((m,i)=>`<tr style="background:${i%2?'#F8FAFF':'#fff'}"><td style="font-family:monospace">${m.member_id}</td><td>${m.full_name}</td><td>${m.phone||'—'}</td><td>${m.year_group||'—'}</td><td>${m.primaryRole||'Member'}</td><td>${m.userStatus||'—'}</td></tr>`).join('')}
</tbody></table><div style="margin-top:10px;text-align:right;font-size:12px;color:#8896B3">Total: ${cache.members.length} members</div>`;
    } else if (type === 'contributions') {
      const filtered = applyFilter(cache.contributions, 'date_paid');
      const totalAmt = filtered.reduce((s,c)=>s+parseFloat(c.amount||0),0);
      html += `<table><thead><tr><th>Receipt</th><th>Member</th><th>Program</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead><tbody>
${filtered.map((c,i)=>`<tr style="background:${i%2?'#F8FAFF':'#fff'}"><td style="font-family:monospace;font-size:10px">${c.receipt_id}</td><td>${c.member_name}</td><td>${c.program_name}</td><td style="text-align:right;font-weight:700">GH₵ ${fmtAmt(c.amount)}</td><td>${fmtDate(c.date_paid)}</td><td>${c.status}</td></tr>`).join('')}
</tbody></table><div style="text-align:right;margin-top:10px;font-weight:700;color:#1A3A6B">Total: GH₵ ${fmtAmt(totalAmt)}</div>`;
    } else if (type === 'donations') {
      const filtered = applyFilter(cache.donations, 'date');
      const totalAmt = filtered.reduce((s,d)=>s+parseFloat(d.amount||0),0);
      html += `<table><thead><tr><th>ID</th><th>Beneficiary</th><th>Program</th><th>Amount</th><th>Date</th><th>Donor</th></tr></thead><tbody>
${filtered.map((d,i)=>`<tr style="background:${i%2?'#F8FAFF':'#fff'}"><td style="font-family:monospace;font-size:10px">${d.donation_id}</td><td>${d.beneficiary_name}</td><td>${d.program_name}</td><td style="text-align:right;font-weight:700">GH₵ ${fmtAmt(d.amount)}</td><td>${fmtDate(d.date)}</td><td>${d.donor_name}</td></tr>`).join('')}
</tbody></table><div style="text-align:right;margin-top:10px;font-weight:700;color:#C9A00A">Total: GH₵ ${fmtAmt(totalAmt)}</div>`;
    }

    html += `<div class="footer">HOSA ${type} Report · ${filterLabel} · ${now}</div>
<br><div style="text-align:center"><button onclick="window.print()" style="background:#1A3A6B;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Print / Save as PDF</button></div>
</body></html>`;
    const win = window.open('','_blank'); win.document.write(html); win.document.close();
  }

  function exportExcel(type) {
    if (type === 'members') {
      const headers = ['member_id','full_name','phone','email','year_group','address','roles','executive_roles','status'];
      const rows    = cache.members.map(m => [m.member_id,m.full_name,m.phone,m.email,m.year_group,m.address,m.roles||'Member',m.executiveRoles||'',m.userStatus||'Active']);
      downloadCSV([headers,...rows], 'HOSA_Members.csv');
    } else if (type === 'contributions') {
      const filtered = applyFilter(cache.contributions, 'date_paid');
      const headers  = ['receipt_id','member_id','member_name','program_name','amount','status','date_paid','recorded_by','notes'];
      const rows     = filtered.map(c => [c.receipt_id,c.member_id,c.member_name,c.program_name,c.amount,c.status,c.date_paid,c.recorded_by,c.notes||'']);
      downloadCSV([headers,...rows], `HOSA_Contributions_${filterLabel.replace(/[^a-zA-Z0-9]/g,'_')}.csv`);
    } else if (type === 'donations') {
      const filtered = applyFilter(cache.donations, 'date');
      const headers  = ['donation_id','program_name','beneficiary_name','amount','date','donor_name','status'];
      const rows     = filtered.map(d => [d.donation_id,d.program_name,d.beneficiary_name,d.amount,d.date,d.donor_name,d.status]);
      downloadCSV([headers,...rows], `HOSA_Donations_${filterLabel.replace(/[^a-zA-Z0-9]/g,'_')}.csv`);
    }
  }

  return (
    <div>
      {/* Filter Panel */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <div className="card-title"><i className="fas fa-filter" style={{ color: 'var(--blue)', marginRight: 7 }} />Report Filters</div>
          <button className="btn btn-outline btn-sm" onClick={() => { setFilterType('all'); setRfYear(currentYear); setRfFrom(''); setRfTo(''); setRfProg(''); }}><i className="fas fa-undo" /> Reset</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--g400)', marginBottom: 16, lineHeight: 1.6 }}>Set filters before generating any report. Leave fields blank to include all records.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">Filter Type</label>
            <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Records</option>
              <option value="year">By Year</option>
              <option value="range">Date Range</option>
              <option value="program">By Program</option>
            </select>
          </div>
          {filterType === 'year' && (
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="form-select" value={rfYear} onChange={e => setRfYear(e.target.value)}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
          {filterType === 'range' && (<>
            <div className="form-group"><label className="form-label">From Date</label><input className="form-input" type="date" value={rfFrom} onChange={e => setRfFrom(e.target.value)} /></div>
            <div className="form-group"><label className="form-label">To Date</label><input className="form-input" type="date" value={rfTo} onChange={e => setRfTo(e.target.value)} /></div>
          </>)}
          {filterType === 'program' && (
            <div className="form-group">
              <label className="form-label">Program / Event</label>
              <select className="form-select" value={rfProg} onChange={e => setRfProg(e.target.value)}>
                <option value="">All Programs</option>
                {programs.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
        </div>
        {filterLabel !== 'All Records' && (
          <div style={{ background: 'var(--blue-light)', border: '1px solid var(--blue-soft)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--blue)' }}>
            <i className="fas fa-info-circle" style={{ marginRight: 5 }} />Active filter: {filterLabel}
          </div>
        )}
      </div>

      {/* Reports */}
      <div className="grid-2">
        {/* PDF */}
        <div className="card">
          <div className="card-header"><div className="card-title"><i className="fas fa-file-pdf" style={{ color: '#E74C3C', marginRight: 7 }} />Download PDF Reports</div></div>
          <p style={{ fontSize: 12, color: 'var(--g400)', marginBottom: 16, lineHeight: 1.7 }}>Generates branded PDFs applying the filters above.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { type:'members',      label:'Member Directory PDF',      sub:'Full member list — no date filter applies', icon:'fa-users', bg:'var(--blue-light)', color:'var(--blue)' },
              { type:'contributions',label:'Contributions Report PDF',  sub:`Filtered: ${filterLabel}`, icon:'fa-coins', bg:'var(--ok-bg)', color:'var(--ok)' },
              { type:'donations',    label:'Donations Report PDF',      sub:`Filtered: ${filterLabel}`, icon:'fa-hand-holding-heart', bg:'var(--gold-lt)', color:'var(--gold-dk)' },
            ].map(r => (
              <div key={r.type} onClick={() => genPDF(r.type)} style={{ display:'flex',alignItems:'center',gap:12,padding:12,border:'1px solid var(--g100)',borderRadius:10,cursor:'pointer',transition:'.18s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--blue-soft)';e.currentTarget.style.background='var(--blue-light)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--g100)';e.currentTarget.style.background=''}}>
                <div style={{ width:38,height:38,borderRadius:9,background:r.bg,color:r.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}><i className={`fas ${r.icon}`} /></div>
                <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,color:'var(--g800)' }}>{r.label}</div><div style={{ fontSize:11,color:'var(--g400)',marginTop:2 }}>{r.sub}</div></div>
                <button className="btn btn-outline btn-sm" onClick={e=>{e.stopPropagation();genPDF(r.type)}}><i className="fas fa-download" /> Download</button>
              </div>
            ))}
          </div>
        </div>

        {/* Excel */}
        <div className="card">
          <div className="card-header"><div className="card-title"><i className="fas fa-file-excel" style={{ color: '#1D6F42', marginRight: 7 }} />Export to Excel / CSV</div></div>
          <p style={{ fontSize: 12, color: 'var(--g400)', marginBottom: 16, lineHeight: 1.7 }}>Exports apply the same filters set above.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { type:'members',      label:'Members Export',       sub:'All member data + roles — no date filter', icon:'fa-users', bg:'var(--ok-bg)', color:'var(--ok)' },
              { type:'contributions',label:'Contributions Export', sub:`Filtered: ${filterLabel}`, icon:'fa-coins', bg:'var(--blue-light)', color:'var(--blue)' },
              { type:'donations',    label:'Donations Export',     sub:`Filtered: ${filterLabel}`, icon:'fa-hand-holding-heart', bg:'var(--gold-lt)', color:'var(--gold-dk)' },
            ].map(r => (
              <div key={r.type} onClick={() => exportExcel(r.type)} style={{ display:'flex',alignItems:'center',gap:12,padding:12,border:'1px solid var(--g100)',borderRadius:10,cursor:'pointer',transition:'.18s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--blue-soft)';e.currentTarget.style.background='var(--blue-light)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--g100)';e.currentTarget.style.background=''}}>
                <div style={{ width:38,height:38,borderRadius:9,background:r.bg,color:r.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}><i className={`fas ${r.icon}`} /></div>
                <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600,color:'var(--g800)' }}>{r.label}</div><div style={{ fontSize:11,color:'var(--g400)',marginTop:2 }}>{r.sub}</div></div>
                <button className="btn btn-success btn-sm" onClick={e=>{e.stopPropagation();exportExcel(r.type)}}><i className="fas fa-download" /> Export</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
