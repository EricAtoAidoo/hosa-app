// src/components/UI.jsx
import React, { useEffect, useRef } from 'react';
import { initials, roleClass, fmtDate, fmtAmt, cap } from '../utils/helpers';

// ── Modal ─────────────────────────────────────────────────
export function Modal({ title, onClose, children, large }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${large ? ' modal-lg' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────
export function ConfirmDialog({ title, message, subMsg, okLabel = 'Delete', okBg = 'var(--err)',
  icon = 'fa-trash-alt', iconBg = 'var(--err-bg)', iconColor = 'var(--err)',
  onConfirm, onCancel, hideWarning }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal confirm-dialog" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 14px', fontSize: 24,
            background: iconBg, color: iconColor,
          }}>
            <i className={`fas ${icon}`} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--g800)', marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 13, color: 'var(--g600)', lineHeight: 1.65, marginBottom: 6 }}>{message}</div>
          {!hideWarning && (
            <div style={{ fontSize: 11.5, color: 'var(--err)', fontWeight: 600, marginBottom: 20 }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 4 }} />
              {subMsg || 'This action cannot be undone.'}
            </div>
          )}
          {hideWarning && subMsg && (
            <div style={{ fontSize: 11.5, color: 'var(--g400)', marginBottom: 20 }}>{subMsg}</div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-outline" style={{ minWidth: 110 }} onClick={onCancel}>
              <i className="fas fa-times" /> Cancel
            </button>
            <button className="btn" style={{ minWidth: 130, background: okBg, color: '#fff', border: 'none' }} onClick={onConfirm}>
              <i className={`fas ${icon}`} /> {okLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────
export function Avatar({ name, photo, size = 32, style: s }) {
  const base = {
    width: size, height: size, borderRadius: '50%', background: 'var(--blue-light)',
    color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.35, fontWeight: 700, flexShrink: 0, overflow: 'hidden', ...s,
  };
  return (
    <div style={base}>
      {photo ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(name)}
    </div>
  );
}

// ── Role Pill ─────────────────────────────────────────────
export function RolePill({ role }) {
  return <span className={`role-pill ${roleClass(role)}`}>{role || 'Member'}</span>;
}

// ── Status Pill ───────────────────────────────────────────
export function StatusPill({ status }) {
  const cls = {
    'Active': 'pill-active', 'Inactive': 'pill-inactive',
    'Paid': 'pill-paid', 'Unpaid': 'pill-unpaid', 'Pending': 'pill-pending',
    'Completed': 'pill-completed', 'Open': 'pill-upcoming',
    'In Progress': 'pill-current', 'Resolved': 'pill-active',
    'Closed': 'pill-archived', 'current': 'pill-current',
    'upcoming': 'pill-upcoming', 'future': 'pill-future', 'archived': 'pill-archived',
    'Pending Setup': 'pill-pending',
  }[status] || 'pill-pending';
  return <span className={`pill ${cls}`}>{status}</span>;
}

// ── Empty State ───────────────────────────────────────────
export function EmptyState({ icon = 'fa-inbox', title, sub }) {
  return (
    <div className="empty-state">
      <i className={`fas ${icon}`} />
      <p>{title}</p>
      {sub && <span>{sub}</span>}
    </div>
  );
}

// ── Page loader ───────────────────────────────────────────
export function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="loader loader-dark" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
        <div style={{ fontSize: 13, color: 'var(--g400)' }}>Loading…</div>
      </div>
    </div>
  );
}

// ── Searchable Select ─────────────────────────────────────
export function SearchSelect({ items, value, onChange, placeholder = 'Search…' }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  const filtered = items.filter(i =>
    !search || i.label.toLowerCase().includes(search.toLowerCase())
  );
  const selected = items.find(i => i.value === value);

  useEffect(() => {
    const handleClick = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={handleOpen}
        style={{
          height: 38, border: '1px solid var(--g200)', borderRadius: 9,
          padding: '0 32px 0 12px', fontSize: 13, background: '#fff',
          display: 'flex', alignItems: 'center', cursor: 'pointer',
          color: selected ? 'var(--g800)' : 'var(--g400)',
          ...(open ? { borderColor: 'var(--blue-mid)', boxShadow: '0 0 0 3px rgba(34,85,164,.1)' } : {}),
        }}
      >
        {selected ? selected.label : placeholder}
        <i className="fas fa-chevron-down" style={{ position: 'absolute', right: 10, color: 'var(--g400)', fontSize: 12 }} />
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: '1px solid var(--g200)', borderRadius: 9,
          boxShadow: 'var(--sh-md)', zIndex: 600, maxHeight: 220, overflow: 'auto',
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--g100)' }}>
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{
                width: '100%', border: '1px solid var(--g100)', borderRadius: 6,
                padding: '5px 10px', fontSize: 12, outline: 'none',
              }}
            />
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--g400)', textAlign: 'center' }}>No results</div>
          )}
          {filtered.map(item => (
            <div
              key={item.value}
              onClick={() => { onChange(item.value); setOpen(false); }}
              style={{
                padding: '9px 12px', fontSize: 13, cursor: 'pointer',
                color: item.value === value ? 'var(--blue)' : 'var(--g800)',
                fontWeight: item.value === value ? 600 : 400,
                background: item.value === value ? 'var(--blue-light)' : '',
              }}
              onMouseEnter={e => { if (item.value !== value) e.currentTarget.style.background = 'var(--blue-light)'; }}
              onMouseLeave={e => { if (item.value !== value) e.currentTarget.style.background = ''; }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
