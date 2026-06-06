// src/pages/MyProfile.jsx
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { RolePill, StatusPill, EmptyState, PageLoader } from '../components/UI';
import { initials, fmtDate, fmtAmt, roleClass } from '../utils/helpers';
import api from '../utils/api';

export default function MyProfile() {
  const { session, getLevel } = useApp();
  const [member, setMember] = useState(null);
  const [contribs,setContribs] = useState([]);
  const [donations,setDonations] = useState([]);
  const [form, setForm] = useState({});
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const memberId = session?.memberId;

  useEffect(() => { load(); }, [memberId]);

  async function load() {
    if (!memberId) return;
    const [mRes, cRes, dRes] = await Promise.all([
      api.getMember(memberId),
      api.getMemberContributions(memberId),
      api.getDonations(memberId),
    ]);
    if (mRes.success) {
      setMember(mRes.member);
      setForm({
        full_name:  mRes.member.full_name  || '',
        phone:      mRes.member.phone      || '',
        email:      mRes.member.email      || '',
        year_group: mRes.member.year_group || '',
        address:    mRes.member.address    || '',
      });
    }
    if (cRes.success) setContribs(cRes.data || []);
    if (dRes.success) setDonations((dRes.data || []).filter(d => d.beneficiary_member_id === memberId));
  }

  async function save() {
    if (!form.full_name?.trim()) { toast.error('Full name cannot be empty.'); return; }
    setBusy(true);
    const r = await api.editMember(memberId, { ...form, performedBy: session?.fullName });
    if (!r.success) { toast.error(r.error); setBusy(false); return; }

    if (oldPass && newPass) {
      if (newPass.length < 6) { toast.error('New password must be at least 6 characters.'); setBusy(false); return; }
      const pr = await api.changePassword(oldPass, newPass);
      if (!pr.success) { toast.error(pr.error); setBusy(false); return; }
      toast.success('Profile and password updated!');
    } else {
      toast.success('Profile updated successfully!');
    }
    setBusy(false);
    setSaved(true);
    setOldPass(''); setNewPass('');
    setTimeout(() => setSaved(false), 3000);
    load();
  }

  if (!member) return <PageLoader />;

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const thisYear = new Date().getFullYear().toString();
  const allTime  = contribs.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
  const yearTotal = contribs.filter(c => {
    const ds = c.date_paid || c.created_at || '';
    return ds.toString().startsWith(thisYear) || ds.toString().endsWith('/' + thisYear);
  }).filter(c => c.status === 'Paid').reduce((s, c) => s + parseFloat(c.amount || 0), 0);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 18, marginBottom: 18 }} id="profileTopGrid">
        {/* Avatar + Info */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%', background: 'var(--blue)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700,
              margin: '0 auto', border: '4px solid var(--gold)', overflow: 'hidden',
            }}>
              {member.photo_url ? <img src={member.photo_url} alt={member.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(member.full_name)}
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--g800)', marginBottom: 4 }}>{member.full_name}</div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--g400)', marginBottom: 10 }}>{member.member_id}</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            <RolePill role={member.primaryRole} />
            {member.executiveRoles && <span style={{ fontSize: 10, padding: '3px 10px', background: 'var(--gold-lt)', color: 'var(--gold-dk)', borderRadius: 4, fontWeight: 700 }}>{member.executiveRoles}</span>}
          </div>
          <div style={{ borderTop: '1px solid var(--g100)', paddingTop: 14 }}>
            {[
              { icon: 'fa-phone', label: 'Phone', val: member.phone || '—' },
              { icon: 'fa-envelope', label: 'Email', val: member.email || '—' },
              { icon: 'fa-graduation-cap', label: 'Year Group', val: member.year_group || '—' },
              { icon: 'fa-map-marker-alt', label: 'Address', val: member.address || '—' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0', borderBottom: '1px solid var(--g50)', textAlign: 'left' }}>
                <i className={`fas ${r.icon}`} style={{ width: 14, color: 'var(--blue-mid)', fontSize: 12, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--g400)', width: 70, flexShrink: 0 }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--g800)', wordBreak: 'break-all' }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Form */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="fas fa-edit" style={{ color: 'var(--blue)', marginRight: 7 }} />Edit My Details</div>
            {saved && <span style={{ fontSize: 11, color: 'var(--ok)' }}><i className="fas fa-check-circle" /> Saved</span>}
          </div>
          <div className="form-grid">
            <div className="form-group full"><label className="form-label">Full Name *</label><input className="form-input" value={form.full_name || ''} onChange={set('full_name')} placeholder="Your full legal name" /></div>
            <div className="form-group"><label className="form-label">Phone Number</label><input className="form-input" value={form.phone || ''} onChange={set('phone')} placeholder="0244-000-000" /></div>
            <div className="form-group"><label className="form-label">Email Address</label><input className="form-input" type="email" value={form.email || ''} onChange={set('email')} placeholder="you@example.com" /></div>
            <div className="form-group"><label className="form-label">Year Group</label><input className="form-input" value={form.year_group || ''} onChange={set('year_group')} placeholder="e.g. 2005" /></div>
            <div className="form-group"><label className="form-label">Address / Town</label><input className="form-input" value={form.address || ''} onChange={set('address')} placeholder="City or town" /></div>
          </div>

          {/* Admin fields */}
          <div style={{ background: 'var(--g50)', border: '1px solid var(--g100)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g400)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
              <i className="fas fa-lock" style={{ marginRight: 5 }} />Admin-Controlled Fields
            </div>
            {[
              { label: 'System Role', val: <RolePill role={member.primaryRole} /> },
              { label: 'Executive Position', val: <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue-mid)' }}>{member.executiveRoles || '—'}</span> },
              { label: 'Account Status', val: <StatusPill status={member.userStatus || 'Pending Setup'} /> },
              { label: 'Member Since', val: <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtDate(member.created_at)}</span> },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: 'var(--g600)' }}>{r.label}</span>{r.val}
              </div>
            ))}
          </div>

          {/* Change Password */}
          <div style={{ borderTop: '1px solid var(--g100)', paddingTop: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g800)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="fas fa-key" style={{ color: 'var(--blue)' }} /> Change Password
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Current Password</label><input className="form-input" type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="Current password" /></div>
              <div className="form-group"><label className="form-label">New Password (min 6 chars)</label><input className="form-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New password" /></div>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <button className="btn btn-outline" onClick={load}><i className="fas fa-undo" /> Reset</button>
            <button className="btn btn-primary" disabled={busy} onClick={save}>
              {busy ? <span className="loader" /> : <><i className="fas fa-save" /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>

      {/* Contribution Summary */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">
          <div className="card-title"><i className="fas fa-chart-line" style={{ color: 'var(--blue)', marginRight: 7 }} />My Contribution Summary</div>
        </div>
        {contribs.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { val: 'GH₵ ' + fmtAmt(allTime), lbl: 'Total All Time' },
              { val: 'GH₵ ' + fmtAmt(yearTotal), lbl: `This Year (${thisYear})` },
              { val: contribs.length, lbl: 'Total Records' },
            ].map(s => (
              <div key={s.lbl} className="contrib-sum-box"><div className="contrib-sum-val">{s.val}</div><div className="contrib-sum-lbl">{s.lbl}</div></div>
            ))}
          </div>
        ) : <EmptyState icon="fa-coins" title="No contributions recorded yet" />}
      </div>

      {/* Recent activity */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title"><i className="fas fa-coins" style={{ color: 'var(--gold)', marginRight: 7 }} />Recent Contributions</div></div>
          {contribs.slice(0, 5).map(c => (
            <div key={c.receipt_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--g50)' }}>
              <div className="av-sm" style={{ background: 'var(--gold-lt)', color: 'var(--gold-dk)', fontSize: 10 }}><i className="fas fa-coins" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--g800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.program_name}</div>
                <div style={{ fontSize: 10, color: 'var(--g400)' }}>{fmtDate(c.date_paid || c.created_at)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>GH₵ {fmtAmt(c.amount)}</div>
                <span className={`pill pill-${(c.status||'').toLowerCase()}`} style={{ fontSize: 9 }}>{c.status}</span>
              </div>
            </div>
          ))}
          {!contribs.length && <EmptyState icon="fa-coins" title="No contributions yet" />}
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title"><i className="fas fa-hand-holding-heart" style={{ color: 'var(--gold)', marginRight: 7 }} />Donations Received</div></div>
          {donations.slice(0, 5).map(d => (
            <div key={d.donation_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--g50)' }}>
              <div className="av-sm" style={{ background: 'var(--gold-lt)', color: 'var(--gold-dk)', fontSize: 10 }}><i className="fas fa-hand-holding-heart" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--g800)' }}>{d.program_name}</div>
                <div style={{ fontSize: 10, color: 'var(--g400)' }}>From {d.donor_name} · {fmtDate(d.date)}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ok)', flexShrink: 0 }}>GH₵ {fmtAmt(d.amount)}</div>
            </div>
          ))}
          {!donations.length && <EmptyState icon="fa-hand-holding-heart" title="No donations received yet" />}
        </div>
      </div>
    </div>
  );
}
