// src/utils/helpers.js

export const ROLE_LEVELS = {
  'Member': 1, 'Executive': 2, 'PRO': 3, 'Secretary': 3,
  'Financial Secretary': 4, 'Admin': 5, 'Super Admin': 6,
};

export function initials(name) {
  return (name || '?').split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase();
}

export function cap(s) {
  return (s || '').charAt(0).toUpperCase() + (s || '').slice(1);
}

export function fmtAmt(v) {
  return Number(v || 0).toLocaleString('en-GH', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

export function fmtDate(d) {
  if (!d || String(d).trim() === '') return '—';
  const ghFmt = String(d).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ghFmt) {
    const parsed = new Date(`${ghFmt[3]}-${ghFmt[2].padStart(2,'0')}-${ghFmt[1].padStart(2,'0')}`);
    if (!isNaN(parsed)) return parsed.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const parsed = new Date(d);
  if (isNaN(parsed)) return String(d);
  return parsed.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-GH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return String(d); }
}

export function typeColor(t) {
  return { urgent: '#C9A00A', meeting: '#1A3A6B', emergency: '#C0392B', info: '#2255A4' }[t] || '#888';
}

export function typeBg(t) {
  return { urgent: '#FFF8D6', meeting: '#EBF2FF', emergency: '#FDECEA', info: '#EBF2FF' }[t] || '#f5f5f5';
}

export function roleClass(r) {
  return ({
    'Super Admin': 'rp-super', 'Admin': 'rp-admin', 'Secretary': 'rp-sec',
    'Financial Secretary': 'rp-fin', 'PRO': 'rp-pro', 'Executive': 'rp-exec', 'Member': 'rp-mem',
  }[r] || 'rp-mem');
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function todayGH() {
  return new Date().toLocaleDateString('en-GH');
}

export function downloadCSV(rows, filename, rawCsv) {
  const csv = rawCsv || rows.map(r =>
    r.map(cell => '"' + String(cell || '').replace(/"/g, '""') + '"').join(',')
  ).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function genReceiptHtml(receiptId, type, memberName, program, amount, recordedBy, date, logoUrl) {
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`
    : '<span style="font-family:serif;font-size:14px;color:#F5C518;font-weight:700">HOSA</span>';

  return `<!DOCTYPE html><html><head><title>HOSA Receipt ${receiptId}</title>
<style>body{font-family:sans-serif;padding:40px;color:#1E2A45;max-width:480px;margin:auto}
.box{border:1.5px solid #C8D2E8;border-radius:12px;padding:24px;position:relative;overflow:hidden}
.wm{opacity:.04;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:60px;font-weight:900;color:#1A3A6B;white-space:nowrap;pointer-events:none}
.head{text-align:center;padding-bottom:14px;border-bottom:1px dashed #C8D2E8;margin-bottom:14px}
.logo{width:50px;height:50px;background:#1A3A6B;border-radius:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;overflow:hidden}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.lbl{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#8896B3;margin-bottom:2px}
.val{font-size:12px;font-weight:600;color:#1E2A45}
.amt{background:#EBF2FF;border-radius:10px;padding:12px;display:flex;justify-content:space-between;margin-bottom:12px}
.footer{text-align:center;margin-top:12px;font-size:10px;color:#8896B3;padding-top:12px;border-top:1px dashed #C8D2E8}
@media print{button{display:none}}</style></head>
<body><div class="box"><div class="wm">HOSA</div>
<div class="head"><div class="logo">${logoHtml}</div>
<div style="font-size:15px;font-weight:700;color:#1A3A6B">HOLINESS OLD STUDENTS ASSOCIATION</div>
<div style="font-size:10px;color:#8896B3;margin-top:2px">Official ${cap(type || 'Payment')} Receipt</div></div>
<div class="grid">
<div><div class="lbl">Receipt No.</div><div class="val" style="font-family:monospace;color:#1A3A6B;font-size:11px">${receiptId}</div></div>
<div><div class="lbl">Date</div><div class="val">${fmtDate(date)}</div></div>
<div><div class="lbl">Member</div><div class="val">${memberName}</div></div>
<div><div class="lbl">Recorded By</div><div class="val">${recordedBy}</div></div>
<div style="grid-column:1/-1"><div class="lbl">Program / Purpose</div><div class="val">${program}</div></div>
</div>
<div class="amt"><span style="font-size:11px;font-weight:600;color:#1A3A6B">Amount Paid</span>
<span style="font-size:20px;font-weight:700;color:#1A3A6B">GH₵ ${fmtAmt(amount)}</span></div>
<div class="footer">Status: <span style="color:#1B7A4A;font-weight:600">PAID</span><br>Official HOSA Receipt — Keep for your records.</div>
</div><br>
<button onclick="window.print()" style="background:#1A3A6B;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;width:100%">Print / Save as PDF</button>
</body></html>`;
}
