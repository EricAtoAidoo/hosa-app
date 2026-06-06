// src/pages/MyReceipts.jsx
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState, StatusPill } from '../components/UI';
import { fmtDate, fmtAmt, genReceiptHtml } from '../utils/helpers';
import api from '../utils/api';

export default function MyReceipts() {
  const { session, cache } = useApp();
  const [receipts, setReceipts] = useState([]);
  const [typeF,    setTypeF]    = useState('');
  const memberId = session?.memberId;

  useEffect(() => {
    if (!memberId) return;
    api.getReceipts(memberId).then(r => { if (r.success) setReceipts(r.data || []); });
  }, [memberId]);

  const filtered = receipts.filter(r => !typeF || r.type === typeF);

  function viewReceipt(r) {
    const win = window.open('', '_blank');
    win.document.write(genReceiptHtml(r.receipt_id, r.type, r.member_name, r.program_or_purpose, r.amount, r.recorded_by, r.date, cache.logo || null));
    win.document.close();
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="card-title" style={{ paddingBottom: 12 }}>My Receipts</div>
        <div style={{ paddingBottom: 12 }}>
          <select className="filter-select" value={typeF} onChange={e => setTypeF(e.target.value)}>
            <option value="">All Types</option>
            <option>Contribution</option>
            <option>Donation</option>
          </select>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Receipt ID</th><th>Type</th><th>Purpose</th>
              <th>Amount</th><th>Date</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!filtered.length && (
              <tr><td colSpan={7}>
                <EmptyState icon="fa-receipt" title="No receipts yet" sub="Receipts are auto-generated when contributions are recorded" />
              </td></tr>
            )}
            {filtered.map(r => (
              <tr key={r.receipt_id}>
                <td><span className="id-col" style={{ color: 'var(--blue)' }}>{r.receipt_id}</span></td>
                <td>
                  <span className={`pill ${r.type === 'Donation' ? 'pill-pending' : 'pill-current'}`}>{r.type}</span>
                </td>
                <td style={{ fontSize: 12, maxWidth: 200 }}>{r.program_or_purpose}</td>
                <td><strong style={{ color: 'var(--blue)' }}>GH₵ {fmtAmt(r.amount)}</strong></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtDate(r.date)}</td>
                <td><StatusPill status={r.status} /></td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => viewReceipt(r)}>
                    <i className="fas fa-eye" /> View &amp; Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
