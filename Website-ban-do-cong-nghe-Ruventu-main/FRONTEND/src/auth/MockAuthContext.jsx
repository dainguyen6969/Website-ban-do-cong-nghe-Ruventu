import { useCallback, useEffect, useMemo, useState } from 'react';
import MockAuthContext from './mockAuthContext';

const ACCOUNTS_STORAGE_KEY = 'ruventu.mock.accounts';
const SESSION_STORAGE_KEY = 'ruventu.mock.session';

const SEEDED_ACCOUNTS = Object.freeze([
  {
    id: 'admin-1',
    name: 'Quản trị viên RUVENTU',
    email: 'admin@ruventu.com',
    phone: '0900000001',
    password: 'Admin@123',
    role: 'admin',
  },
  {
    id: 'user-1',
    name: 'Nguyễn Văn An',
    email: 'user1@ruventu.com',
    phone: '0900000002',
    password: 'User@123',
    role: 'user',
  },
  {
    id: 'user-2',
    name: 'Trần Minh Anh',
    email: 'user2@ruventu.com',
    phone: '0900000003',
    password: 'User@123',
    role: 'user',
  },
  {
    id: 'user-3',
    name: 'Lê Hoàng Nam',
    email: 'user3@ruventu.com',
    phone: '0900000004',
    password: 'User@123',
    role: 'user',
  },
]);

const cloneSeededAccounts = () => SEEDED_ACCOUNTS.map((account) => ({ ...account }));

const readStoredJson = (key) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const loadAccounts = () => {
  const storedAccounts = readStoredJson(ACCOUNTS_STORAGE_KEY);
  if (Array.isArray(storedAccounts)) return storedAccounts;

  const seededAccounts = cloneSeededAccounts();
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(seededAccounts));
  return seededAccounts;
};

const loadSession = () => {
  const storedSession = readStoredJson(SESSION_STORAGE_KEY);
  return storedSession?.accountId ? storedSession : null;
};

export function MockAuthProvider({ children }) {
  const [accounts, setAccounts] = useState(loadAccounts);
  const [session, setSession] = useState(loadSession);

  const currentAccount = useMemo(
    () => accounts.find((account) => account.id === session?.accountId) ?? null,
    [accounts, session],
  );

  useEffect(() => {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  useEffect(() => {
    const syncFromStorage = (event) => {
      if (event.key === null) {
        setAccounts(loadAccounts());
        setSession(loadSession());
        return;
      }
      if (event.key === ACCOUNTS_STORAGE_KEY) setAccounts(loadAccounts());
      if (event.key === SESSION_STORAGE_KEY) setSession(loadSession());
    };

    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  const login = useCallback((identifier, password) => {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const account = accounts.find(
      (candidate) =>
        (candidate.email.toLowerCase() === normalizedIdentifier || candidate.phone === identifier.trim())
        && candidate.password === password,
    );

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
      name: fullName.trim(),
      email: normalizedEmail,
      phone: phone.replace(/\s+/g, ''),
      password,
      role: 'user',
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

  const value = useMemo(() => ({
    accounts,
    currentAccount,
    login,
    logout,
    register,
    updateCurrentAccount,
  }), [accounts, currentAccount, login, logout, register, updateCurrentAccount]);

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}
