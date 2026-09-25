/**
 * src/screens/admin/DashboardScreen.js
 *
 * Admin Dashboard:
 *  • Displays ALL events grouped into Current (Active), Future (Upcoming), and Past (Closed).
 *  • Live financial breakdown (Collected, Spent, Net Balance) for each event.
 *  • Quick action buttons (+ Collect Falo, + Log Expense, Export) on each event.
 *  • Recent collections preview at the bottom.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth }        from '../../context/AuthContext';
import { useAlert }       from '../../context/AlertContext';
import { useTheme }       from '../../context/ThemeContext';
import { eventsAPI, contributionsAPI } from '../../services/api';
import StatCard      from '../../components/StatCard';
import ProgressBar   from '../../components/ProgressBar';
import ContributionItem from '../../components/ContributionItem';
import { COLORS, SPACING } from '../../constants';

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function getEventStatus(ev) {
  if (!ev.isActive) return 'closed';
  const now = Date.now();
  const start = ev.startDate ? new Date(ev.startDate).getTime() : 0;
  if (start > now) return 'upcoming';
  return 'active';
}

const STATUS_CONFIG = {
  active:   { label: 'Active',   color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  upcoming: { label: 'Upcoming', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
  closed:   { label: 'Closed',   color: '#64748B', bg: 'rgba(100, 116, 139, 0.15)' },
};

const AdminDashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout }   = useAuth();
  const { showError, showAlert } = useAlert();
  const { colors }         = useTheme();
  const [events,     setEvents]   = useState([]);
  const [recentC,    setRecentC]  = useState([]);
  const [loading,    setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const evRes = await eventsAPI.getAll();
      const allEvents = evRes.data.data || [];

      if (allEvents.length === 0) {
        setEvents([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch dashboard stats for all events in parallel
      const dashResults = await Promise.allSettled(
        allEvents.map((ev) => eventsAPI.dashboard(ev._id))
      );

      const enriched = allEvents.map((ev, i) => {
        const res = dashResults[i];
        return {
          ...ev,
          _dashboard: res.status === 'fulfilled' ? res.value.data.data : null,
        };
      });

      setEvents(enriched);

      // Fetch recent contributions for active event
      const firstActive = enriched.find((e) => e.isActive) || enriched[0];
      if (firstActive) {
        const cRes = await contributionsAPI.getAll({ eventId: firstActive._id });
        setRecentC((cRes.data.data || []).slice(0, 5));
      } else {
        setRecentC([]);
      }
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleExport = (ev) => {
    showAlert({
      title: 'Export Excel 📊',
      message: `Financial report export requested for "${ev.title}".\n\nAPI: GET /api/events/${ev._id}/export/excel`,
      type: 'info',
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const activeEvents   = events.filter((e) => getEventStatus(e) === 'active');
  const upcomingEvents = events.filter((e) => getEventStatus(e) === 'upcoming');
  const closedEvents   = events.filter((e) => getEventStatus(e) === 'closed');

  const renderEventCard = (ev) => {
    const status = getEventStatus(ev);
    const cfg    = STATUS_CONFIG[status];
    const d      = ev._dashboard;

    return (
      <View key={ev._id} style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Header row: title + status badge */}
        <View style={styles.eventHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.eventTitle, { color: colors.text }]}>{ev.title}</Text>
            <View style={styles.dateRow}>
              {ev.startDate && <Text style={[styles.dateText, { color: colors.textMuted }]}>📅 {fmtDate(ev.startDate)}</Text>}
              {ev.endDate   && <Text style={[styles.dateText, { color: colors.textMuted }]}> → {fmtDate(ev.endDate)}</Text>}
            </View>
            {ev.perHouseAmount > 0 && (
              <Text style={[styles.perHouseText, { color: colors.primary }]}>Per House: ₹{ev.perHouseAmount}</Text>
            )}
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Budget Progress Bar */}
        {ev.targetBudget > 0 && d && (
          <View style={{ marginBottom: SPACING.sm }}>
            <ProgressBar progress={d.budgetProgress ?? 0} label={`Target: ${fmt(ev.targetBudget)}`} />
          </View>
        )}

        {/* Financial Stats */}
        {d ? (
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Collected</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>{fmt(d.totalCollection)}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Spent</Text>
              <Text style={[styles.statValue, { color: colors.danger }]}>{fmt(d.totalExpenses)}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Net Balance</Text>
              <Text style={[styles.statValue, { color: d.netBalance >= 0 ? colors.success : colors.danger }]}>{fmt(d.netBalance)}</Text>
            </View>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          {status === 'active' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('CollectFalo', { event: ev })}>
                <Text style={styles.actionBtnText}>+ Collect</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.warning }]}
                onPress={() => navigation.navigate('LogExpense', { event: ev })}>
                <Text style={styles.actionBtnText}>+ Expense</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: colors.border }]}
            onPress={() => handleExport(ev)}>
            <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>📊 Export</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}>

        {/* ─── Top Bar ─── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Admin Dashboard</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>{user?.name}</Text>
          </View>
          <TouchableOpacity onPress={logout}>
            <Text style={[styles.logoutBtn, { color: colors.danger }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Quick Nav Buttons ─── */}
        <View style={styles.quickNav}>
          <TouchableOpacity
            style={[styles.qBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Events')}>
            <Text style={[styles.qBtnText, { color: colors.text }]}>🗓  Manage Events</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.qBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Residents')}>
            <Text style={[styles.qBtnText, { color: colors.text }]}>👥 Residents</Text>
          </TouchableOpacity>
        </View>

        {/* Empty state */}
        {events.length === 0 && (
          <TouchableOpacity style={[styles.createEventCta, { borderColor: colors.primary }]} onPress={() => navigation.navigate('Events')}>
            <Text style={[styles.createEventText, { color: colors.primary }]}>+ Create your first event</Text>
          </TouchableOpacity>
        )}

        {/* ─── ACTIVE (CURRENT) EVENTS ─── */}
        {activeEvents.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Events ({activeEvents.length})</Text>
            </View>
            {activeEvents.map(renderEventCard)}
          </View>
        )}

        {/* ─── UPCOMING (FUTURE) EVENTS ─── */}
        {upcomingEvents.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming Events ({upcomingEvents.length})</Text>
            </View>
            {upcomingEvents.map(renderEventCard)}
          </View>
        )}

        {/* ─── PAST (CLOSED) EVENTS ─── */}
        {closedEvents.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.dot, { backgroundColor: '#64748B' }]} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Past Events ({closedEvents.length})</Text>
            </View>
            {closedEvents.map(renderEventCard)}
          </View>
        )}

        {/* ─── Recent Collections ─── */}
        {recentC.length > 0 && (
          <View style={{ marginTop: SPACING.md }}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: SPACING.xs }]}>Recent Collections</Text>
            {recentC.map((c) => <ContributionItem key={c._id} item={c} />)}
          </View>
        )}
      </ScrollView>

      {/* ─── Floating Action Buttons ─── */}
      <View style={styles.fab}>
        <TouchableOpacity
          style={[styles.fabBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('CollectFalo')}>
          <Text style={styles.fabText}>+ Collect Falo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fabBtn, { backgroundColor: colors.warning }]}
          onPress={() => navigation.navigate('LogExpense')}>
          <Text style={styles.fabText}>+ Log Expense</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: 110 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  title:      { fontSize: 22, fontWeight: '900' },
  sub:        { fontSize: 13 },
  logoutBtn:  { fontWeight: '700', fontSize: 13 },

  quickNav:   { flexDirection: 'row', marginBottom: SPACING.md, gap: SPACING.xs },
  qBtn:       {
    flex: 1,
    borderRadius:    10,
    borderWidth:     1,
    paddingVertical: 10,
    alignItems:      'center',
  },
  qBtnText:   { fontWeight: '700', fontSize: 12 },

  sectionContainer: { marginBottom: SPACING.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.xs },
  dot:              { width: 8, height: 8, borderRadius: 4 },
  sectionTitle:     { fontSize: 14, fontWeight: '800' },

  eventCard: {
    borderRadius:    14,
    padding:         SPACING.md,
    marginBottom:    SPACING.sm,
    borderWidth:     1,
    elevation:       2,
  },
  eventHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  eventTitle:     { fontSize: 16, fontWeight: '800' },
  dateRow:        { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dateText:       { fontSize: 11, fontWeight: '500' },
  perHouseText:   { fontSize: 12, fontWeight: '700', marginTop: 2 },

  badge:          { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText:      { fontSize: 11, fontWeight: '700' },

  statsGrid: { flexDirection: 'row', gap: 6, marginBottom: SPACING.sm },
  statBox:   { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },

  cardActions:          { flexDirection: 'row', gap: 6, marginTop: 4 },
  actionBtn:            { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionBtnText:        { color: '#FFF', fontSize: 12, fontWeight: '700' },
  actionBtnOutline:     { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  actionBtnOutlineText: { fontSize: 12, fontWeight: '700' },

  createEventCta: {
    borderWidth:  1.5,
    borderRadius: 12,
    borderStyle:  'dashed',
    padding:      SPACING.lg,
    alignItems:   'center',
    marginBottom: SPACING.md,
  },
  createEventText: { fontWeight: '700', fontSize: 15 },

  fab: {
    position:       'absolute',
    bottom:         SPACING.lg,
    left:           SPACING.md,
    right:          SPACING.md,
    flexDirection:  'row',
    justifyContent: 'space-between',
    gap:            SPACING.sm,
  },
  fabBtn: {
    flex:            1,
    borderRadius:    14,
    paddingVertical: 14,
    alignItems:      'center',
    elevation:       6,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.15,
    shadowRadius:    6,
  },
  fabText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});

export default AdminDashboardScreen;
