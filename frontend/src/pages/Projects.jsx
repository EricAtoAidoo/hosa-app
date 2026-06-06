// src/pages/Projects.jsx
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { Modal, ConfirmDialog, EmptyState } from '../components/UI';
import { fmtDate, fmtAmt, todayISO } from '../utils/helpers';
import api from '../utils/api';

export default function Projects() {
  const { cache, fetchProjects, getLevel } = useApp();
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy,    setBusy]    = useState(false);
  const level = getLevel();

  useEffect(() => { fetchProjects(true); }, []);

  const filtered = cache.projects.filter(p => {
    const q = search.toLowerCase();
    return !q || (p.organization||'').toLowerCase().includes(q) || (p.receiver_name||'').toLowerCase().includes(q) || (p.item_or_project||'').toLowerCase().includes(q);
  });

  const total   = cache.projects.reduce((s,p) => s + parseFloat(p.total_amount||0), 0);
  const orgs    = new Set(cache.projects.map(p => p.organization).filter(Boolean)).size;
  const thisY   = new Date().getFullYear().toString();
  const yearT   = cache.projects.filter(p => (p.date||p.created_at||'').toString().startsWith(thisY)||String(p.date||'').endsWith('/'+thisY)).reduce((s,p)=>s+parseFloat(p.total_amount||0),0);

  async function save(data, id) {
    setBusy(true);
    const r = id ? await api.editProject(id, data) : await api.addProject(data);
    setBusy(false);
    if (!r.success) { toast.error(r.error); return; }
    toast.success(id ? 'Project updated!' : 'Project recorded! ' + r.projectId);
    setModal(false); setEditing(null);
    fetchProjects(true);
  }

  async function del(id) {
    const r = await api.deleteProject(id);
    if (r.success) { toast.success('Project deleted.'); setConfirm(null); fetchProjects(true); }
    else toast.error(r.error);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--g800)' }}>HOSA Projects</div>
          <div style={{ fontSize: 12, color: 'var(--g400)', marginTop: 3 }}>Record community, institutional and welfare projects undertaken by HOSA</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ minWidth: 200 }}>
            <i className="fas fa-search" /><input placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {level >= 3 && <button className="btn btn-primary" onClick={() => { setEditing(null); setModal(true); }}><i className="fas fa-plus" /> Add Project</button>}
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label:'Total Projects', val: cache.projects.length, icon:'fa-project-diagram', si:'si-blue' },
          { label:'Organizations',  val: orgs, icon:'fa-building', si:'si-gold' },
          { label:'Total Spent',    val:'GH₵ '+fmtAmt(total), icon:'fa-coins', si:'si-err' },
          { label:'This Year',      val:'GH₵ '+fmtAmt(yearT), icon:'fa-calendar-check', si:'si-ok' },
        ].map((s,i) => (
          <div key={i} className="stat-card" style={{ margin: 0 }}>
            <div className={`stat-icon ${s.si}`}><i className={`fas ${s.icon}`} /></div>
            <div className="stat-lbl">{s.label}</div>
            <div className="stat-val" style={{ fontSize: typeof s.val === 'string' ? 18 : 26 }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Project ID</th><th>Organization</th><th>Receiver</th><th>Item / Project</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>HOSA Rep</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {!filtered.length && <tr><td colSpan={10}><EmptyState icon="fa-project-diagram" title="No projects recorded yet" sub='Click "Add Project" to record a community or welfare project' /></td></tr>}
            {filtered.map(p => (
              <tr key={p.project_id}>
                <td><span className="id-col">{p.project_id}</span></td>
                <td style={{ fontWeight: 600, maxWidth: 160 }}>{p.organization}</td>
                <td style={{ maxWidth: 140 }}>{p.receiver_name}</td>
                <td style={{ fontSize: 12, maxWidth: 180 }}>{p.item_or_project || '—'}</td>
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{p.quantity || 1}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>GH₵ {fmtAmt(p.unit_price||0)}</td>
                <td><strong style={{ color: 'var(--blue)' }}>GH₵ {fmtAmt(p.total_amount||0)}</strong></td>
                <td style={{ fontSize: 12 }}>{p.hosa_rep || '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtDate(p.date)}</td>
                <td>
                  {level >= 3 ? (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => { setEditing(p); setModal(true); }}><i className="fas fa-edit" /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirm(p)}><i className="fas fa-trash" /></button>
                    </div>
                  ) : <span style={{ fontSize: 11, color: 'var(--g400)' }}>View only</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={editing ? 'Edit Project' : 'Record Project'} onClose={() => { setModal(false); setEditing(null); }} large>
          <ProjectForm project={editing} onSave={save} busy={busy} />
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog title="Delete Project" message={`Delete project for "${confirm.organization} — ${confirm.receiver_name}"?`} okLabel="Yes, Delete" onConfirm={() => del(confirm.project_id)} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

function ProjectForm({ project: p, onSave, busy }) {
  const { session } = useApp();
  const [form, setForm] = useState({
    organization:    p?.organization    || '',
    receiver_name:   p?.receiver_name   || '',
    item_or_project: p?.item_or_project || '',
    quantity:        p?.quantity        || 1,
    unit_price:      p?.unit_price      || 0,
    total_amount:    p?.total_amount    || 0,
    hosa_rep:        p?.hosa_rep        || (session?.fullName || ''),
    date:            p?.date            || todayISO(),
    notes:           p?.notes           || '',
  });
  const set = k => e => {
    const v = e.target.value;
    setForm(f => {
      const updated = { ...f, [k]: v };
      if (k === 'quantity' || k === 'unit_price') {
        const qty   = parseFloat(k === 'quantity'   ? v : f.quantity)   || 0;
        const price = parseFloat(k === 'unit_price' ? v : f.unit_price) || 0;
        if (qty > 0 && price > 0) updated.total_amount = (qty * price).toFixed(2);
      }
      return updated;
    });
  };

  const submit = () => {
    if (!form.organization || !form.receiver_name) { toast.error('Organization and receiver name are required.'); return; }
    onSave({ ...form, recorded_by: session?.fullName || 'Admin' }, p?.project_id);
  };

  return (
    <>
      <div style={{ background: 'var(--blue-light)', border: '1px solid var(--blue-soft)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: 'var(--blue)' }}>
        <i className="fas fa-info-circle" style={{ marginRight: 5 }} />Record items, services or cash donations HOSA made to an organization, institution or community.
      </div>
      <div className="form-grid">
        <div className="form-group"><label className="form-label">Organization / Institution *</label><input className="form-input" value={form.organization} onChange={set('organization')} placeholder="e.g. Salvation Army Orphanage" /></div>
        <div className="form-group"><label className="form-label">Receiver (Person) *</label><input className="form-input" value={form.receiver_name} onChange={set('receiver_name')} placeholder="e.g. Rev. John Mensah" /></div>
        <div className="form-group full"><label className="form-label">Item / Project Description</label><input className="form-input" value={form.item_or_project} onChange={set('item_or_project')} placeholder="e.g. School bags and stationery" /></div>
        <div className="form-group"><label className="form-label">Quantity</label><input className="form-input" type="number" value={form.quantity} onChange={set('quantity')} min="1" step="1" /></div>
        <div className="form-group"><label className="form-label">Unit Price (GH₵)</label><input className="form-input" type="number" value={form.unit_price} onChange={set('unit_price')} min="0" step="0.01" /></div>
        <div className="form-group"><label className="form-label">Total Amount (GH₵)</label><input className="form-input" type="number" value={form.total_amount} onChange={set('total_amount')} min="0" step="0.01" style={{ fontWeight: 700, color: 'var(--blue)' }} /></div>
        <div className="form-group"><label className="form-label">HOSA Representative</label><input className="form-input" value={form.hosa_rep} onChange={set('hosa_rep')} placeholder="Name of HOSA rep who delivered" /></div>
        <div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" value={form.date} onChange={set('date')} /></div>
        <div className="form-group full"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={set('notes')} placeholder="Any additional information…" /></div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy ? <span className="loader" /> : <><i className="fas fa-save" /> {p ? 'Update' : 'Record'} Project</>}
        </button>
      </div>
    </>
  );
}
