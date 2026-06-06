// src/pages/ComplaintCentre.jsx
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { Modal, ConfirmDialog, EmptyState } from '../components/UI';
import { fmtDate } from '../utils/helpers';
import api from '../utils/api';

const STATUS_COLOR = { 'Open':'var(--warn)', 'In Progress':'var(--blue)', 'Resolved':'var(--ok)', 'Closed':'var(--g400)' };
const STATUS_BG    = { 'Open':'var(--warn-bg)', 'In Progress':'var(--blue-light)', 'Resolved':'var(--ok-bg)', 'Closed':'var(--g50)' };

export default function ComplaintCentre() {
  const { session } = useApp();
  const [complaints, setComplaints] = useState([]);
  const [statusF, setStatusF] = useState('');
  const [catF,    setCatF]    = useState('');
  const [respond, setRespond] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [respText,  setRespText]   = useState('');
  const [respStatus,setRespStatus] = useState('Resolved');
  const [busy, setBusy] = useState(false);

  const load = async () => { const r = await api.getComplaints(); if (r.success) setComplaints(r.data); };
  useEffect(() => { load(); }, []);

  const filtered = complaints.filter(c => (!statusF || c.status === statusF) && (!catF || c.category === catF));

  async function saveResponse() {
    if (!respText.trim()) { toast.error('Please write a response.'); return; }
    setBusy(true);
    const r = await api.respondComplaint(respond.complaint_id, {
      response: respText.trim(), status: respStatus, responded_by: session?.fullName || 'Executive',
    });
    setBusy(false);
    if (r.success) { toast.success('Response sent!'); setRespond(null); setRespText(''); load(); }
    else toast.error(r.error);
  }

  async function del(id) {
    const r = await api.deleteComplaint(id);
    if (r.success) { toast.success('Deleted.'); setConfirm(null); load(); }
    else toast.error(r.error);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g800)' }}>Complaint Centre</div>
          <div style={{ fontSize: 12, color: 'var(--g400)', marginTop: 3 }}>View and respond to all member complaints</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="filter-select" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All Status</option>
            {['Open','In Progress','Resolved','Closed'].map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="filter-select" value={catF} onChange={e => setCatF(e.target.value)}>
            <option value="">All Categories</option>
            {['General','Financial','Welfare','Conduct','Program','Other'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {!filtered.length && <EmptyState icon="fa-inbox" title="No complaints found" sub="All clear!" />}

      {filtered.map(c => (
        <div key={c.complaint_id} style={{ border: '1px solid var(--g100)', borderLeft: `3px solid ${STATUS_COLOR[c.status] || 'var(--g400)'}`, borderRadius: 'var(--rl)', padding: 16, marginBottom: 12, background: '#fff', boxShadow: 'var(--sh)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g800)' }}>{c.subject}</div>
              <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span><i className="fas fa-user" style={{ marginRight: 3 }} />{c.member_name}</span>
                <span><i className="fas fa-tag" style={{ marginRight: 3 }} />{c.category}</span>
                <span><i className="fas fa-clock" style={{ marginRight: 3 }} />{fmtDate(c.created_at)}</span>
                <span className="id-col">{c.complaint_id}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: STATUS_BG[c.status] || 'var(--g50)', color: STATUS_COLOR[c.status] || 'var(--g400)' }}>{c.status}</span>
              {(c.status === 'Open' || c.status === 'In Progress') && (
                <button className="btn btn-success btn-sm" onClick={() => { setRespond(c); setRespText(''); setRespStatus('Resolved'); }}>
                  <i className="fas fa-reply" /> Respond
                </button>
              )}
              <button className="btn btn-danger btn-sm" onClick={() => setConfirm(c)}><i className="fas fa-trash" /></button>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--g600)', lineHeight: 1.65 }}>{c.body}</div>
          {c.response && (
            <div style={{ background: 'var(--ok-bg)', border: '1px solid #a8e0c0', borderRadius: 10, padding: 10, marginTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ok)', marginBottom: 4 }}>Response · {c.responded_by}</div>
              <div style={{ fontSize: 12, color: 'var(--g800)' }}>{c.response}</div>
            </div>
          )}
        </div>
      ))}

      {respond && (
        <Modal title="Respond to Complaint" onClose={() => setRespond(null)}>
          <div style={{ background: 'var(--blue-light)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)', marginBottom: 4 }}>{respond.subject}</div>
            <div style={{ fontSize: 12, color: 'var(--g600)', lineHeight: 1.6 }}>{respond.body}</div>
            <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 6 }}>From: {respond.member_name} · {fmtDate(respond.created_at)}</div>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Your Response *</label>
            <textarea className="form-textarea" style={{ minHeight: 100 }} value={respText} onChange={e => setRespText(e.target.value)} placeholder="Write your response here…" />
          </div>
          <div className="form-group" style={{ marginBottom: 4 }}>
            <label className="form-label">Update Status</label>
            <select className="form-select" value={respStatus} onChange={e => setRespStatus(e.target.value)}>
              <option>In Progress</option><option>Resolved</option><option>Closed</option>
            </select>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setRespond(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy} onClick={saveResponse}>
              {busy ? <span className="loader" /> : <><i className="fas fa-reply" /> Send Response</>}
            </button>
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog title="Delete Complaint" message="Permanently delete this complaint record?" okLabel="Delete"
          onConfirm={() => del(confirm.complaint_id)} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}
