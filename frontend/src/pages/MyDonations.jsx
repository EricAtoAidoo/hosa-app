// src/pages/MyDonations.jsx
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState, StatusPill } from '../components/UI';
import { fmtDate, fmtAmt, initials, genReceiptHtml } from '../utils/helpers';
import api from '../utils/api';

export default function MyDonations() {
  const { session, cache } = useApp();
  const [donations, setDonations] = useState([]);
  const [typeF,     setTypeF]     = useState('');
  const memberId = session?.memberId;

  useEffect(() => {
    if (!memberId) return;
    api.getDonations(memberId).then(r => {
      if (r.success) {
        // Only donations where this member is the BENEFICIARY
        setDonations((r.data || []).filter(d => d.beneficiary_member_id === memberId));
      }
    });
  }, [memberId]);

  const filtered = donations.filter(d => !typeF || d.status === typeF);
  const total    = donations.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
  const latest   = donations.length ? fmtDate(donations[0].date) : '—';

  function viewReceipt(d) {
    const win = window.open('', '_blank');
    win.document.write(genReceiptHtml(
      d.donation_id, 'Donation',
      d.beneficiary_name,
      `Donation for ${d.beneficiary_name} — ${d.program_name}`,
      d.amount, d.donor_name, d.date, cache.logo || null
    ));
    win.document.close();
  }

  return (
    <div>
      {/* Summary */}
      <div className="my-contrib-summary">
        <div className="contrib-sum-box"><div className="contrib-sum-val">GH₵ {fmtAmt(total)}</div><div className="contrib-sum-lbl">Total Received</div></div>
        <div className="contrib-sum-box"><div className="contrib-sum-val">{donations.length}</div><div className="contrib-sum-lbl">Total Donations</div></div>
        <div className="contrib-sum-box"><div className="contrib-sum-val">{latest}</div><div className="contrib-sum-lbl">Latest Donation</div></div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div className="card-title" style={{ paddingBottom: 12 }}>
            <i className="fas fa-hand-holding-heart" style={{ color: 'var(--gold)', marginRight: 7 }} />Donations Made To Me
          </div>
          <div style={{ paddingBottom: 12 }}>
            <select className="filter-select" value={typeF} onChange={e => setTypeF(e.target.value)}>
              <option value="">All Types</option>
              <option>Completed</option>
              <option>Pending</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Donation ID</th><th>Program / Purpose</th><th>Amount</th>
                <th>Date</th><th>Donated By</th><th>Status</th><th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length && (
                <tr><td colSpan={7}>
                  <EmptyState icon="fa-hand-holding-heart" title="No donations received yet" sub="Donations made to you by HOSA or members will appear here" />
                </td></tr>
              )}
              {filtered.map(d => (
                <tr key={d.donation_id}>
                  <td><span className="id-col" style={{ color: 'var(--blue)' }}>{d.donation_id}</span></td>
                  <td style={{ fontSize: 12 }}>{d.program_name || '—'}</td>
                  <td><strong style={{ color: 'var(--ok)' }}>GH₵ {fmtAmt(d.amount)}</strong></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtDate(d.date)}</td>
                  <td>
                    <div className="td-flex">
                      <div className="av-sm" style={{ background: 'var(--gold-lt)', color: 'var(--gold-dk)' }}>
                        {initials(d.donor_name)}
                      </div>
                      <span style={{ fontSize: 12 }}>{d.donor_name || '—'}</span>
                    </div>
                  </td>
                  <td><StatusPill status={d.status || 'Completed'} /></td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => viewReceipt(d)}>
                      <i className="fas fa-receipt" /> Receipt
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
