// src/pages/Programs.jsx
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { Modal, ConfirmDialog, EmptyState, StatusPill } from '../components/UI';
import { fmtDate, fmtAmt, cap, todayISO } from '../utils/helpers';
import api from '../utils/api';

export default function Programs() {
  const { cache, fetchPrograms, getLevel } = useApp();
  const [filter, setFilter] = useState('all');
  const [modal,  setModal]  = useState(false);
  const [editing,setEditing]= useState(null);
  const [confirm,setConfirm]= useState(null);
  const [busy,   setBusy]   = useState(false);
  const level = getLevel();

  useEffect(() => { fetchPrograms(true); }, []);

  const data = filter === 'all' ? cache.programs : cache.programs.filter(p => p.status === filter);

  async function save(form, id) {
    setBusy(true);
    const r = id ? await api.editProgram(id, form) : await api.addProgram(form);
    setBusy(false);
    if (!r.success) { toast.error(r.error); return; }
    toast.success(id ? 'Program updated!' : 'Program added!');
    setModal(false); setEditing(null);
    fetchPrograms(true);
  }

  async function del(id) {
    const r = await api.deleteProgram(id);
    if (r.success) { toast.success('Program deleted.'); setConfirm(null); fetchPrograms(true); }
    else toast.error(r.error);
  }

  const TABS = ['all','current','upcoming','future','archived'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div className="tab-group">
          {TABS.map(t => <button key={t} className={`tab-btn${filter === t ? ' active' : ''}`} onClick={() => setFilter(t)}>{cap(t)}</button>)}
        </div>
        {level >= 3 && <button className="btn btn-primary" onClick={() => { setEditing(null); setModal(true); }}><i className="fas fa-plus" /> Add Program</button>}
      </div>

      {!data.length && <EmptyState icon="fa-calendar-times" title="No programs found" sub="Add a program to get started" />}
      {data.map(p => {
        const d = new Date(p.date);
        return (
          <div key={p.program_id} className="prog-card">
            <div className="prog-date">
              <div className="prog-day">{isNaN(d.getDate()) ? '—' : d.getDate()}</div>
              <div className="prog-mon">{isNaN(d) ? '—' : d.toLocaleString('en',{month:'short'})}</div>
              <div className="prog-yr">{isNaN(d) ? '' : d.getFullYear()}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--g800)', marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: 'var(--g400)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <i className="fas fa-map-marker-alt" style={{ color: 'var(--blue-mid)' }} />{p.venue || 'TBD'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusPill status={p.status} />
                <span style={{ fontSize: 12, color: 'var(--g400)' }}>Budget: GH₵ {fmtAmt(p.budget)}</span>
              </div>
              {p.description && <div style={{ fontSize: 12, color: 'var(--g400)', marginTop: 6 }}>{p.description}</div>}
            </div>
            {level >= 3 && (
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-outline btn-sm" onClick={() => { setEditing(p); setModal(true); }}><i className="fas fa-edit" /></button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirm(p)}><i className="fas fa-trash" /></button>
              </div>
            )}
          </div>
        );
      })}

      {modal && (
        <Modal title={editing ? 'Edit Program' : 'Add Program'} onClose={() => { setModal(false); setEditing(null); }}>
          <ProgramForm program={editing} onSave={save} busy={busy} />
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog title="Delete Program" message={`Delete "${confirm.title}"?`} okLabel="Yes, Delete" icon="fa-calendar-times" iconBg="var(--warn-bg)" iconColor="var(--warn)" okBg="var(--warn)" onConfirm={() => del(confirm.program_id)} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

function ProgramForm({ program: p, onSave, busy }) {
  const [form, setForm] = useState({
    title: p?.title || '', date: p?.date || todayISO(), venue: p?.venue || '',
    budget: p?.budget || '', status: p?.status || 'upcoming', description: p?.description || '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div className="form-grid">
        <div className="form-group full"><label className="form-label">Program Title *</label><input className="form-input" value={form.title} onChange={set('title')} placeholder="e.g. 2026 Annual Gala" /></div>
        <div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" value={form.date} onChange={set('date')} /></div>
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={set('status')}>
            {['current','upcoming','future','archived'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group full"><label className="form-label">Venue</label><input className="form-input" value={form.venue} onChange={set('venue')} placeholder="Location or TBD" /></div>
        <div className="form-group"><label className="form-label">Budget (GH₵)</label><input className="form-input" type="number" value={form.budget} onChange={set('budget')} placeholder="0" /></div>
        <div className="form-group full"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={set('description')} /></div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy} onClick={() => onSave(form, p?.program_id)}>
          {busy ? <span className="loader" /> : <><i className="fas fa-save" /> {p ? 'Update' : 'Add'} Program</>}
        </button>
      </div>
    </>
  );
}
