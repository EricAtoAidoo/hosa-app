// src/pages/Announcements.jsx
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { Modal, ConfirmDialog, EmptyState } from '../components/UI';
import { fmtDate, typeColor, typeBg, cap } from '../utils/helpers';
import api from '../utils/api';

export default function Announcements() {
  const { cache, fetchAnnouncements, getLevel } = useApp();
  const [modal,  setModal]  = useState(false);
  const [confirm,setConfirm]= useState(null);
  const [busy,   setBusy]   = useState(false);
  const level = getLevel();

  useEffect(() => { fetchAnnouncements(true); }, []);

  async function save(form) {
    setBusy(true);
    const r = await api.addAnnouncement(form);
    setBusy(false);
    if (!r.success) { toast.error(r.error); return; }
    toast.success('Announcement posted!');
    setModal(false);
    fetchAnnouncements(true);
  }

  async function del(id) {
    const r = await api.deleteAnnouncement(id);
    if (r.success) { toast.success('Deleted.'); setConfirm(null); fetchAnnouncements(true); }
    else toast.error(r.error);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {level >= 3 && <button className="btn btn-primary" onClick={() => setModal(true)}><i className="fas fa-plus" /> Post Announcement</button>}
      </div>
      {!cache.announcements.length && <EmptyState icon="fa-bullhorn" title="No announcements" sub="Post an announcement to notify members" />}
      {cache.announcements.map(a => (
        <div key={a.announcement_id} className="announce-card">
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: typeColor(a.type), marginTop: 5, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g800)', marginBottom: 4 }}>
              {a.title}
              <span style={{ fontSize: 10, padding: '2px 8px', background: typeBg(a.type), color: typeColor(a.type), borderRadius: 10, fontWeight: 600, marginLeft: 6 }}>{cap(a.type)}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--g600)', lineHeight: 1.6 }}>{a.body}</div>
            <div style={{ fontSize: 10.5, color: 'var(--g400)', marginTop: 6, display: 'flex', gap: 12 }}>
              <span><i className="fas fa-user" style={{ marginRight: 3 }} />{a.posted_by}</span>
              <span><i className="fas fa-calendar" style={{ marginRight: 3 }} />{fmtDate(a.date)}</span>
            </div>
          </div>
          {level >= 3 && (
            <div style={{ flexShrink: 0 }}>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirm(a)}><i className="fas fa-trash" /></button>
            </div>
          )}
        </div>
      ))}
      {modal && (
        <Modal title="Post Announcement" onClose={() => setModal(false)}>
          <AnnounceForm onSave={save} busy={busy} />
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog title="Delete Announcement" message={`Delete "${confirm.title}"?`} okLabel="Yes, Delete" icon="fa-bullhorn" iconBg="var(--warn-bg)" iconColor="var(--warn)" okBg="var(--warn)" onConfirm={() => del(confirm.announcement_id)} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

function AnnounceForm({ onSave, busy }) {
  const { session } = useApp();
  const [form, setForm] = useState({ title: '', body: '', posted_by: session?.primaryRole || 'Admin', type: 'info', date: new Date().toLocaleDateString('en-GH') });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.title || !form.body) { toast.error('Title and message are required.'); return; }
    onSave(form);
  };
  return (
    <>
      <div className="form-grid">
        <div className="form-group full"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={set('title')} placeholder="Announcement title" /></div>
        <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.type} onChange={set('type')}><option>info</option><option>urgent</option><option>meeting</option><option>emergency</option></select></div>
        <div className="form-group"><label className="form-label">Posted By</label><input className="form-input" value={form.posted_by} onChange={set('posted_by')} /></div>
        <div className="form-group full"><label className="form-label">Message *</label><textarea className="form-textarea" style={{ minHeight: 100 }} value={form.body} onChange={set('body')} /></div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy ? <span className="loader" /> : <><i className="fas fa-bullhorn" /> Post Announcement</>}
        </button>
      </div>
    </>
  );
}
