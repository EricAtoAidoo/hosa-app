// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import api from '../utils/api';

const AppContext = createContext(null);

const ROLE_LEVELS = {
  'Member': 1, 'Executive': 2, 'PRO': 3, 'Secretary': 3,
  'Financial Secretary': 4, 'Admin': 5, 'Super Admin': 6,
};

export function AppProvider({ children }) {
  const [session, setSession]             = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('hosa_session') || 'null'); } catch { return null; }
  });
  const [cache, setCache] = useState({
    members: [], contributions: [], donations: [], programs: [],
    announcements: [], positions: [], receipts: [], executives: [],
    projects: [], openingBalances: [], logo: null,
  });
  const [loading, setLoading]   = useState({});
  const inactivityRef           = useRef(null);
  const warningRef              = useRef(null);

  // ── Session helpers ──────────────────────────────────
  const saveSession = useCallback((sess) => {
    setSession(sess);
    if (sess) {
      sessionStorage.setItem('hosa_session', JSON.stringify(sess));
      sessionStorage.setItem('hosa_token',   sess.token);
    } else {
      sessionStorage.clear();
    }
  }, []);

  const logout = useCallback(() => {
    clearTimeout(inactivityRef.current);
    clearTimeout(warningRef.current);
    saveSession(null);
    setCache({ members:[], contributions:[], donations:[], programs:[],
      announcements:[], positions:[], receipts:[], executives:[],
      projects:[], openingBalances:[], logo: null });
  }, [saveSession]);

  // ── Role helpers ─────────────────────────────────────
  const getLevel = useCallback(() => {
    if (!session) return 0;
    const roles = (session.allRoles || ['Member']);
    return Math.max(...roles.map(r => ROLE_LEVELS[r] || 1));
  }, [session]);

  const canAccess = useCallback((minLevel) => getLevel() >= minLevel, [getLevel]);

  // ── Cache updater ────────────────────────────────────
  const updateCache = useCallback((key, data) => {
    setCache(prev => ({ ...prev, [key]: data }));
  }, []);

  // ── Fetch helpers (deduplicated with loading state) ──
  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));

  const fetchMembers = useCallback(async (force = false) => {
    if (cache.members.length && !force) return cache.members;
    setLoad('members', true);
    const r = await api.getMembers();
    if (r.success) updateCache('members', r.data);
    setLoad('members', false);
    return r.data || [];
  }, [cache.members, updateCache]);

  const fetchContributions = useCallback(async (force = false) => {
    if (cache.contributions.length && !force) return cache.contributions;
    setLoad('contributions', true);
    const r = await api.getContributions();
    if (r.success) updateCache('contributions', r.data);
    setLoad('contributions', false);
    return r.data || [];
  }, [cache.contributions, updateCache]);

  const fetchDonations = useCallback(async (force = false) => {
    if (cache.donations.length && !force) return cache.donations;
    setLoad('donations', true);
    const r = await api.getDonations();
    if (r.success) updateCache('donations', r.data);
    setLoad('donations', false);
    return r.data || [];
  }, [cache.donations, updateCache]);

  const fetchPrograms = useCallback(async (force = false) => {
    if (cache.programs.length && !force) return cache.programs;
    setLoad('programs', true);
    const r = await api.getPrograms();
    if (r.success) updateCache('programs', r.data);
    setLoad('programs', false);
    return r.data || [];
  }, [cache.programs, updateCache]);

  const fetchAnnouncements = useCallback(async (force = false) => {
    if (cache.announcements.length && !force) return cache.announcements;
    const r = await api.getAnnouncements();
    if (r.success) updateCache('announcements', r.data);
    return r.data || [];
  }, [cache.announcements, updateCache]);

  const fetchExecutives = useCallback(async (force = false) => {
    if (cache.executives.length && !force) return cache.executives;
    const r = await api.getExecutives();
    if (r.success) updateCache('executives', r.data);
    return r.data || [];
  }, [cache.executives, updateCache]);

  const fetchPositions = useCallback(async (force = false) => {
    if (cache.positions.length && !force) return cache.positions;
    const r = await api.getPositions();
    if (r.success) updateCache('positions', r.data);
    return r.data || [];
  }, [cache.positions, updateCache]);

  const fetchProjects = useCallback(async (force = false) => {
    if (cache.projects.length && !force) return cache.projects;
    const r = await api.getProjects();
    if (r.success) updateCache('projects', r.data);
    return r.data || [];
  }, [cache.projects, updateCache]);

  const fetchOpeningBalances = useCallback(async (force = false) => {
    if (cache.openingBalances.length && !force) return cache.openingBalances;
    const r = await api.getOpeningBalances();
    if (r.success) updateCache('openingBalances', r.data);
    return r.data || [];
  }, [cache.openingBalances, updateCache]);

  const fetchLogo = useCallback(async () => {
    if (cache.logo !== null) return cache.logo;
    const r = await api.getLogo();
    const url = r.success ? (r.dataUrl || '') : '';
    updateCache('logo', url);
    return url;
  }, [cache.logo, updateCache]);

  return (
    <AppContext.Provider value={{
      session, saveSession, logout,
      getLevel, canAccess, ROLE_LEVELS,
      cache, updateCache, loading,
      fetchMembers, fetchContributions, fetchDonations, fetchPrograms,
      fetchAnnouncements, fetchExecutives, fetchPositions, fetchProjects,
      fetchOpeningBalances, fetchLogo,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
