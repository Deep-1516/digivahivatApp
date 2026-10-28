/**
 * src/context/AuthContext.js
 *
 * Provides the authenticated user and token globally.
 * Persists session in AsyncStorage so the user stays logged in
 * across app restarts.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLoggingOut } from '../services/api';
import { registerDeviceToken, unregisterDeviceToken } from '../services/notification.service';

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
          // Register push notification token in background
          const fcmToken = await registerDeviceToken();
          if (fcmToken) {
            console.log('🔥 [FCM TOKEN ON APP START]:', fcmToken);
          }
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
    const fcmToken = await registerDeviceToken();
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`👤 Logged in as: ${userData?.name || 'User'} (${userData?.phone || ''})`);
    console.log('🔥 FCM Token after login:');
    console.log(fcmToken || '(No token received - check permissions or Firebase link)');
    console.log('═══════════════════════════════════════════════════════════════\n');
  };

  // ── Update local user (e.g., after profile edit) ──────────────────────────
  const updateUser = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: userData, token }));
  };

  // ── Logout: clear everything ───────────────────────────────────────────────
  const logout = async () => {
    setLoggingOut(true);
    await unregisterDeviceToken();
    setUser(null);
    setToken(null);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } finally {
      setTimeout(() => {
        setLoggingOut(false);
      }, 2000);
    }
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
