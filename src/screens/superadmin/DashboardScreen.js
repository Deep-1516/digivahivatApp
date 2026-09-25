import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth }      from '../../context/AuthContext';
import { useAlert }     from '../../context/AlertContext';
import { useTheme }     from '../../context/ThemeContext';
import { societiesAPI, residentsAPI } from '../../services/api';
import StatCard         from '../../components/StatCard';
import { SPACING }      from '../../constants';

const SuperAdminDashboardScreen = ({ navigation }) => {
  const insets                      = useSafeAreaInsets();
  const { user, logout }            = useAuth();
  const { showError }               = useAlert();
  const { colors }                  = useTheme();

  const [societies,   setSocieties]   = useState([]);
  const [residents,   setResidents]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [socRes, resRes] = await Promise.all([
        societiesAPI.getAll().catch(() => ({ data: { data: [] } })),
        residentsAPI.getAll().catch(() => ({ data: { data: [] } })),
      ]);
      const socData = socRes.data?.data || [];
      const resData = resRes.data?.data?.residents || (Array.isArray(resRes.data?.data) ? resRes.data.data : []);
      setSocieties(socData);
      setResidents(resData);
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const activeSocieties = societies.filter((s) => s.isActive !== false).length;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16) }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}>

        {/* ─── Header ─── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>👑 Super Admin Dashboard</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>Platform Overview • {user?.name}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={[styles.logoutBtn, { backgroundColor: colors.danger + '18' }]}>
            <Text style={[styles.logoutText, { color: colors.danger }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Platform Stats Summary ─── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Platform Metrics</Text>
        <View style={styles.statsRow}>
          <StatCard label="Total Societies"  value={String(societies.length)} color={colors.primary} />
          <StatCard label="Active Societies" value={String(activeSocieties)}   color={colors.success} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Total Users"      value={String(residents.length)} color={colors.warning} />
          <StatCard label="Inactive"         value={String(societies.length - activeSocieties)} color={colors.danger} />
        </View>

        {/* ─── Quick Navigation Card ─── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>🚀 Quick Management</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>Manage all registered societies and assign administrative credentials.</Text>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Society')}>
            <Text style={styles.actionBtnText}>🏘 Manage Societies & Admins →</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Recent Societies Preview ─── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Registered Societies ({societies.length})</Text>
        {societies.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No societies created yet.</Text>
          </View>
        ) : (
          societies.slice(0, 5).map((soc) => (
            <View key={soc._id} style={[styles.socItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.socName, { color: colors.text }]}>{soc.name}</Text>
                <Text style={[styles.socSub, { color: colors.textMuted }]}>{soc.city || 'No city'} • {soc.residentCount || 0} Residents</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: soc.isActive !== false ? colors.success + '22' : colors.textMuted + '22' }]}>
                <Text style={[styles.badgeText, { color: soc.isActive !== false ? colors.success : colors.textMuted }]}>
                  {soc.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen:       { flex: 1 },
  content:      { padding: SPACING.md, paddingBottom: 40 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  title:        { fontSize: 18, fontWeight: '900' },
  sub:          { fontSize: 12, marginTop: 2 },
  logoutBtn:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  logoutText:   { fontSize: 13, fontWeight: '700' },

  sectionLabel: { fontSize: 13, fontWeight: '700', marginTop: SPACING.sm, marginBottom: SPACING.xs },
  statsRow:     { flexDirection: 'row', marginHorizontal: -SPACING.xs, marginBottom: 2 },

  card:         { borderRadius: 18, padding: SPACING.md, borderWidth: 1, marginVertical: SPACING.md, elevation: 2 },
  cardTitle:    { fontSize: 16, fontWeight: '800' },
  cardSub:      { fontSize: 12, marginTop: 3, marginBottom: SPACING.md },
  actionBtn:    { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  actionBtnText:{ color: '#fff', fontWeight: '800', fontSize: 14 },

  emptyCard:    { borderRadius: 14, padding: SPACING.md, borderWidth: 1, alignItems: 'center' },
  emptyText:    { fontSize: 13 },

  socItem:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: SPACING.md, borderWidth: 1, marginBottom: SPACING.xs },
  socName:      { fontSize: 14, fontWeight: '700' },
  socSub:       { fontSize: 12, marginTop: 2 },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText:    { fontSize: 10, fontWeight: '800' },
});

export default SuperAdminDashboardScreen;
