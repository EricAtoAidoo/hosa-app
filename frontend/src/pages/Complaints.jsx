// src/pages/Complaints.jsx
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { Modal, ConfirmDialog, EmptyState } from '../components/UI';
import { fmtDate } from '../utils/helpers';
import api from '../utils/api';

const STATUS_COLOR = { 'Open':'var(--warn)', 'In Progress':'var(--blue)', 'Resolved':'var(--ok)', 'Closed':'var(--g400)' };
const STATUS_BG    = { 'Open':'var(--warn-bg)', 'In Progress':'var(--blue-light)', 'Resolved':'var(--ok-bg)', 'Closed':'var(--g50)' };

export default function MyComplaints() {
  const { session } = useApp();
  const [complaints, setComplaints] = useState([]);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy,    setBusy]    = useState(false);
  const memberId = session?.memberId;

  const load = async () => {
    const r = await api.getComplaints(memberId);
    if (r.success) setComplaints(r.data);
  };
  useEffect(() => { load(); }, [memberId]);

  async function save(form, id) {
    setBusy(true);
    const r = id
      ? await api.editComplaint(id, { ...form, member_id: memberId })
      : await api.addComplaint({ ...form, member_id: memberId, member_name: session?.fullName });
    setBusy(false);
    if (!r.success) { toast.error(r.error); return; }
    toast.success(id ? 'Complaint updated!' : 'Complaint submitted!');
    setModal(false); setEditing(null);
    load();
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
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g800)' }}>My Complaints</div>
          <div style={{ fontSize: 12, color: 'var(--g400)', marginTop: 3 }}>Submit and track your complaints or concerns to the executives</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModal(true); }}>
          <i className="fas fa-plus" /> New Complaint
        </button>
      </div>

      {!complaints.length && (
        <EmptyState icon="fa-comment-alt" title="No complaints submitted yet" sub='Use the "New Complaint" button to raise a concern with the executives' />
      )}

      {complaints.map(c => (
        <div key={c.complaint_id} style={{
          border: '1px solid var(--g100)', borderLeft: `3px solid ${STATUS_COLOR[c.status] || 'var(--g400)'}`,
          borderRadius: 'var(--rl)', padding: 16, marginBottom: 12, background: '#fff', boxShadow: 'var(--sh)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g800)' }}>{c.subject}</div>
              <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 3, display: 'flex', gap: 12 }}>
                <span><i className="fas fa-tag" style={{ marginRight: 3 }} />{c.category}</span>
                <span><i className="fas fa-clock" style={{ marginRight: 3 }} />{fmtDate(c.created_at)}</span>
              </div>
            </div>
            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: STATUS_BG[c.status] || 'var(--g50)', color: STATUS_COLOR[c.status] || 'var(--g400)' }}>
              {c.status}
            </span>
          </div>

          <div style={{ fontSize: 13, color: 'var(--g600)', lineHeight: 1.65 }}>{c.body}</div>

          {c.response && (
            <div style={{ background: 'var(--ok-bg)', border: '1px solid #a8e0c0', borderRadius: 10, padding: 12, marginTop: 10 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ok)', marginBottom: 5 }}>
                <i className="fas fa-reply" style={{ marginRight: 4 }} />Response from {c.responded_by}
              </div>
              <div style={{ fontSize: 13, color: 'var(--g800)', lineHeight: 1.6 }}>{c.response}</div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span className="id-col">{c.complaint_id}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {c.status === 'Open' && (
                <button className="btn btn-outline btn-sm" onClick={() => { setEditing(c); setModal(true); }}>
                  <i className="fas fa-edit" /> Edit
                </button>
              )}
              <button className="btn btn-danger btn-sm" onClick={() => setConfirm(c)}>
                <i className="fas fa-trash" /> Delete
              </button>
            </div>
          </div>
        </div>
      ))}

      {modal && (
        <Modal title={editing ? 'Edit Complaint' : 'Submit a Complaint'} onClose={() => { setModal(false); setEditing(null); }}>
          <ComplaintForm complaint={editing} onSave={save} busy={busy} />
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete Complaint"
          message={`Delete your complaint "${confirm.subject}"? This cannot be recovered.`}
          okLabel="Yes, Delete"
          onConfirm={() => del(confirm.complaint_id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function ComplaintForm({ complaint: c, onSave, busy }) {
  const [form, setForm] = useState({
    subject:  c?.subject  || '',
    body:     c?.body     || '',
    category: c?.category || 'General',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.subject.trim() || !form.body.trim()) { toast.error('Subject and details are required.'); return; }
    onSave(form, c?.complaint_id);
  };

  return (
    <>
      <div className="form-grid">
        <div className="form-group full">
          <label className="form-label">Subject *</label>
          <input className="form-input" value={form.subject} onChange={set('subject')} placeholder="Brief title of your complaint" />
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={form.category} onChange={set('category')}>
            {['General','Financial','Welfare','Conduct','Program','Other'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="form-group full">
          <label className="form-label">Details *</label>
          <textarea className="form-textarea" style={{ minHeight: 120 }} value={form.body} onChange={set('body')} placeholder="Describe your complaint in detail…" />
        </div>
      </div>
      <div style={{ background: 'var(--blue-light)', borderRadius: 8, padding: 10, fontSize: 11, color: 'var(--blue)', marginBottom: 14 }}>
        <i className="fas fa-shield-alt" style={{ marginRight: 5 }} />Your complaint is confidential and will only be seen by executives and administrators.
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy ? <span className="loader" /> : <><i className="fas fa-paper-plane" /> {c ? 'Update' : 'Submit'} Complaint</>}
        </button>
      </div>
    </>
  );
}
