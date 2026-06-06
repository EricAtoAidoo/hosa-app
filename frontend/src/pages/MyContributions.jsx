// src/pages/MyContributions.jsx
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState, StatusPill } from '../components/UI';
import { fmtDate, fmtAmt, downloadCSV, genReceiptHtml } from '../utils/helpers';
import api from '../utils/api';

export default function MyContributions() {
  const { session, cache } = useApp();
  const [data,    setData]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [byYear,  setByYear]  = useState({});
  const [byProg,  setByProg]  = useState({});
  const [yearF,   setYearF]   = useState('');
  const [progF,   setProgF]   = useState('');
  const [unpaid,  setUnpaid]  = useState([]);
  const [showUnpaid, setShowUnpaid] = useState(false);
  const memberId = session?.memberId;

  useEffect(() => { load(); }, [memberId]);

  async function load() {
    if (!memberId) return;
    const [r, pRes] = await Promise.all([
      api.getMemberContributions(memberId),
      api.getPrograms(),
    ]);
    if (r.success) {
      setData(r.data || []);
      setTotal(r.totalAmount || 0);
      setByYear(r.byYear || {});
      setByProg(r.byProgram || {});

      // Check for unpaid programs
      if (pRes.success) {
        const activeProgs = (pRes.data || []).filter(p => p.status === 'current' || p.status === 'upcoming');
        const paidProgs   = new Set((r.data || []).filter(c => c.status === 'Paid').map(c => (c.program_name||'').toLowerCase().trim()));
        const unpaidProgs = activeProgs.filter(p => !paidProgs.has((p.title||'').toLowerCase().trim()));
        setUnpaid(unpaidProgs);
        if (unpaidProgs.length) setTimeout(() => setShowUnpaid(true), 600);
      }
    }
  }

  const thisYear = new Date().getFullYear().toString();
  const yearTotal = Object.entries(byYear).find(([y]) => y === thisYear)?.[1] || 0;
  const years     = Object.keys(byYear).sort().reverse();
  const programs  = Object.keys(byProg).sort();

  const filtered = data.filter(c => {
    if (yearF && !(c.date_paid||c.created_at||'').toString().startsWith(yearF)) return false;
    if (progF && c.program_name !== progF) return false;
    return true;
  });

  function viewReceipt(c) {
    const win = window.open('', '_blank');
    win.document.write(genReceiptHtml(c.receipt_id, 'Contribution', c.member_name, c.program_name, c.amount, c.recorded_by, c.date_paid, cache.logo || null));
    win.document.close();
  }

  function exportCSV() {
    const headers = ['Receipt ID','Program','Amount','Date Paid','Status','Recorded By'];
    const rows    = data.map(c => [c.receipt_id, c.program_name, c.amount, c.date_paid, c.status, c.recorded_by]);
    downloadCSV([headers,...rows], 'HOSA_My_Contributions.csv');
  }

  function downloadPDF() {
    const rows = data.map((c,i) => `<tr style="background:${i%2?'#F8FAFF':'#fff'}"><td style="padding:8px;font-family:monospace;font-size:10px">${c.receipt_id}</td><td style="padding:8px">${c.program_name}</td><td style="padding:8px;text-align:right;font-weight:700">GH₵ ${fmtAmt(c.amount)}</td><td style="padding:8px">${fmtDate(c.date_paid)}</td><td style="padding:8px">${c.status}</td></tr>`).join('');
    const total_ = data.reduce((s,c)=>s+parseFloat(c.amount||0),0);
    const html = `<!DOCTYPE html><html><head><title>My Contributions</title><style>body{font-family:sans-serif;padding:30px;color:#1E2A45}table{width:100%;border-collapse:collapse}th{background:#1A3A6B;color:#fff;padding:8px;text-align:left}@media print{button{display:none}}</style></head>
<body><h2 style="color:#1A3A6B">HOSA — My Contributions: ${session?.fullName}</h2>
<p style="color:#8896B3;font-size:12px">Generated: ${new Date().toLocaleDateString('en-GH')}</p>
<table><thead><tr><th>Receipt ID</th><th>Program</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
<div style="text-align:right;margin-top:14px;font-weight:700;color:#1A3A6B">Total: GH₵ ${fmtAmt(total_)}</div>
<br><button onclick="window.print()" style="background:#1A3A6B;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer">Print / Save as PDF</button>
</body></html>`;
    const win = window.open('', '_blank'); win.document.write(html); win.document.close();
  }

  return (
    <div>
      {/* Unpaid popup */}
      {showUnpaid && unpaid.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,58,107,.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 800, padding: 20, animation: 'fadeIn .3s ease' }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 12px 48px rgba(26,58,107,.2)', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,var(--err) 0%,#e74c3c 100%)', padding: '22px 24px 18px', position: 'relative' }}>
              <button onClick={() => setShowUnpaid(false)} style={{ position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer' }}>×</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fas fa-exclamation-triangle" style={{ color: '#fff', fontSize: 22 }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Outstanding Contributions</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', lineHeight: 1.4 }}>You have unpaid contribution(s) for the following:</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '20px 24px 24px' }}>
              <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 18 }}>
                {unpaid.map((p, i) => (
                  <div key={p.program_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--err-bg)', border: '1px solid #f5c6c1', marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--err)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>{i+1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--err)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                      {p.date && <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 2 }}><i className="fas fa-calendar" style={{ marginRight: 3 }} />{fmtDate(p.date)}</div>}
                    </div>
                    <StatusPill status={p.status} />
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--blue-light)', border: '1px solid var(--blue-soft)', borderRadius: 10, padding: '12px 14px', marginBottom: 18, fontSize: 12, color: 'var(--blue)', lineHeight: 1.6 }}>
                <i className="fas fa-info-circle" style={{ marginRight: 5 }} />Please contact the <strong>Secretary</strong> or <strong>Financial Secretary</strong> to make your payment and have it recorded.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setShowUnpaid(false)}>Close</button>
                <button className="btn btn-primary" onClick={() => setShowUnpaid(false)}><i className="fas fa-wallet" /> View My Contributions</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="my-contrib-summary">
        <div className="contrib-sum-box"><div className="contrib-sum-val">GH₵ {fmtAmt(total)}</div><div className="contrib-sum-lbl">Total All Time</div></div>
        <div className="contrib-sum-box"><div className="contrib-sum-val">GH₵ {fmtAmt(yearTotal)}</div><div className="contrib-sum-lbl">This Year</div></div>
        <div className="contrib-sum-box"><div className="contrib-sum-val">{data.length}</div><div className="contrib-sum-lbl">Total Records</div></div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div className="card-title" style={{ paddingBottom: 12 }}>My Contribution History</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 12 }}>
            <select className="filter-select" value={yearF} onChange={e => setYearF(e.target.value)}>
              <option value="">All Years</option>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
            <select className="filter-select" value={progF} onChange={e => setProgF(e.target.value)}>
              <option value="">All Programs</option>
              {programs.map(p => <option key={p}>{p}</option>)}
            </select>
            <button className="btn btn-outline btn-sm" onClick={downloadPDF}><i className="fas fa-download" /> Download PDF</button>
            <button className="btn btn-success btn-sm" onClick={exportCSV}><i className="fas fa-file-excel" /> Export Excel</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Receipt No.</th><th>Program</th><th>Amount</th><th>Date Paid</th><th>Status</th><th>Receipt</th></tr></thead>
            <tbody>
              {!filtered.length && <tr><td colSpan={6}><EmptyState icon="fa-coins" title="No contributions found" /></td></tr>}
              {filtered.map(c => (
                <tr key={c.receipt_id}>
                  <td><span className="id-col" style={{ color: 'var(--blue)' }}>{c.receipt_id}</span></td>
                  <td style={{ fontSize: 12 }}>{c.program_name}</td>
                  <td><strong style={{ color: 'var(--blue)' }}>GH₵ {fmtAmt(c.amount)}</strong></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtDate(c.date_paid)}</td>
                  <td><StatusPill status={c.status} /></td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => viewReceipt(c)}>
                      <i className="fas fa-eye" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
