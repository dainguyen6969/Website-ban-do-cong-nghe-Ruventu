import { useCallback, useEffect, useMemo, useState } from 'react';
import MockAuthContext from './mockAuthContext';
import {
  ACCOUNTS_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  createEmployeeAccount,
  isStaffAccount,
  upgradeAccounts,
} from './accountModel';
import { ROLES_STORAGE_KEY, roleAbbreviationFromName, roleIdFromName, upgradeRoles } from './roleModel';

const readStoredJson = (key) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const loadAccounts = () => {
  const accounts = upgradeAccounts(readStoredJson(ACCOUNTS_STORAGE_KEY));
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  return accounts;
};

const loadSession = () => {
  const storedSession = readStoredJson(SESSION_STORAGE_KEY);
  return storedSession?.accountId ? storedSession : null;
};

const loadRoles = () => {
  const roles = upgradeRoles(readStoredJson(ROLES_STORAGE_KEY));
  localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
  return roles;
};

export function MockAuthProvider({ children }) {
  const [accounts, setAccounts] = useState(loadAccounts);
  const [session, setSession] = useState(loadSession);
  const [roles, setRoles] = useState(loadRoles);

  const currentAccount = useMemo(
    () => accounts.find((account) => account.id === session?.accountId) ?? null,
    [accounts, session],
  );

  useEffect(() => {
    if (currentAccount?.trangThai === 'ngung_hoat_dong') setSession(null);
  }, [currentAccount]);

  useEffect(() => {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    if (session) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_STORAGE_KEY);
  }, [session]);

  useEffect(() => {
    const syncFromStorage = (event) => {
      if (event.key === null) {
        setAccounts(loadAccounts());
        setSession(loadSession());
        setRoles(loadRoles());
        return;
      }
      if (event.key === ACCOUNTS_STORAGE_KEY) setAccounts(loadAccounts());
      if (event.key === SESSION_STORAGE_KEY) setSession(loadSession());
      if (event.key === ROLES_STORAGE_KEY) setRoles(loadRoles());
    };
    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  const login = useCallback((identifier, password) => {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const account = accounts.find((candidate) => (
      (candidate.email.toLowerCase() === normalizedIdentifier || candidate.phone === identifier.trim())
      && candidate.password === password
      && candidate.trangThai !== 'ngung_hoat_dong'
    ));
    if (!account) return null;
    setSession({ accountId: account.id });
    return account;
  }, [accounts]);

  const logout = useCallback(() => setSession(null), []);

  const register = useCallback(({ fullName, email, phone, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (accounts.some((account) => account.email.toLowerCase() === normalizedEmail)) {
      return { account: null, error: 'Email này đã được sử dụng.' };
    }
    const account = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: fullName.trim(), email: normalizedEmail, phone: phone.replace(/\s+/g, ''), password, role: 'user',
    };
    setAccounts((current) => [...current, account]);
    return { account, error: null };
  }, [accounts]);

  const updateCurrentAccount = useCallback((updates) => {
    if (!currentAccount) return;
    setAccounts((current) => current.map((account) => (
      account.id === currentAccount.id ? { ...account, ...updates, id: account.id, role: account.role } : account
    )));
  }, [currentAccount]);

  const createEmployee = useCallback((payload) => {
    const normalizedEmail = payload.email.trim().toLowerCase();
    if (accounts.some((account) => account.email.toLowerCase() === normalizedEmail)) {
      return { employee: null, error: 'Email này đã được sử dụng bởi một tài khoản khác.' };
    }
    const account = createEmployeeAccount(payload, accounts);
    setAccounts((current) => [...current, account]);
    return { employee: account, error: null };
  }, [accounts]);

  const updateEmployee = useCallback((accountId, updates) => {
    const now = new Date().toISOString();
    setAccounts((current) => current.map((account) => {
      if (account.id !== accountId || !isStaffAccount(account)) return account;
      const nextRole = updates.vaiTro ?? account.vaiTro;
      const updated = {
        ...account,
        name: updates.hoTen?.trim() ?? account.name,
        hoTen: updates.hoTen?.trim() ?? account.hoTen,
        phone: updates.soDienThoai?.replace(/\s+/g, '') ?? account.phone,
        soDienThoai: updates.soDienThoai?.replace(/\s+/g, '') ?? account.soDienThoai,
        role: account.role === 'admin' ? 'admin' : nextRole,
        vaiTro: nextRole,
        trangThai: updates.trangThai ?? account.trangThai,
        updatedAt: now,
      };
      if (updates.password) {
        updated.password = updates.password;
        updated.passwordHash = updates.password;
      }
      return updated;
    }));
  }, []);

  const setEmployeeStatus = useCallback((accountId, trangThai) => {
    updateEmployee(accountId, { trangThai });
    if (trangThai === 'ngung_hoat_dong' && session?.accountId === accountId) setSession(null);
  }, [session, updateEmployee]);

  const saveRole = useCallback((payload) => {
    const now = new Date().toISOString();
    const existing = payload.id ? roles.find((role) => role.id === payload.id) : null;
    const savedRole = {
      id: existing?.id ?? roleIdFromName(payload.label, roles),
      label: payload.label.trim(),
      description: payload.description.trim(),
      abbreviation: existing?.abbreviation ?? payload.abbreviation ?? roleAbbreviationFromName(payload.label),
      permissions: payload.permissions,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    setRoles((current) => existing ? current.map((role) => role.id === existing.id ? savedRole : role) : [...current, savedRole]);
    return savedRole;
  }, [roles]);

  const value = useMemo(() => ({
    accounts, roles, currentAccount, login, logout, register, updateCurrentAccount,
    createEmployee, updateEmployee, setEmployeeStatus, saveRole,
  }), [accounts, roles, currentAccount, login, logout, register, updateCurrentAccount, createEmployee, updateEmployee, setEmployeeStatus, saveRole]);

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;

}
