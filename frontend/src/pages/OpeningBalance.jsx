// src/pages/OpeningBalance.jsx
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { Modal, ConfirmDialog, EmptyState } from '../components/UI';
import { fmtDate, fmtAmt, downloadCSV } from '../utils/helpers';
import api from '../utils/api';

export default function OpeningBalance() {
  const { cache, fetchOpeningBalances, fetchContributions, fetchDonations, fetchProjects, getLevel } = useApp();
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [search,  setSearch]  = useState('');
  const [yearF,   setYearF]   = useState('');
  const [sort,    setSort]    = useState('desc');
  const [busy,    setBusy]    = useState(false);
  const level = getLevel();

  useEffect(() => {
    fetchOpeningBalances(true);
    fetchContributions(); fetchDonations(); fetchProjects();
  }, []);

  const currYear = new Date().getFullYear().toString();
  const data = cache.openingBalances;

  // Summary stats
  const currRecord = data.find(b => String(b.year) === currYear);
  const prevRecord = data.find(b => String(b.year) === String(parseInt(currYear)-1));
  const currBal    = currRecord ? parseFloat(currRecord.opening_balance||0) : 0;
  const prevBal    = prevRecord ? parseFloat(prevRecord.opening_balance||0) : 0;
  const change     = currBal - prevBal;
  const totalContribs  = cache.contributions.reduce((s,c)=>s+parseFloat(c.amount||0),0);
  const totalDonations = cache.donations.reduce((s,d)=>s+parseFloat(d.amount||0),0);
  const totalProjects  = (cache.projects||[]).reduce((s,p)=>s+parseFloat(p.total_amount||0),0);
  const closingBal     = currBal + totalContribs - totalDonations - totalProjects;

  // Filter & sort
  let displayed = data.filter(b => {
    if (yearF && String(b.year) !== yearF) return false;
    if (search && !String(b.year).includes(search) && !(b.description||'').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  displayed = [...displayed].sort((a,b) => sort === 'asc' ? a.year - b.year : b.year - a.year);
  const years = [...new Set(data.map(b => b.year))].sort((a,b) => b-a);

  async function save(form, id) {
    setBusy(true);
    const r = id ? await api.editOpeningBalance(id, form) : await api.addOpeningBalance(form);
    setBusy(false);
    if (!r.success) { toast.error(r.error); return; }
    toast.success(id ? 'Opening balance updated!' : 'Opening balance set for ' + form.year + '!');
    setModal(false); setEditing(null);
    fetchOpeningBalances(true);
  }

  async function del(id, year) {
    const r = await api.deleteOpeningBalance(id);
    if (r.success) { toast.success('Opening balance for ' + year + ' deleted.'); setConfirm(null); fetchOpeningBalances(true); }
    else toast.error(r.error);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--g800)', marginBottom: 3 }}>
            <i className="fas fa-vault" style={{ color: 'var(--blue)', marginRight: 8 }} />Opening Balance Register
          </div>
          <div style={{ fontSize: 12, color: 'var(--g400)', lineHeight: 1.6, maxWidth: 520 }}>
            Record the association's funds carried forward from previous years. The opening balance is the starting point for each financial year's net position.
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label:'Years Recorded',           val: data.length,  icon:'fa-calendar-check', si:'si-blue' },
          { label:`Current Year (${currYear})`,val:(currBal<0?'−':'')+'GH₵ '+fmtAmt(Math.abs(currBal)), icon:'fa-coins', si:'si-gold', sub: currRecord?'Opening balance':'Not set yet' },
          { label:`Prev Year (${parseInt(currYear)-1})`, val:(prevBal<0?'−':'')+'GH₵ '+fmtAmt(Math.abs(prevBal)), icon:'fa-chart-line', si:'si-ok', sub: prevRecord?'Previous balance':'Not recorded' },
          { label:'Year-on-Year Change', val:(change>=0?'+':'−')+'GH₵ '+fmtAmt(Math.abs(change)), icon:`fa-arrow-trend-${change>=0?'up':'down'}`, si: change>=0?'si-ok':'si-err' },
        ].map((s,i)=>(
          <div key={i} className="stat-card" style={{ margin:0 }}>
            <div className={`stat-icon ${s.si}`}><i className={`fas ${s.icon}`} /></div>
            <div className="stat-lbl">{s.label}</div>
            <div className="stat-val" style={{ fontSize: 18 }}>{s.val}</div>
            {s.sub && <div className="stat-sub">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Current year highlight */}
      <div style={{ background: 'linear-gradient(135deg,var(--blue) 0%,var(--blue-mid) 100%)', borderRadius: 'var(--rl)', padding: '20px 24px', color: '#fff', boxShadow: 'var(--sh-lg)', marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
          <i className="fas fa-star" style={{ marginRight: 5 }} />{currYear} Financial Year Overview
        </div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 12 }}>
          {[
            { label: 'Opening Balance', val: (currBal<0?'−':'')+'GH₵ '+fmtAmt(Math.abs(currBal)), color:'#fff' },
            { label: '+ Contributions', val: 'GH₵ '+fmtAmt(totalContribs), color:'#A8E8C8' },
            { label: '− Expenditure',   val: 'GH₵ '+fmtAmt(totalDonations+totalProjects), color:'#F5A0A0' },
          ].map(s => (
            <div key={s.label} style={{ borderLeft: s.label !== 'Opening Balance' ? '1px solid rgba(255,255,255,.15)' : 'none', paddingLeft: s.label !== 'Opening Balance' ? 28 : 0 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,.55)', marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 300, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,.12)', borderRadius: 10, padding: '10px 16px', display: 'inline-block' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--gold)', fontWeight: 700, marginBottom: 3 }}>Projected Closing Balance</div>
          <div style={{ fontSize: 24, fontWeight: 300, color: closingBal >= 0 ? '#A8E8C8' : '#F5A0A0' }}>
            {closingBal < 0 ? '−' : ''}GH₵ {fmtAmt(Math.abs(closingBal))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16, background: '#fff', border: '1px solid var(--g100)', borderRadius: 'var(--rl)', padding: '14px 18px', boxShadow: 'var(--sh)' }}>
        <div className="search-box" style={{ flex: 1, minWidth: 180 }}>
          <i className="fas fa-search" /><input placeholder="Search year or description…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={yearF} onChange={e => setYearF(e.target.value)}>
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="filter-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="desc">Newest First</option><option value="asc">Oldest First</option>
        </select>
        {level >= 3 && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setModal(true); }}>
            <i className="fas fa-plus" /> Add Opening Balance
          </button>
        )}
        <button className="btn btn-outline" onClick={() => {
          const headers = ['Balance ID','Year','Opening Balance (GH₵)','Description','Recorded By'];
          const rows    = data.map(b => [b.balance_id, b.year, b.opening_balance, b.description, b.recorded_by]);
          downloadCSV([headers,...rows], 'HOSA_Opening_Balance_Register.csv');
        }}><i className="fas fa-file-excel" /> Export CSV</button>
      </div>

      {/* Timeline */}
      {!displayed.length && <EmptyState icon="fa-vault" title="No opening balance records found" sub="Add the association's opening balance to start tracking your financial position" />}

      {displayed.map((b, idx) => {
        const isCurrent = String(b.year) === currYear;
        const amount    = parseFloat(b.opening_balance||0);
        const isNeg     = amount < 0;
        const borderColor = isCurrent ? 'var(--blue)' : 'var(--g200)';
        return (
          <div key={b.balance_id} style={{ display: 'flex', gap: 0, marginBottom: 0, alignItems: 'stretch' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: isCurrent ? 'var(--blue)' : 'var(--g200)', border: '3px solid #fff', boxShadow: `0 0 0 2px ${borderColor}`, marginTop: 20, flexShrink: 0, zIndex: 1 }} />
              {idx < displayed.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--g100)', marginTop: 2 }} />}
            </div>
            <div style={{ flex: 1, marginLeft: 10, marginBottom: 14, background: isCurrent ? 'var(--blue-light)' : '#fff', border: `1.5px solid ${borderColor}`, borderRadius: 'var(--rl)', padding: '16px 20px', boxShadow: 'var(--sh)', transition: '.18s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: isCurrent ? 'var(--blue)' : 'var(--g800)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {b.year} Financial Year
                    {isCurrent && <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: 'var(--blue)', color: '#fff' }}>Current Year</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--g400)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span><i className="fas fa-user" style={{ marginRight: 4, opacity: .6 }} />{b.recorded_by||'—'}</span>
                    <span><i className="fas fa-clock" style={{ marginRight: 4, opacity: .6 }} />{fmtDate(b.created_at)}</span>
                    <span className="id-col">{b.balance_id}</span>
                  </div>
                  {b.description && <div style={{ fontSize: 12, color: 'var(--g600)', marginTop: 8, background: 'var(--g50)', borderRadius: 7, padding: '8px 12px', borderLeft: `3px solid ${borderColor}` }}>{b.description}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ background: isNeg ? 'var(--err-bg)' : isCurrent ? 'var(--blue)' : 'var(--ok-bg)', borderRadius: 12, padding: '10px 18px', display: 'inline-block', marginBottom: 8 }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700, color: isNeg ? 'var(--err)' : isCurrent ? 'var(--gold)' : 'var(--ok)', marginBottom: 3 }}>Opening Balance</div>
                    <div style={{ fontSize: 24, fontWeight: 300, color: isNeg ? 'var(--err)' : isCurrent ? '#fff' : 'var(--ok)' }}>
                      {isNeg ? '−' : ''}GH₵ {fmtAmt(Math.abs(amount))}
                    </div>
                  </div>
                  {level >= 3 && (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => { setEditing(b); setModal(true); }}><i className="fas fa-edit" /> Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirm(b)}><i className="fas fa-trash" /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {modal && (
        <Modal title={editing ? 'Edit Opening Balance' : 'Set Opening Balance'} onClose={() => { setModal(false); setEditing(null); }}>
          <OBForm ob={editing} onSave={save} busy={busy} existingYears={data.map(b=>String(b.year))} />
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog title="Delete Opening Balance" message={`Delete the opening balance record for ${confirm.year}? This will affect all financial calculations for that year.`} okLabel="Yes, Delete" onConfirm={() => del(confirm.balance_id, confirm.year)} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

function OBForm({ ob, onSave, busy, existingYears }) {
  const { session } = useApp();
  const currYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, i) => currYear + 2 - i);
  const [form, setForm] = useState({
    year:            ob?.year            || currYear,
    opening_balance: ob?.opening_balance || '',
    description:     ob?.description     || '',
    recorded_by:     ob?.recorded_by     || (session?.fullName || 'Admin'),
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    if (!form.year) { toast.error('Year is required.'); return; }
    if (form.opening_balance === '' || form.opening_balance === undefined) { toast.error('Opening balance amount is required.'); return; }
    onSave({ ...form, opening_balance: parseFloat(form.opening_balance)||0 }, ob?.balance_id);
  };
  return (
    <>
      <div style={{ background: 'var(--blue-light)', border: '1px solid var(--blue-soft)', borderRadius: 10, padding: '12px 14px', marginBottom: 18, fontSize: 12, color: 'var(--blue)', lineHeight: 1.65 }}>
        <i className="fas fa-info-circle" style={{ marginRight: 5 }} />The opening balance is the total funds the association had at the <strong>start</strong> of the selected financial year — typically carried forward from the previous year's closing balance.
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Financial Year *</label>
          {ob ? (
            <input className="form-input" value={ob.year} readOnly style={{ background: 'var(--g50)', fontWeight: 700, color: 'var(--blue)' }} />
          ) : (
            <select className="form-select" value={form.year} onChange={set('year')}>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Opening Balance (GH₵) *</label>
          <input className="form-input" type="number" value={form.opening_balance} onChange={set('opening_balance')} placeholder="e.g. 5000.00" step="0.01" style={{ fontSize: 16, fontWeight: 600, color: 'var(--blue)' }} />
        </div>
        <div className="form-group full">
          <label className="form-label">Description / Notes <span style={{ color: 'var(--g400)', fontWeight: 400 }}>(optional)</span></label>
          <textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="e.g. Balance from 2023 AGM treasury report…" style={{ minHeight: 70 }} />
        </div>
        <div className="form-group full">
          <label className="form-label">Recorded By</label>
          <input className="form-input" value={form.recorded_by} onChange={set('recorded_by')} />
        </div>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy ? <span className="loader" /> : <><i className="fas fa-save" /> {ob ? 'Update' : 'Set'} Opening Balance</>}
        </button>
      </div>
    </>
  );
}
