// src/pages/Settings.jsx
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import api from '../utils/api';

export default function Settings() {
  const { session, cache, fetchPositions, getLevel, updateCache } = useApp();
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [busy,    setBusy]    = useState(false);
  const fileRef   = useRef(null);
  const level     = getLevel();

  useEffect(() => {
    fetchPositions();
    setLogoUrl(cache.logo || '');
  }, [cache.logo]);

  async function savePassword() {
    if (!oldPass || !newPass) { toast.error('Both passwords required.'); return; }
    if (newPass.length < 6) { toast.error('New password must be at least 6 chars.'); return; }
    setBusy(true);
    const r = await api.changePassword(oldPass, newPass);
    setBusy(false);
    if (r.success) { toast.success('Password changed!'); setOldPass(''); setNewPass(''); }
    else toast.error(r.error);
  }

  async function uploadLogo(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image too large. Maximum 5MB.'); return; }
    const allowed = ['image/png','image/jpeg','image/jpg','image/svg+xml','image/webp'];
    if (!allowed.includes(file.type)) { toast.error('Please upload PNG, JPG, SVG or WebP.'); return; }
    const reader = new FileReader();
    reader.onload = async e => {
      const dataUrl = e.target.result;
      updateCache('logo', dataUrl);
      const r = await api.saveLogo(dataUrl);
      if (r.success) toast.success('Logo saved and will persist across sessions!');
      else toast.error(r.error || 'Logo applied locally but server save failed.');
    };
    reader.readAsDataURL(file);
  }

  async function removeLogo() {
    const r = await api.removeLogo();
    updateCache('logo', '');
    if (r.success) toast.success('Logo removed.');
    else toast.error('Logo cleared locally. Server removal failed.');
  }

  return (
    <div className="grid-2">
      {/* Logo settings */}
      {level >= 5 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><i className="fas fa-image" style={{ color: 'var(--blue)', marginRight: 7 }} />Logo Settings</div>
            <span style={{ fontSize: 11, color: 'var(--g400)' }}>Super Admin only</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 16, background: 'var(--blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700,
              color: 'var(--gold)', border: '3px solid var(--gold)', overflow: 'hidden', flexShrink: 0,
            }}>
              {cache.logo
                ? <img src={cache.logo} alt="HOSA Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <i className="fas fa-image" style={{ fontSize: 28, color: 'var(--g400)' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g800)', marginBottom: 4 }}>Organisation Logo</div>
              <div style={{ fontSize: 11, color: 'var(--g400)', lineHeight: 1.6, marginBottom: 10 }}>Appears on all pages, PDFs, receipts and the login screen.<br />Max size: <strong>5MB</strong> · PNG, JPG, SVG, WebP</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
                  <i className="fas fa-cloud-upload-alt" /> {cache.logo ? 'Change Logo' : 'Upload Logo'}
                </button>
                {cache.logo && <button className="btn btn-danger btn-sm" onClick={removeLogo}><i className="fas fa-trash-alt" /> Remove Logo</button>}
              </div>
            </div>
          </div>
          <div
            style={{ border: '2px dashed var(--g200)', borderRadius: 'var(--rl)', padding: 32, textAlign: 'center', cursor: 'pointer', background: 'var(--g50)', transition: '.18s' }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); uploadLogo(e.dataTransfer.files[0]); }}
          >
            <i className="fas fa-cloud-upload-alt" style={{ fontSize: 28, color: 'var(--g400)', display: 'block', marginBottom: 8 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--g600)', marginBottom: 3 }}>Click or drag &amp; drop to upload</p>
            <span style={{ fontSize: 11, color: 'var(--g400)' }}>PNG, JPG, SVG, WebP · Maximum 5MB</span>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={e => uploadLogo(e.target.files[0])} />
        </div>
      )}

      {/* Account */}
      <div className="card">
        <div className="card-header"><div className="card-title"><i className="fas fa-user-cog" style={{ color: 'var(--blue)', marginRight: 7 }} />My Account</div></div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Display Name</label>
          <input className="form-input" value={session?.fullName || ''} readOnly style={{ background: 'var(--g50)' }} />
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Member ID</label>
          <input className="form-input" value={session?.memberId || ''} readOnly style={{ background: 'var(--g50)', fontFamily: 'var(--font-mono)' }} />
        </div>
        <div style={{ borderTop: '1px solid var(--g100)', margin: '14px 0', paddingTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--g800)', marginBottom: 10 }}>Change Password</div>
          <div className="form-group" style={{ marginBottom: 10 }}><label className="form-label">Current Password</label><input className="form-input" type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="Enter current password" /></div>
          <div className="form-group" style={{ marginBottom: 10 }}><label className="form-label">New Password</label><input className="form-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min. 6 characters" /></div>
        </div>
        <button className="btn btn-primary" disabled={busy} onClick={savePassword}>
          {busy ? <span className="loader" /> : <><i className="fas fa-save" /> Save Changes</>}
        </button>
      </div>

      {/* Role access levels */}
      {level >= 5 && (
        <div className="card">
          <div className="card-header"><div className="card-title"><i className="fas fa-shield-alt" style={{ color: 'var(--blue)', marginRight: 7 }} />Role Access Levels</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cache.positions.map(p => (
              <div key={p.position_id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--g50)' }}>
                <span className={`role-pill rp-${p.position_name.toLowerCase().replace(/\s+/g,'-').replace('super-admin','super').replace('financial-secretary','fin')}`}>{p.position_name}</span>
                <span style={{ fontSize: 12, color: 'var(--g600)', marginLeft: 8 }}>Level {p.level} — {p.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Info */}
      <div className="card">
        <div className="card-header"><div className="card-title"><i className="fas fa-database" style={{ color: 'var(--blue)', marginRight: 7 }} />System Info</div></div>
        {[
          { k: 'Version', v: 'v2.0.0' },
          { k: 'Backend',  v: 'Node.js / Express' },
          { k: 'Database', v: 'PostgreSQL' },
          { k: 'Super Admin', v: 'Eric Aidoo' },
          { k: 'Auth', v: 'JWT + bcrypt' },
          { k: 'PDF Engine', v: 'Browser Print API' },
        ].map(r => (
          <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--g50)', fontSize: 13 }}>
            <span style={{ color: 'var(--g400)' }}>{r.k}</span>
            <span style={{ fontWeight: 600 }}>{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
