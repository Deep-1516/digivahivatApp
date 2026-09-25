/**
 * src/context/AuthContext.js
 *
 * Provides the authenticated user and token globally.
 * Persists session in AsyncStorage so the user stays logged in
 * across app restarts.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

const STORAGE_KEY = '@falo_auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true); // splash guard

  // ── Rehydrate on mount ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const { user: u, token: t } = JSON.parse(raw);
          setUser(u);
          setToken(t);
        }
      } catch (_) {
        // Storage read failure — proceed as logged-out
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Login: save user + token ───────────────────────────────────────────────
  const login = async (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: userData, token: authToken }));
  };

  // ── Update local user (e.g., after profile edit) ──────────────────────────
  const updateUser = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: userData, token }));
  };

  // ── Logout: clear everything ───────────────────────────────────────────────
  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const isAdmin      = user?.role === 'Admin';
  const isSuperAdmin = user?.role === 'SuperAdmin';

  return (
    <AuthContext.Provider value={{ user, token, loading, isAdmin, isSuperAdmin, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
