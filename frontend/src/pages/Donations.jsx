// src/pages/Donations.jsx
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { Modal, ConfirmDialog, EmptyState, StatusPill, SearchSelect } from '../components/UI';
import { fmtDate, fmtAmt, initials, genReceiptHtml, todayISO } from '../utils/helpers';
import api from '../utils/api';

export default function Donations() {
  const { cache, fetchDonations, fetchMembers, fetchPrograms, getLevel } = useApp();
  const [search,  setSearch]  = useState('');
  const [statusF, setStatusF] = useState('');
  const [modal,   setModal]   = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy,    setBusy]    = useState(false);
  const level = getLevel();

  useEffect(() => { fetchDonations(true); fetchMembers(); fetchPrograms(); }, []);

  const filtered = cache.donations.filter(d => {
    const q = search.toLowerCase();
    if (q && !(d.beneficiary_name || '').toLowerCase().includes(q) && !(d.program_name || '').toLowerCase().includes(q) && !(d.donor_name || '').toLowerCase().includes(q)) return false;
    if (statusF && d.status !== statusF) return false;
    return true;
  });

  async function saveDonation(data, id) {
    setBusy(true);
    const r = id ? await api.editDonation(id, data) : await api.addDonation(data);
    setBusy(false);
    if (!r.success) { toast.error(r.error); return; }
    toast.success(id ? 'Donation updated!' : 'Donation recorded! ID: ' + r.donationId);
    setModal(null); setEditing(null);
    fetchDonations(true);
  }

  async function deleteDonation(id) {
    const r = await api.deleteDonation(id);
    if (r.success) { toast.success('Donation deleted.'); setConfirm(null); fetchDonations(true); }
    else toast.error(r.error);
  }

  const viewReceipt = d => {
    const win = window.open('', '_blank');
    win.document.write(genReceiptHtml(d.donation_id, 'Donation', d.beneficiary_name, d.program_name, d.amount, d.donor_name, d.date, null));
    win.document.close();
  };

  return (
    <div>
      <div className="filter-bar">
        <div className="search-box"><i className="fas fa-search" /><input placeholder="Search donations…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="filter-select" value={statusF} onChange={e => setStatusF(e.target.value)}><option value="">All Status</option><option>Completed</option><option>Pending</option></select>
        {level >= 3 && <button className="btn btn-primary" onClick={() => { setEditing(null); setModal('form'); }}><i className="fas fa-plus" /> Record Donation</button>}
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Donation ID</th><th>Program</th><th>Beneficiary</th><th>Amount</th><th>Date</th><th>Donated By</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {!filtered.length && <tr><td colSpan={8}><EmptyState icon="fa-hand-holding-heart" title="No donations recorded" sub="Admins can record donations using the button above" /></td></tr>}
            {filtered.map(d => (
              <tr key={d.donation_id}>
                <td><span className="id-col" style={{ color: 'var(--blue)' }}>{d.donation_id}</span></td>
                <td style={{ fontSize: 12, maxWidth: 160 }}>{d.program_name}</td>
                <td><div className="td-flex"><div className="av-sm">{initials(d.beneficiary_name)}</div><span style={{ fontWeight: 500 }}>{d.beneficiary_name}</span></div></td>
                <td><strong style={{ color: 'var(--blue)' }}>GH₵ {fmtAmt(d.amount)}</strong></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtDate(d.date)}</td>
                <td><div className="td-flex"><div className="av-sm" style={{ background: 'var(--gold-lt)', color: 'var(--gold-dk)' }}>{initials(d.donor_name)}</div><span style={{ fontSize: 12 }}>{d.donor_name}</span></div></td>
                <td><StatusPill status={d.status || 'Completed'} /></td>
                <td><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => viewReceipt(d)}><i className="fas fa-receipt" /></button>
                  {level >= 3 && <>
                    <button className="btn btn-outline btn-sm" onClick={() => { setEditing(d); setModal('form'); }}><i className="fas fa-edit" /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirm(d)}><i className="fas fa-trash" /></button>
                  </>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'form' && (
        <DonationForm members={cache.members} programs={cache.programs} donation={editing} onSave={saveDonation} onClose={() => { setModal(null); setEditing(null); }} busy={busy} />
      )}
      {confirm && (
        <ConfirmDialog
          title="Delete Donation"
          message={`Delete donation of GH₵ ${fmtAmt(confirm.amount)} to ${confirm.beneficiary_name}?`}
          subMsg="The associated receipt will also be removed."
          okLabel="Yes, Delete"
          onConfirm={() => deleteDonation(confirm.donation_id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function DonationForm({ members, programs, donation: d, onSave, onClose, busy }) {
  const { session } = useApp();
  const [prog,    setProg]    = useState(d?.program_name || '');
  const [beneVal, setBeneVal] = useState(d ? (d.beneficiary_member_id + '|' + d.beneficiary_name) : '');
  const [donorVal,setDonorVal]= useState(d ? (d.donor_member_id + '|' + d.donor_name) : '|HOSA (Association)');
  const [amount,  setAmount]  = useState(d?.amount || '');
  const [date,    setDate]    = useState(d?.date || todayISO());
  const [status,  setStatus]  = useState(d?.status || 'Completed');
  const [notes,   setNotes]   = useState(d?.notes || '');

  const memberItems = members.map(m => ({ value: m.member_id + '|' + m.full_name, label: m.full_name + (m.year_group ? ' · ' + m.year_group : '') }));
  const progItems   = programs.map(p => ({ value: p.title, label: `${p.title} (${p.status})` }));
  const donorItems  = [{ value: '|HOSA (Association)', label: 'HOSA (Association)' }, ...memberItems];

  const submit = () => {
    const [beneId, beneName]   = beneVal.split('|');
    const [donorId, donorName] = donorVal.split('|');
    if (!beneName || !amount || !prog || !date) { toast.error('Please fill all required fields.'); return; }
    onSave({
      program_name: prog, beneficiary_member_id: beneId, beneficiary_name: beneName,
      amount: parseFloat(amount), date, donor_member_id: donorId, donor_name: donorName,
      status, notes, recorded_by: session?.fullName || 'Admin',
    }, d?.donation_id);
  };

  return (
    <Modal title={d ? 'Edit Donation' : 'Record Donation'} onClose={onClose}>
      <div className="form-grid">
        <div className="form-group full"><label className="form-label">Program / Purpose *</label><SearchSelect items={progItems} value={prog} onChange={setProg} placeholder="Search or select program…" /></div>
        <div className="form-group full"><label className="form-label">Beneficiary (Member) *</label><SearchSelect items={memberItems} value={beneVal} onChange={setBeneVal} placeholder="Search member name…" /></div>
        <div className="form-group"><label className="form-label">Amount (GH₵) *</label><input className="form-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
        <div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="form-group full"><label className="form-label">Donated By</label><SearchSelect items={donorItems} value={donorVal} onChange={setDonorVal} placeholder="Search donor or HOSA…" /></div>
        <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={status} onChange={e => setStatus(e.target.value)}><option>Completed</option><option>Pending</option></select></div>
        <div className="form-group full"><label className="form-label">Notes</label><textarea className="form-textarea" style={{ minHeight: 60 }} value={notes} onChange={e => setNotes(e.target.value)} /></div>
      </div>
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy ? <span className="loader" /> : <><i className="fas fa-save" /> {d ? 'Update' : 'Record'} Donation</>}
        </button>
      </div>
    </Modal>
  );
}
