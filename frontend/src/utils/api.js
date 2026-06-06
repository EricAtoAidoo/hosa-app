// src/utils/api.js
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || '/api';

const client = axios.create({ baseURL: BASE });

// Attach JWT token to every request
client.interceptors.request.use(cfg => {
  const token = sessionStorage.getItem('hosa_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Auto-logout on 401
client.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      sessionStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

const api = {
  // ── Auth ──────────────────────────────────────────────
  verifyMember: (name, yearGroup) =>
    client.post('/auth/verify-member', { name, yearGroup }).then(r => r.data),

  login: (username, password) =>
    client.post('/auth/login', { username, password }).then(r => r.data),

  createAccount: (memberId, password) =>
    client.post('/auth/create-account', { memberId, password }).then(r => r.data),

  resetPassword: (memberId, newPassword) =>
    client.post('/auth/reset-password', { memberId, newPassword }).then(r => r.data),

  changePassword: (oldPassword, newPassword) =>
    client.post('/auth/change-password', { oldPassword, newPassword }).then(r => r.data),

  // ── Members ───────────────────────────────────────────
  getMembers: () => client.get('/members').then(r => r.data),
  getMember: (id) => client.get(`/members/${id}`).then(r => r.data),
  getExecutives: () => client.get('/members/executives').then(r => r.data),
  addMember: (data) => client.post('/members', data).then(r => r.data),
  bulkAddMembers: (members) => client.post('/members/bulk', { members }).then(r => r.data),
  editMember: (id, data) => client.put(`/members/${id}`, data).then(r => r.data),
  deleteMember: (id) => client.delete(`/members/${id}`).then(r => r.data),
  updateRoles: (id, roles, primaryRole) =>
    client.patch(`/members/${id}/roles`, { roles, primaryRole }).then(r => r.data),
  updateExecRoles: (id, executiveRoles) =>
    client.patch(`/members/${id}/executive-roles`, { executiveRoles }).then(r => r.data),
  setMemberStatus: (id, status) =>
    client.patch(`/members/${id}/status`, { status }).then(r => r.data),

  // ── Contributions ─────────────────────────────────────
  getContributions: (program) =>
    client.get('/contributions', { params: { program } }).then(r => r.data),
  getMemberContributions: (memberId) =>
    client.get(`/contributions/member/${memberId}`).then(r => r.data),
  searchContributions: (q) =>
    client.get('/contributions/search', { params: { q } }).then(r => r.data),
  addContribution: (data) => client.post('/contributions', data).then(r => r.data),
  editContribution: (id, data) => client.put(`/contributions/${id}`, data).then(r => r.data),
  deleteContribution: (id) => client.delete(`/contributions/${id}`).then(r => r.data),

  // ── Donations ─────────────────────────────────────────
  getDonations: (memberId) =>
    client.get('/donations', { params: { memberId } }).then(r => r.data),
  addDonation: (data) => client.post('/donations', data).then(r => r.data),
  editDonation: (id, data) => client.put(`/donations/${id}`, data).then(r => r.data),
  deleteDonation: (id) => client.delete(`/donations/${id}`).then(r => r.data),

  // ── Programs ──────────────────────────────────────────
  getPrograms: () => client.get('/programs').then(r => r.data),
  addProgram: (data) => client.post('/programs', data).then(r => r.data),
  editProgram: (id, data) => client.put(`/programs/${id}`, data).then(r => r.data),
  deleteProgram: (id) => client.delete(`/programs/${id}`).then(r => r.data),

  // ── Announcements ─────────────────────────────────────
  getAnnouncements: () => client.get('/announcements').then(r => r.data),
  addAnnouncement: (data) => client.post('/announcements', data).then(r => r.data),
  deleteAnnouncement: (id) => client.delete(`/announcements/${id}`).then(r => r.data),

  // ── Positions ─────────────────────────────────────────
  getPositions: () => client.get('/positions').then(r => r.data),
  addPosition: (data) => client.post('/positions', data).then(r => r.data),
  editPosition: (id, data) => client.put(`/positions/${id}`, data).then(r => r.data),
  deletePosition: (id) => client.delete(`/positions/${id}`).then(r => r.data),

  // ── Projects ──────────────────────────────────────────
  getProjects: () => client.get('/projects').then(r => r.data),
  addProject: (data) => client.post('/projects', data).then(r => r.data),
  editProject: (id, data) => client.put(`/projects/${id}`, data).then(r => r.data),
  deleteProject: (id) => client.delete(`/projects/${id}`).then(r => r.data),

  // ── Opening Balance ───────────────────────────────────
  getOpeningBalances: () => client.get('/opening-balances').then(r => r.data),
  addOpeningBalance: (data) => client.post('/opening-balances', data).then(r => r.data),
  editOpeningBalance: (id, data) => client.put(`/opening-balances/${id}`, data).then(r => r.data),
  deleteOpeningBalance: (id) => client.delete(`/opening-balances/${id}`).then(r => r.data),

  // ── Receipts ──────────────────────────────────────────
  getReceipts: (memberId) =>
    client.get('/receipts', { params: { memberId } }).then(r => r.data),

  // ── Complaints ────────────────────────────────────────
  getComplaints: (memberId) =>
    client.get('/complaints', { params: { memberId } }).then(r => r.data),
  addComplaint: (data) => client.post('/complaints', data).then(r => r.data),
  editComplaint: (id, data) => client.put(`/complaints/${id}`, data).then(r => r.data),
  respondComplaint: (id, data) =>
    client.patch(`/complaints/${id}/respond`, data).then(r => r.data),
  deleteComplaint: (id) => client.delete(`/complaints/${id}`).then(r => r.data),

  // ── Activity Log ──────────────────────────────────────
  getActivityLog: () => client.get('/activity').then(r => r.data),

  // ── Settings (logo) ───────────────────────────────────
  getLogo: () => client.get('/settings/logo').then(r => r.data),
  saveLogo: (dataUrl) => client.post('/settings/logo', { dataUrl }).then(r => r.data),
  removeLogo: () => client.delete('/settings/logo').then(r => r.data),
};

export default api;
