// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { saveSession, fetchLogo } = useApp();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState('');
  const [step, setStep]   = useState('detect'); // detect | login | create | forgot | reset
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');

  // Verify step
  const [verifyName, setVerifyName] = useState('');
  const [verifyYear, setVerifyYear] = useState('');
  const [showYear,   setShowYear]   = useState(false);

  // Create account
  const [pendingMember, setPendingMember] = useState(null);
  const [newPass,        setNewPass]      = useState('');
  const [confirmPass,    setConfirmPass]  = useState('');

  // Login
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Forgot / Reset
  const [forgotName,  setForgotName]  = useState('');
  const [forgotYear,  setForgotYear]  = useState('');
  const [showForgotYear, setShowForgotYear] = useState(false);
  const [resetMember, setResetMember] = useState(null);
  const [resetPass,   setResetPass]   = useState('');
  const [resetConf,   setResetConf]   = useState('');

  const verified = localStorage.getItem('hosa_verified') === 'yes';

  useEffect(() => {
    setStep(verified ? 'login' : 'verify');
    fetchLogo().then(url => setLogoUrl(url || ''));
  }, []);

  const logo = logoUrl
    ? <img src={logoUrl} alt="HOSA" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14 }} />
    : <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>HOSA</span>;

  async function doVerify() {
    setErr(''); setBusy(true);
    const r = await api.verifyMember(verifyName, verifyYear);
    setBusy(false);
    if (!r.success) { setErr(r.error); return; }
    if (r.multipleFound) {
      setErr(`Multiple members named "${verifyName}" found. Please enter your Year Group.`);
      setShowYear(true); return;
    }
    if (!r.found) { setErr(r.message || 'Name not found in HOSA database.'); return; }
    localStorage.setItem('hosa_verified', 'yes');
    if (r.hasAccount) {
      setLoginUser(r.fullName);
      setStep('login');
      toast.success('Verified! Please enter your password.');
      return;
    }
    setPendingMember(r);
    setStep('create');
  }

  async function doLogin() {
    setErr(''); setBusy(true);
    const r = await api.login(loginUser, loginPass);
    setBusy(false);
    if (!r.success) { setErr(r.error); return; }
    saveSession(r);
    navigate('/');
  }

  async function doCreateAccount() {
    setErr('');
    if (newPass.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (newPass !== confirmPass) { setErr('Passwords do not match.'); return; }
    setBusy(true);
    const r = await api.createAccount(pendingMember.memberId, newPass);
    if (!r.success) { setErr(r.error); setBusy(false); return; }
    toast.success('Account created! Signing you in…');
    const lr = await api.login(r.username, newPass);
    setBusy(false);
    if (lr.success) { saveSession(lr); navigate('/'); }
    else { setStep('login'); setLoginUser(r.username); }
  }

  async function doFindAccount() {
    setErr(''); setBusy(true);
    const r = await api.verifyMember(forgotName, forgotYear);
    setBusy(false);
    if (!r.success) { setErr(r.error); return; }
    if (r.multipleFound) { setErr('Multiple members found. Enter your Year Group.'); setShowForgotYear(true); return; }
    if (!r.found) { setErr(r.message || 'No member found.'); return; }
    if (!r.hasAccount) { setErr('This member has no account yet. Use "Verify Membership" to set one up.'); return; }
    setResetMember(r);
    setStep('reset');
  }

  async function doReset() {
    setErr('');
    if (resetPass.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (resetPass !== resetConf) { setErr('Passwords do not match.'); return; }
    setBusy(true);
    const r = await api.resetPassword(resetMember.memberId, resetPass);
    setBusy(false);
    if (!r.success) { setErr(r.error); return; }
    toast.success('Password reset! Signing you in…');
    const lr = await api.login(r.username, resetPass);
    if (lr.success) { saveSession(lr); navigate('/'); }
    else { setStep('login'); setLoginUser(r.username); }
  }

  const errBox = err && (
    <div style={{ background: 'var(--err-bg)', border: '1px solid #f5c6c1', borderRadius: 10, padding: '12px', fontSize: 12, color: 'var(--err)', marginBottom: 14 }}>
      {err}
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--blue)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: 36, width: '100%', maxWidth: 440,
        boxShadow: 'var(--sh-lg)', animation: 'slideUp .5s cubic-bezier(.4,0,.2,1)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 70, height: 70, background: 'var(--blue)', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', border: '3px solid var(--gold)', overflow: 'hidden',
          }}>{logo}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--blue)' }}>
            Holiness Old Students Association
          </div>
          <div style={{ fontSize: 12, color: 'var(--g400)', marginTop: 4 }}>Smart Membership &amp; Contribution Management</div>
        </div>

        {/* ── VERIFY ── */}
        {step === 'verify' && <>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--g800)', marginBottom: 6 }}>Verify Membership</div>
          <div style={{ fontSize: 12, color: 'var(--g400)', marginBottom: 18, lineHeight: 1.6 }}>
            Enter your full name to verify your membership in the HOSA database.
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">Full Name</label>
            <input className="form-input" style={{ height: 44, fontSize: 14 }}
              value={verifyName} onChange={e => setVerifyName(e.target.value)}
              placeholder="e.g. Ato Kwamena" onKeyDown={e => e.key === 'Enter' && doVerify()} />
          </div>
          {showYear && <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">Year Group</label>
            <input className="form-input" style={{ height: 44, fontSize: 14 }}
              value={verifyYear} onChange={e => setVerifyYear(e.target.value)}
              placeholder="e.g. 2005" onKeyDown={e => e.key === 'Enter' && doVerify()} />
          </div>}
          {errBox}
          <button className="btn btn-primary" style={{ width: '100%', height: 44, fontSize: 14, fontWeight: 700, justifyContent: 'center' }} onClick={doVerify} disabled={busy}>
            {busy ? <span className="loader" /> : <><i className="fas fa-search" /> Verify Membership</>}
          </button>
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--g400)' }}>
            Already verified?{' '}
            <span style={{ color: 'var(--blue-mid)', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setErr(''); setStep('login'); }}>
              Sign in here
            </span>
          </div>
        </>}

        {/* ── CREATE ACCOUNT ── */}
        {step === 'create' && pendingMember && <>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--g800)', marginBottom: 6 }}>Membership Verified!</div>
          <div style={{ background: 'var(--blue-light)', border: '1px solid var(--blue-soft)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)', marginBottom: 4 }}>{pendingMember.fullName?.toUpperCase()}</div>
            <div style={{ fontSize: 12, color: 'var(--blue-mid)' }}>Role: <strong>{pendingMember.primaryRole || 'Member'}</strong></div>
            <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{pendingMember.memberId}</div>
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">Create Password (min. 6 chars)</label>
            <input className="form-input" type="password" style={{ height: 44 }}
              value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Choose a secure password" />
          </div>
          <div className="form-group" style={{ marginBottom: 4 }}>
            <label className="form-label">Confirm Password</label>
            <input className="form-input" type="password" style={{ height: 44 }}
              value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repeat your password"
              onKeyDown={e => e.key === 'Enter' && doCreateAccount()} />
          </div>
          {errBox}
          <button className="btn btn-gold" style={{ width: '100%', height: 44, fontSize: 14, fontWeight: 700, justifyContent: 'center', marginTop: 14 }} onClick={doCreateAccount} disabled={busy}>
            {busy ? <span className="loader" style={{ borderTopColor: 'var(--blue)' }} /> : <><i className="fas fa-user-check" /> Create Account &amp; Sign In</>}
          </button>
          <button style={{ background: 'none', border: 'none', color: 'var(--blue-mid)', fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'center', marginTop: 10, padding: 6 }}
            onClick={() => { setStep('verify'); setErr(''); }}>← Back to Verify</button>
        </>}

        {/* ── LOGIN ── */}
        {step === 'login' && <>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--g800)', marginBottom: 6 }}>Welcome Back</div>
          <div style={{ fontSize: 12, color: 'var(--g400)', marginBottom: 18, lineHeight: 1.6 }}>Sign in to your HOSA account.</div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">Full Name</label>
            <input className="form-input" style={{ height: 44 }}
              value={loginUser} onChange={e => setLoginUser(e.target.value)}
              placeholder="e.g. Ato Kwamena" onKeyDown={e => e.key === 'Enter' && doLogin()} />
          </div>
          <div className="form-group" style={{ marginBottom: 4 }}>
            <label className="form-label">Password</label>
            <input className="form-input" type="password" style={{ height: 44 }}
              value={loginPass} onChange={e => setLoginPass(e.target.value)}
              placeholder="Your password" onKeyDown={e => e.key === 'Enter' && doLogin()} />
          </div>
          {errBox}
          <button className="btn btn-primary" style={{ width: '100%', height: 44, fontSize: 14, fontWeight: 700, justifyContent: 'center', marginTop: 14 }} onClick={doLogin} disabled={busy}>
            {busy ? <span className="loader" /> : <><i className="fas fa-sign-in-alt" /> Sign In</>}
          </button>
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: 'var(--g400)' }}>
            Haven't verified?{' '}
            <span style={{ color: 'var(--blue-mid)', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setErr(''); setStep('verify'); }}>Click here first</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span style={{ color: 'var(--g400)', fontSize: 12, cursor: 'pointer' }} onClick={() => { setErr(''); setStep('forgot'); }}>
              <i className="fas fa-key" style={{ marginRight: 4, fontSize: 11 }} /> Forgot password?
            </span>
          </div>
        </>}

        {/* ── FORGOT ── */}
        {step === 'forgot' && <>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--g800)', marginBottom: 6 }}><i className="fas fa-key" style={{ color: 'var(--blue)', marginRight: 7 }} />Reset Password</div>
          <div style={{ fontSize: 12, color: 'var(--g400)', marginBottom: 18, lineHeight: 1.6 }}>Enter your full name to find your account.</div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">Full Name</label>
            <input className="form-input" style={{ height: 44, fontSize: 14 }}
              value={forgotName} onChange={e => setForgotName(e.target.value)}
              placeholder="e.g. Eric Aidoo" onKeyDown={e => e.key === 'Enter' && doFindAccount()} />
          </div>
          {showForgotYear && <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">Year Group</label>
            <input className="form-input" style={{ height: 44 }} value={forgotYear}
              onChange={e => setForgotYear(e.target.value)} placeholder="e.g. 2005" />
          </div>}
          {errBox}
          <button className="btn btn-primary" style={{ width: '100%', height: 44, fontSize: 14, fontWeight: 700, justifyContent: 'center' }} onClick={doFindAccount} disabled={busy}>
            {busy ? <span className="loader" /> : <><i className="fas fa-search" /> Find My Account</>}
          </button>
          <button style={{ background: 'none', border: 'none', color: 'var(--blue-mid)', fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'center', marginTop: 10, padding: 6 }}
            onClick={() => { setErr(''); setStep('login'); }}>← Back to Sign In</button>
        </>}

        {/* ── RESET ── */}
        {step === 'reset' && resetMember && <>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--g800)', marginBottom: 6 }}><i className="fas fa-lock-open" style={{ color: 'var(--ok)', marginRight: 7 }} />Set New Password</div>
          <div style={{ background: 'var(--blue-light)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>{resetMember.fullName?.toUpperCase()}</div>
            <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{resetMember.memberId}</div>
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" style={{ height: 44 }}
              value={resetPass} onChange={e => setResetPass(e.target.value)} placeholder="Choose a strong password" />
          </div>
          <div className="form-group" style={{ marginBottom: 4 }}>
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" style={{ height: 44 }}
              value={resetConf} onChange={e => setResetConf(e.target.value)} placeholder="Repeat your new password"
              onKeyDown={e => e.key === 'Enter' && doReset()} />
          </div>
          {errBox}
          <button className="btn btn-gold" style={{ width: '100%', height: 44, fontSize: 14, fontWeight: 700, justifyContent: 'center', marginTop: 14 }} onClick={doReset} disabled={busy}>
            {busy ? <span className="loader" style={{ borderTopColor: 'var(--blue)' }} /> : <><i className="fas fa-save" /> Save New Password &amp; Sign In</>}
          </button>
          <button style={{ background: 'none', border: 'none', color: 'var(--blue-mid)', fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'center', marginTop: 10, padding: 6 }}
            onClick={() => { setErr(''); setStep('forgot'); }}>← Back</button>
        </>}
      </div>
    </div>
  );
}
