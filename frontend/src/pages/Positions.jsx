// src/pages/Positions.jsx
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { Modal, ConfirmDialog, EmptyState, RolePill } from '../components/UI';
import api from '../utils/api';

export default function Positions() {
  const { cache, fetchPositions } = useApp();
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy,    setBusy]    = useState(false);

  useEffect(() => { fetchPositions(true); }, []);

  async function save(form, id) {
    setBusy(true);
    const r = id ? await api.editPosition(id, form) : await api.addPosition(form);
    setBusy(false);
    if (!r.success) { toast.error(r.error); return; }
    toast.success(id ? 'Position updated!' : 'Position added!');
    setModal(false); setEditing(null);
    fetchPositions(true);
  }

  async function del(id) {
    const r = await api.deletePosition(id);
    if (r.success) { toast.success('Position deleted.'); setConfirm(null); fetchPositions(true); }
    else toast.error(r.error);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g800)' }}>Position & Role Management</div>
          <div style={{ fontSize: 12, color: 'var(--g400)', marginTop: 4 }}>Create, edit and assign positions to executives and members</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModal(true); }}>
          <i className="fas fa-plus" /> Add Position
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Position ID</th><th>Position Name</th><th>Level</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody>
            {!cache.positions.length && <tr><td colSpan={5}><EmptyState icon="fa-sitemap" title="No positions" /></td></tr>}
            {cache.positions.map(p => (
              <tr key={p.position_id}>
                <td><span className="id-col">{p.position_id}</span></td>
                <td><RolePill role={p.position_name} /></td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{p.level}</td>
                <td style={{ fontSize: 12, color: 'var(--g400)' }}>{p.description || '—'}</td>
                <td><div style={{ display: 'flex', gap: 5 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => { setEditing(p); setModal(true); }}><i className="fas fa-edit" /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirm(p)}><i className="fas fa-trash" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={editing ? 'Edit Position' : 'Add New Position'} onClose={() => { setModal(false); setEditing(null); }}>
          <PosForm pos={editing} onSave={save} busy={busy} />
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog title="Delete Position" message={`Delete position "${confirm.position_name}"?`}
          icon="fa-sitemap" iconBg="var(--blue-light)" iconColor="var(--blue)" okBg="var(--blue)" okLabel="Yes, Delete"
          onConfirm={() => del(confirm.position_id)} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

function PosForm({ pos, onSave, busy }) {
  const [form, setForm] = useState({ position_name: pos?.position_name || '', level: pos?.level || 1, description: pos?.description || '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div className="form-grid">
        <div className="form-group full"><label className="form-label">Position Name *</label><input className="form-input" value={form.position_name} onChange={set('position_name')} placeholder="e.g. Welfare Officer, PRO" /></div>
        <div className="form-group"><label className="form-label">Access Level (1-6)</label><input className="form-input" type="number" value={form.level} onChange={set('level')} min="1" max="6" /></div>
        <div className="form-group full"><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={set('description')} placeholder="What this position can do" /></div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy} onClick={() => onSave(form, pos?.position_id)}>
          {busy ? <span className="loader" /> : <><i className="fas fa-save" /> {pos ? 'Update' : 'Add'} Position</>}
        </button>
      </div>
    </>
  );
}
