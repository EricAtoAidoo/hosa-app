// src/pages/ActivityLog.jsx
import React, { useEffect, useState } from 'react';
import { EmptyState } from '../components/UI';
import api from '../utils/api';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.getActivityLog().then(r => { if (r.success) setLogs(r.data); });
  }, []);

  function fmtDT(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '16px 20px' }}>
        <div className="card-title">System Activity Log (Last 200)</div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Action</th>
              <th>Performed By</th>
              <th>Target</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {!logs.length && (
              <tr><td colSpan={5}><EmptyState icon="fa-history" title="No activity logged yet" /></td></tr>
            )}
            {logs.map(l => (
              <tr key={l.log_id}>
                <td><span className="id-col">{l.log_id}</span></td>
                <td><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>{l.action}</span></td>
                <td style={{ fontSize: 12 }}>{l.performed_by}</td>
                <td style={{ fontSize: 12, color: 'var(--g400)', maxWidth: 200 }}>{l.target}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--g400)' }}>{fmtDT(l.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
