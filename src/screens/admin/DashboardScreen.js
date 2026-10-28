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
  RefreshControl, ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth }        from '../../context/AuthContext';
import { useAlert }       from '../../context/AlertContext';
import { useTheme }       from '../../context/ThemeContext';
import { eventsAPI, contributionsAPI, sosAPI } from '../../services/api';
import EventDetailsModal from '../../components/EventDetailsModal';
import PdfReceiptModal   from '../../components/PdfReceiptModal';
import ActiveSosBanner   from '../../components/ActiveSosBanner';
import StatCard      from '../../components/StatCard';
import ProgressBar   from '../../components/ProgressBar';
import ContributionItem from '../../components/ContributionItem';
import { COLORS, SPACING, getEventStatus } from '../../constants';
import Icon from '../../components/Icon';

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_CONFIG = {
  active:   { label: 'Active',   color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  upcoming: { label: 'Upcoming', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
  closed:   { label: 'Closed',   color: '#64748B', bg: 'rgba(100, 116, 139, 0.15)' },
};

const AdminDashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout: authLogout }   = useAuth();
  const { showError, showAlert, hideAlert } = useAlert();
  const { colors }         = useTheme();
  const [events,        setEvents]      = useState([]);
  const [recentC,       setRecentC]     = useState([]);
  const [loading,       setLoading]     = useState(true);
  const [refreshing,    setRefreshing]  = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [activeSos, setActiveSos] = useState([]);

  const handleLogout = () => {
    hideAlert();
    authLogout();
  };

  const handlePdfReceipt = (item) => {
    setSelectedReceipt(item);
    setShowReceiptModal(true);
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [evRes, sosRes] = await Promise.all([
        eventsAPI.getAll(),
        sosAPI.getActive(),
      ]);
      const allEvents = evRes.data.data || [];
      setActiveSos(sosRes.data?.data || []);

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
      const firstActive = enriched.find((e) => getEventStatus(e) === 'active') || enriched[0];
      if (firstActive) {
        const cRes = await contributionsAPI.getAll({ eventId: firstActive._id });
        setRecentC((cRes.data.data || []).slice(0, 5));
      } else {
        setRecentC([]);
      }
    } catch (err) {
      if (!user || err?.isSilent || err?.isAuthError) return;
      showError('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, showError]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleExport = (ev) => {
    showAlert({
      title: 'Export Excel',
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
    const paidCount = d?.paidPersonsCount ?? d?.contributorsCount ?? 0;

    return (
      <TouchableOpacity
        key={ev._id}
        activeOpacity={0.8}
        onPress={() => setSelectedEvent(ev)}
        style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Header row: title + status badge */}
        <View style={styles.eventHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.eventTitle, { color: colors.text }]}>{ev.title}</Text>
            <View style={styles.dateRow}>
              {ev.startDate && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="calendar-month-outline" size={13} color={colors.textMuted} style={{ marginRight: 3 }} />
                  <Text style={[styles.dateText, { color: colors.textMuted }]}>{fmtDate(ev.startDate)}</Text>
                </View>
              )}
              {ev.endDate   && <Text style={[styles.dateText, { color: colors.textMuted }]}> - {fmtDate(ev.endDate)}</Text>}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              <Icon name="account-group" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.paidPersonsText, { color: colors.primary, marginTop: 0 }]}>
                {paidCount} {paidCount === 1 ? 'Person' : 'Persons'} Paid Fund
              </Text>
            </View>
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
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Paid Persons</Text>
              <Text style={[styles.statValue, { color: colors.info }]}>{paidCount}</Text>
            </View>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: colors.primary, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => setSelectedEvent(ev)}>
            <Icon name="eye-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.actionBtnOutlineText, { color: colors.primary }]}>Paid Persons ({paidCount})</Text>
          </TouchableOpacity>
          {status === 'active' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                onPress={() => navigation.navigate('CollectFalo', { event: ev })}>
                <Icon name="cash-plus" size={15} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnText}>+ Collect</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.warning, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                onPress={() => navigation.navigate('LogExpense', { event: ev })}>
                <Icon name="receipt" size={15} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnText}>+ Expense</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
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
          <TouchableOpacity onPress={handleLogout}>
            <Text style={[styles.logoutBtn, { color: colors.danger }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Active Emergency SOS Banner ─── */}
        <ActiveSosBanner alerts={activeSos} onPress={() => navigation.navigate('SosEmergency')} />

        {/* ─── Quick Nav Buttons ─── */}
        <View style={styles.quickNav}>
          <TouchableOpacity
            style={[styles.qBtn, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => navigation.navigate('NoticeBoard')}>
            <Icon name="bullhorn" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.qBtnText, { color: colors.text }]}>Notice Board</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.qBtn, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => navigation.navigate('Helpdesk')}>
            <Icon name="lifebuoy" size={16} color={colors.secondary} style={{ marginRight: 6 }} />
            <Text style={[styles.qBtnText, { color: colors.text }]}>Helpdesk</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.quickNav, { marginTop: -SPACING.xs }]}>
          <TouchableOpacity
            style={[styles.qBtn, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => navigation.navigate('Events')}>
            <Icon name="calendar-month-outline" size={16} color={colors.info} style={{ marginRight: 6 }} />
            <Text style={[styles.qBtnText, { color: colors.text }]}>Manage Events</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.qBtn, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => navigation.navigate('Residents')}>
            <Icon name="account-group" size={16} color={colors.success} style={{ marginRight: 6 }} />
            <Text style={[styles.qBtnText, { color: colors.text }]}>Residents</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.quickNav, { marginTop: -SPACING.xs }]}>
          <TouchableOpacity
            style={[styles.qBtn, { backgroundColor: colors.primary + '14', borderColor: colors.primary, borderWidth: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => navigation.navigate('Maintenance')}>
            <Icon name="cash-check" size={18} color={colors.primary} style={{ marginRight: 7 }} />
            <Text style={[styles.qBtnText, { color: colors.primary, fontWeight: '800' }]}>Maintenance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.qBtn, { backgroundColor: colors.surface, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => navigation.navigate('GateVisitors')}>
            <Icon name="shield-account" size={18} color={colors.secondary} style={{ marginRight: 7 }} />
            <Text style={[styles.qBtnText, { color: colors.text }]}>Gate Visitors</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.quickNav, { marginTop: -SPACING.xs }]}>
          <TouchableOpacity
            style={[
              styles.qBtn,
              {
                backgroundColor: activeSos.length > 0 ? '#DC262622' : colors.surface,
                borderColor: activeSos.length > 0 ? '#DC2626' : colors.border,
                borderWidth: activeSos.length > 0 ? 1.5 : 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
            onPress={() => navigation.navigate('SosEmergency')}>
            <Icon name="alarm-light" size={18} color="#DC2626" style={{ marginRight: 7 }} />
            <Text style={[styles.qBtnText, { color: '#DC2626', fontWeight: '800' }]}>
              Emergency SOS {activeSos.length > 0 ? `(${activeSos.length} Active)` : ''}
            </Text>
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
            {recentC.map((c) => <ContributionItem key={c._id} item={c} onPressReceipt={handlePdfReceipt} />)}
          </View>
        )}
      </ScrollView>

      {/* ─── Event Details Modal ─── */}
      <EventDetailsModal
        visible={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
      />

      {/* ─── PDF Receipt Viewer Modal ─── */}
      <PdfReceiptModal
        visible={showReceiptModal}
        item={selectedReceipt}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedReceipt(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  title:      { fontSize: 22, fontWeight: '900' },
  sub:        { fontSize: 13 },
  logoutBtn:  { fontWeight: '700', fontSize: 13 },

  quickNav:   { flexDirection: 'row', marginBottom: SPACING.md, gap: SPACING.xs },
  qBtn:       {
    flex: 1,
    borderRadius:    14,
    borderWidth:     1,
    paddingVertical: 12,
    alignItems:      'center',
    elevation:       1.5,
    shadowColor:     '#4F46E5',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.04,
    shadowRadius:    6,
  },
  qBtnText:   { fontWeight: '700', fontSize: 12.5 },

  sectionContainer: { marginBottom: SPACING.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.xs },
  dot:              { width: 8, height: 8, borderRadius: 4 },
  sectionTitle:     { fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },

  eventCard: {
    borderRadius:    18,
    padding:         SPACING.md,
    marginBottom:    SPACING.sm,
    borderWidth:     1,
    elevation:       2.5,
    shadowColor:     '#4F46E5',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.06,
    shadowRadius:    12,
  },
  eventHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  eventTitle:      { fontSize: 16, fontWeight: '800' },
  dateRow:         { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  dateText:        { fontSize: 11, fontWeight: '500' },
  paidPersonsText: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  perHouseText:   { fontSize: 12, fontWeight: '700', marginTop: 2 },

  badge:          { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:      { fontSize: 11, fontWeight: '700' },

  statsGrid: { flexDirection: 'row', gap: 6, marginBottom: SPACING.sm },
  statBox:   { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  statValue: { fontSize: 14, fontWeight: '800', marginTop: 3 },

  cardActions:          { flexDirection: 'row', gap: 8, marginTop: 6 },
  actionBtn:            { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  actionBtnText:        { color: '#FFF', fontSize: 12, fontWeight: '800' },
  actionBtnOutline:     { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.2, alignItems: 'center' },
  actionBtnOutlineText: { fontSize: 12, fontWeight: '800' },

  createEventCta: {
    borderWidth:  1.5,
    borderRadius: 16,
    borderStyle:  'dashed',
    padding:      SPACING.lg,
    alignItems:   'center',
    marginBottom: SPACING.md,
  },
  createEventText: { fontWeight: '800', fontSize: 15 },
});

export default AdminDashboardScreen;
