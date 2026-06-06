// src/pages/Contributions.jsx
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { Modal, ConfirmDialog, EmptyState, StatusPill, SearchSelect } from '../components/UI';
import { fmtDate, fmtAmt, initials, downloadCSV, genReceiptHtml, todayISO } from '../utils/helpers';
import api from '../utils/api';

// ── CSV IMPORT MODAL ──────────────────────────────────────
function CSVImportModal({ onClose, onImported, existingMembers }) {
  const [rows,     setRows]     = useState([]);
  const [parsed,   setParsed]   = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [results,  setResults]  = useState(null);

  function parseCSV(text) {
    const lines   = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row.'); return; }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,'').toLowerCase());
    const nameIdx  = headers.findIndex(h => h.includes('name'));
    const phoneIdx = headers.findIndex(h => h.includes('phone'));
    const emailIdx = headers.findIndex(h => h.includes('email'));
    const yearIdx  = headers.findIndex(h => h.includes('year'));
    const addrIdx  = headers.findIndex(h => h.includes('address') || h.includes('town'));

    if (nameIdx === -1) { toast.error('CSV must have a "full_name" column.'); return; }

    const existingNames = new Set(existingMembers.map(m => (m.full_name||'').toLowerCase().trim()));
    const parsed = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g,''));
      const name = cols[nameIdx] || '';
      return {
        full_name:  name,
        phone:      phoneIdx  >= 0 ? cols[phoneIdx]  || '' : '',
        email:      emailIdx  >= 0 ? cols[emailIdx]  || '' : '',
        year_group: yearIdx   >= 0 ? cols[yearIdx]   || '' : '',
        address:    addrIdx   >= 0 ? cols[addrIdx]   || '' : '',
        isDuplicate: existingNames.has(name.toLowerCase().trim()),
      };
    }).filter(r => r.full_name.trim() !== '');

    setRows(parsed);
    setParsed(true);
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => parseCSV(e.target.result);
    reader.readAsText(file);
  }

  async function importAll() {
    const toImport = rows.filter(r => !r.isDuplicate);
    if (!toImport.length) { toast.error('No new members to import (all are duplicates).'); return; }
    setBusy(true);
    // Use bulk endpoint — single API call instead of N sequential calls
    const r = await api.bulkAddMembers(toImport.map(({ isDuplicate, ...rest }) => rest));
    setBusy(false);
    if (!r.success) { toast.error(r.error || 'Import failed.'); return; }
    setResults({ added: r.added, failed: r.failed, skipped: rows.filter(r => r.isDuplicate).length + (r.skipped || 0) });
    onImported();
  }

  const newCount  = rows.filter(r => !r.isDuplicate).length;
  const dupCount  = rows.filter(r =>  r.isDuplicate).length;

  return (
    <Modal title="Import Members from CSV" onClose={onClose} large>
      {!parsed ? (
        <>
          <div style={{ background:'var(--blue-light)', border:'1px solid var(--blue-soft)', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:12, color:'var(--blue)', lineHeight:1.7 }}>
            <strong>Expected CSV format:</strong><br />
            <code style={{ fontFamily:'var(--font-mono)', fontSize:11, background:'rgba(26,58,107,.08)', padding:'4px 8px', borderRadius:4, display:'inline-block', marginTop:4 }}>
              full_name,phone,email,year_group,address
            </code><br />
            <span style={{ fontSize:11, color:'var(--g400)', marginTop:6, display:'block' }}>Only full_name is required. Other columns are optional.</span>
          </div>

          {/* Drag & Drop zone */}
          <div
            style={{ border:'2px dashed var(--g200)', borderRadius:'var(--rl)', padding:40, textAlign:'center', cursor:'pointer', background:'var(--g50)', transition:'.18s' }}
            onClick={() => document.getElementById('csv-file-input').click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--blue-mid)'; e.currentTarget.style.background='var(--blue-light)'; }}
            onDragLeave={e => { e.currentTarget.style.borderColor=''; e.currentTarget.style.background=''; }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor=''; e.currentTarget.style.background=''; handleFile(e.dataTransfer.files[0]); }}
          >
            <i className="fas fa-file-csv" style={{ fontSize:36, color:'var(--g400)', display:'block', marginBottom:10 }} />
            <div style={{ fontSize:14, fontWeight:600, color:'var(--g600)', marginBottom:4 }}>Click or drag &amp; drop your CSV file here</div>
            <div style={{ fontSize:12, color:'var(--g400)' }}>.csv or .txt files supported</div>
          </div>
          <input id="csv-file-input" type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])} />

          {/* Download sample */}
          <div style={{ textAlign:'center', marginTop:14 }}>
            <button className="btn btn-outline btn-sm" onClick={() => {
              const sample = 'full_name,phone,email,year_group,address\nKofi Mensah,0244123456,kofi@email.com,2005,Accra\nAma Boateng,0201234567,,2008,Kumasi';
              const blob = new Blob([sample], { type:'text/csv' });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement('a'); a.href=url; a.download='hosa_sample.csv'; a.click();
            }}>
              <i className="fas fa-download" /> Download Sample CSV
            </button>
          </div>
        </>
      ) : results ? (
        // Results screen
        <div style={{ textAlign:'center', padding:'20px 0' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--ok-bg)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:28, color:'var(--ok)' }}>
            <i className="fas fa-check-circle" />
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--g800)', marginBottom:16 }}>Import Complete!</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
            {[
              { label:'Added', val:results.added,   color:'var(--ok)',   bg:'var(--ok-bg)'    },
              { label:'Skipped (duplicates)', val:results.skipped, color:'var(--warn)', bg:'var(--warn-bg)'  },
              { label:'Failed',  val:results.failed,  color:'var(--err)',  bg:'var(--err-bg)'   },
            ].map(s => (
              <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:14, textAlign:'center' }}>
                <div style={{ fontSize:28, fontWeight:300, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:11, color:s.color, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={onClose}><i className="fas fa-check" /> Done</button>
        </div>
      ) : (
        // Preview screen
        <>
          {/* Summary bar */}
          <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
            <div style={{ background:'var(--ok-bg)', border:'1px solid #a8e0c0', borderRadius:8, padding:'8px 14px', fontSize:12, color:'var(--ok)', fontWeight:700 }}>
              <i className="fas fa-user-plus" style={{ marginRight:5 }} />{newCount} new members to import
            </div>
            {dupCount > 0 && (
              <div style={{ background:'var(--warn-bg)', border:'1px solid #f5d87a', borderRadius:8, padding:'8px 14px', fontSize:12, color:'var(--warn)', fontWeight:700 }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight:5 }} />{dupCount} duplicates will be skipped
              </div>
            )}
          </div>

          {/* Preview table */}
          <div className="table-wrap" style={{ maxHeight:320, overflowY:'auto', marginBottom:16 }}>
            <table>
              <thead>
                <tr><th>Status</th><th>Full Name</th><th>Phone</th><th>Email</th><th>Year Group</th><th>Address</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ background: r.isDuplicate ? '#FFF3CD' : '' }}>
                    <td>
                      {r.isDuplicate
                        ? <span className="pill pill-pending"><i className="fas fa-exclamation-triangle" style={{ marginRight:4 }} />Duplicate</span>
                        : <span className="pill pill-active"><i className="fas fa-check" style={{ marginRight:4 }} />New</span>}
                    </td>
                    <td style={{ fontWeight:600 }}>{r.full_name}</td>
                    <td style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>{r.phone||'—'}</td>
                    <td style={{ fontSize:12 }}>{r.email||'—'}</td>
                    <td>{r.year_group||'—'}</td>
                    <td style={{ fontSize:12 }}>{r.address||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => { setParsed(false); setRows([]); }}>← Re-upload</button>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={busy || newCount === 0} onClick={importAll}>
              {busy ? <span className="loader" /> : <><i className="fas fa-user-plus" /> Import {newCount} Member{newCount !== 1 ? 's' : ''}</>}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── DUPLICATE PAYMENT WARNING MODAL ─────────────────────
function DuplicateWarningModal({ existing, memberName, program, onProceed, onCancel }) {
  return (
    <div className="modal-overlay" style={{ zIndex:600 }} onClick={e => { if (e.target===e.currentTarget) onCancel(); }}>
      <div className="modal" style={{ maxWidth:480 }}>
        <div style={{ textAlign:'center', padding:'10px 0 6px' }}>
          <div style={{ width:60, height:60, borderRadius:'50%', background:'var(--warn-bg)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:26, color:'var(--warn)' }}>
            <i className="fas fa-exclamation-triangle" />
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--g800)', marginBottom:8 }}>Possible Duplicate Payment</div>
          <div style={{ fontSize:13, color:'var(--g600)', lineHeight:1.65, marginBottom:16 }}>
            <strong>{memberName}</strong> appears to have already paid for <strong>{program}</strong>.
          </div>

          {/* Existing record */}
          <div style={{ background:'var(--warn-bg)', border:'1px solid #f5d87a', borderRadius:12, padding:14, marginBottom:16, textAlign:'left' }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--warn)', marginBottom:8 }}>
              <i className="fas fa-receipt" style={{ marginRight:5 }} />Existing Record Found
            </div>
            {existing.map((c, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom: i < existing.length-1 ? '1px solid rgba(183,105,10,.15)' : 'none' }}>
                <div>
                  <div style={{ fontWeight:600, color:'var(--g800)' }}>{c.receipt_id}</div>
                  <div style={{ color:'var(--g400)', fontSize:11 }}>Paid on {fmtDate(c.date_paid)} · by {c.recorded_by}</div>
                </div>
                <div style={{ fontWeight:700, color:'var(--blue)' }}>GH₵ {fmtAmt(c.amount)}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize:12, color:'var(--g400)', marginBottom:20, lineHeight:1.6 }}>
            If this is a <strong>second installment</strong> or a different payment, click <em>Proceed Anyway</em>. Otherwise click <em>Cancel</em> to avoid a duplicate.
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button className="btn btn-outline" style={{ minWidth:120 }} onClick={onCancel}>
              <i className="fas fa-times" /> Cancel
            </button>
            <button className="btn" style={{ minWidth:160, background:'var(--warn)', color:'#fff', border:'none' }} onClick={onProceed}>
              <i className="fas fa-check" /> Proceed Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── MAIN CONTRIBUTIONS PAGE ───────────────────────────────
export default function Contributions() {
  const { cache, fetchContributions, fetchMembers, fetchPrograms, getLevel } = useApp();
  const [statusF,       setStatusF]       = useState('');
  const [modal,         setModal]         = useState(false);
  const [csvModal,      setCsvModal]      = useState(false);
  const [confirm,       setConfirm]       = useState(null);
  const [search,        setSearch]        = useState('');
  const [searchResult,  setSearchResult]  = useState(null);
  const [busy,          setBusy]          = useState(false);
  const [dupWarning,    setDupWarning]    = useState(null); // { existing, pendingData }
  const level = getLevel();

  useEffect(() => { fetchContributions(true); fetchMembers(); fetchPrograms(); }, []);

  const filtered = cache.contributions.filter(c => !statusF || c.status === statusF);

  async function doSearch() {
    if (!search.trim()) { setSearchResult(null); return; }
    const r = await api.searchContributions(search.trim());
    setSearchResult(r.success ? r : null);
    if (!r.success) toast.error(r.error);
  }

  // ── Save contribution with duplicate check ──────────────
  async function saveContrib(data) {
    // Check for existing payment for same member + program
    const existing = cache.contributions.filter(c =>
      c.member_id    === data.member_id &&
      (c.program_name || '').toLowerCase().trim() === (data.program_name || '').toLowerCase().trim() &&
      c.status === 'Paid'
    );

    if (existing.length > 0) {
      // Show duplicate warning — don't proceed yet
      setDupWarning({ existing, pendingData: data });
      return;
    }

    // No duplicate — save directly
    await doSaveContrib(data);
  }

  async function doSaveContrib(data) {
    setBusy(true);
    const r = await api.addContribution(data);
    setBusy(false);
    if (!r.success) { toast.error(r.error); return; }
    toast.success('Contribution saved! Receipt: ' + r.receiptId);
    setModal(false);
    setDupWarning(null);
    fetchContributions(true);
    // Auto-show receipt
    setTimeout(() => {
      const win = window.open('', '_blank');
      win.document.write(genReceiptHtml(r.receiptId, 'Contribution', data.member_name, data.program_name, data.amount, data.recorded_by, data.date_paid, null));
      win.document.close();
    }, 600);
  }

  async function deleteContrib(id) {
    const r = await api.deleteContribution(id);
    if (r.success) { toast.success('Contribution deleted.'); setConfirm(null); fetchContributions(true); }
    else toast.error(r.error);
  }

  return (
    <div>
      {/* Duplicate warning overlay */}
      {dupWarning && (
        <DuplicateWarningModal
          existing={dupWarning.existing}
          memberName={dupWarning.pendingData.member_name}
          program={dupWarning.pendingData.program_name}
          onProceed={() => doSaveContrib(dupWarning.pendingData)}
          onCancel={() => setDupWarning(null)}
        />
      )}

      {/* CSV Import Modal */}
      {csvModal && (
        <CSVImportModal
          existingMembers={cache.members}
          onClose={() => setCsvModal(false)}
          onImported={() => { fetchMembers(true); }}
        />
      )}

      {/* Smart Search */}
      <div className="card" style={{ marginBottom:18 }}>
        <div className="card-header">
          <div className="card-title"><i className="fas fa-search-dollar" style={{ color:'var(--gold)', marginRight:7 }} />Smart Contribution Search</div>
          {/* CSV Import button — secretary and above */}
          {level >= 3 && (
            <button className="btn btn-outline btn-sm" onClick={() => setCsvModal(true)}>
              <i className="fas fa-file-csv" /> Import Members CSV
            </button>
          )}
        </div>
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <div className="search-box" style={{ flex:1, minWidth:220 }}>
            <i className="fas fa-search" />
            <input placeholder="Search by program or event name…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && doSearch()} />
          </div>
          <button className="btn btn-primary" onClick={doSearch}><i className="fas fa-search" /> Search</button>
        </div>
        {searchResult && <SearchResultPanel r={searchResult} />}
      </div>

      {/* All Records */}
      <div className="card" style={{ padding:0 }}>
        <div style={{ padding:'16px 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div className="card-title" style={{ paddingBottom:12 }}><i className="fas fa-list" style={{ color:'var(--blue)', marginRight:7 }} />All Contribution Records</div>
          <div style={{ display:'flex', gap:8, paddingBottom:12, flexWrap:'wrap' }}>
            <select className="filter-select" value={statusF} onChange={e => setStatusF(e.target.value)}>
              <option value="">All Status</option><option>Paid</option><option>Unpaid</option><option>Pending</option>
            </select>
            {level >= 3 && <button className="btn btn-outline btn-sm" onClick={() => setModal(true)}><i className="fas fa-plus" /> Add Record</button>}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Receipt No.</th><th>Member</th><th>Program</th><th>Amount</th><th>Date Paid</th><th>Recorded By</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {!filtered.length && <tr><td colSpan={8}><EmptyState icon="fa-coins" title="No contributions recorded" /></td></tr>}
              {filtered.map(c => (
                <tr key={c.receipt_id}>
                  <td><span className="id-col" style={{ color:'var(--blue)' }}>{c.receipt_id}</span></td>
                  <td><div className="td-flex"><div className="av-sm">{initials(c.member_name)}</div><span style={{ fontWeight:500 }}>{c.member_name}</span></div></td>
                  <td style={{ fontSize:12, maxWidth:180 }}>{c.program_name}</td>
                  <td><strong style={{ color:'var(--blue)' }}>GH₵ {fmtAmt(c.amount)}</strong></td>
                  <td style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>{fmtDate(c.date_paid)}</td>
                  <td style={{ fontSize:12, color:'var(--g400)' }}>{c.recorded_by}</td>
                  <td><StatusPill status={c.status} /></td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => {
                        const win = window.open('', '_blank');
                        win.document.write(genReceiptHtml(c.receipt_id,'Contribution',c.member_name,c.program_name,c.amount,c.recorded_by,c.date_paid,null));
                        win.document.close();
                      }}><i className="fas fa-receipt" /></button>
                      {level >= 3 && <button className="btn btn-danger btn-sm" onClick={() => setConfirm(c)}><i className="fas fa-trash" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <ContribForm members={cache.members} programs={cache.programs} onSave={saveContrib} onClose={() => setModal(false)} busy={busy} />}
      {confirm && (
        <ConfirmDialog
          title="Delete Contribution"
          message={`Delete contribution record for "${confirm.program_name}" for ${confirm.member_name}?`}
          subMsg="The linked receipt will also be permanently removed."
          okLabel="Yes, Delete"
          onConfirm={() => deleteContrib(confirm.receipt_id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function SearchResultPanel({ r }) {
  return (
    <div style={{ background:'var(--blue-light)', border:'1px solid var(--blue-soft)', borderRadius:12, padding:16 }}>
      <div style={{ fontSize:13, fontWeight:700, color:'var(--blue)', marginBottom:12 }}><i className="fas fa-search" style={{ marginRight:6 }} />"{r.query}"</div>
      <div style={{ fontSize:13, color:'var(--g600)', marginBottom:14, lineHeight:1.6 }}>{r.summary}</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
        <div style={{ background:'var(--ok-bg)', border:'1px solid #A8E0C0', borderRadius:10, padding:14, textAlign:'center' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:'var(--ok)', marginBottom:4 }}>Paid ({r.paidCount})</div>
          <div style={{ fontSize:32, fontWeight:300, color:'var(--ok)' }}>{r.paidCount}</div>
          <div style={{ fontSize:11, color:'var(--g400)' }}>{r.paidPct}%</div>
        </div>
        <div style={{ background:'var(--err-bg)', border:'1px solid #F5C6C1', borderRadius:10, padding:14, textAlign:'center' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:'var(--err)', marginBottom:4 }}>Unpaid ({r.unpaidCount})</div>
          <div style={{ fontSize:32, fontWeight:300, color:'var(--err)' }}>{r.unpaidCount}</div>
          <div style={{ fontSize:11, color:'var(--g400)' }}>{r.unpaidPct}%</div>
        </div>
      </div>
      <div style={{ height:6, background:'var(--g100)', borderRadius:3, marginBottom:14, overflow:'hidden' }}>
        <div style={{ height:'100%', width:r.paidPct+'%', background:'linear-gradient(90deg,var(--blue),var(--blue-mid))', borderRadius:3 }} />
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:'var(--ok)', marginBottom:6 }}>Total Collected: GH₵ {fmtAmt(r.totalAmount)}</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div>
          <div style={{ fontSize:10.5, fontWeight:700, textTransform:'uppercase', color:'var(--ok)', marginBottom:8 }}>Paid Members</div>
          {r.paidList.map(p => (
            <div key={p.memberId} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid rgba(0,0,0,.05)' }}>
              <div className="av-sm">{initials(p.memberName)}</div>
              <div><div style={{ fontSize:12, fontWeight:500 }}>{p.memberName}</div><div style={{ fontSize:11, color:'var(--g400)', fontFamily:'var(--font-mono)' }}>GH₵{fmtAmt(p.amount)}</div></div>
            </div>
          ))}
          {!r.paidList.length && <div style={{ fontSize:12, color:'var(--g400)' }}>None</div>}
        </div>
        <div>
          <div style={{ fontSize:10.5, fontWeight:700, textTransform:'uppercase', color:'var(--err)', marginBottom:8 }}>Unpaid Members</div>
          {r.unpaidList.slice(0,15).map(p => (
            <div key={p.memberId} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid rgba(0,0,0,.05)' }}>
              <div className="av-sm" style={{ background:'var(--err-bg)', color:'var(--err)' }}>{initials(p.memberName)}</div>
              <span style={{ fontSize:12, fontWeight:500 }}>{p.memberName}</span>
            </div>
          ))}
          {r.unpaidList.length > 15 && <div style={{ fontSize:11, color:'var(--g400)', marginTop:6 }}>+{r.unpaidList.length-15} more…</div>}
          {!r.unpaidList.length && <div style={{ fontSize:12, color:'var(--g400)' }}>All paid! 🎉</div>}
        </div>
      </div>
    </div>
  );
}

function ContribForm({ members, programs, onSave, onClose, busy }) {
  const { session } = useApp();
  const [memberId,   setMemberId]   = useState('');
  const [memberName, setMemberName] = useState('');
  const [program,    setProgram]    = useState('');
  const [amount,     setAmount]     = useState('');
  const [date,       setDate]       = useState(todayISO());
  const [status,     setStatus]     = useState('Paid');
  const [by,         setBy]         = useState(session?.primaryRole || 'Secretary');
  const [notes,      setNotes]      = useState('');

  const memberItems = members.map(m => ({ value:m.member_id+'|'+m.full_name, label:m.full_name+(m.year_group?' · '+m.year_group:'') }));
  const progItems   = [
    ...programs.map(p => ({ value:p.title, label:`${p.title} (${p.status})` })),
    { value:'General Dues', label:'General Dues' },
    { value:'Welfare Fund', label:'Welfare Fund' },
    { value:'Other', label:'Other' },
  ];

  const handleMember = v => { const [id,name]=v.split('|'); setMemberId(id); setMemberName(name); };

  const submit = () => {
    if (!memberName || !program || !amount || !date) { toast.error('Please fill all required fields.'); return; }
    onSave({ member_id:memberId, member_name:memberName, program_name:program, amount:parseFloat(amount), date_paid:date, status, recorded_by:by, notes });
  };

  return (
    <Modal title="Add Contribution" onClose={onClose}>
      <div className="form-grid">
        <div className="form-group"><label className="form-label">Member *</label><SearchSelect items={memberItems} value={memberId+'|'+memberName} onChange={handleMember} placeholder="Search member name…" /></div>
        <div className="form-group"><label className="form-label">Program / Event *</label><SearchSelect items={progItems} value={program} onChange={setProgram} placeholder="Search or select program…" /></div>
        <div className="form-group"><label className="form-label">Amount (GH₵) *</label><input className="form-input" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
        <div className="form-group"><label className="form-label">Date Paid *</label><input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={status} onChange={e=>setStatus(e.target.value)}><option>Paid</option><option>Pending</option><option>Unpaid</option></select></div>
        <div className="form-group"><label className="form-label">Recorded By</label><input className="form-input" value={by} onChange={e=>setBy(e.target.value)} /></div>
        <div className="form-group full"><label className="form-label">Notes</label><input className="form-input" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional notes" /></div>
      </div>
      <div style={{ background:'var(--ok-bg)', borderRadius:8, padding:10, fontSize:11, color:'var(--ok)', marginBottom:14 }}>
        <i className="fas fa-info-circle" style={{ marginRight:5 }} />A receipt is automatically generated after saving.
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy ? <span className="loader" /> : <><i className="fas fa-save" /> Save &amp; Generate Receipt</>}
        </button>
      </div>
    </Modal>
  );
}
