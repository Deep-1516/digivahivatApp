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
  RefreshControl, ActivityIndicator, Linking, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth }        from '../../context/AuthContext';
import { useAlert }       from '../../context/AlertContext';
import { eventsAPI, contributionsAPI, sosAPI } from '../../services/api';
import { onSosAlertReceived } from '../../services/notification.service';
import EventDetailsModal from '../../components/EventDetailsModal';
import PdfReceiptModal   from '../../components/PdfReceiptModal';
import ActiveSosBanner   from '../../components/ActiveSosBanner';
import ProgressBar       from '../../components/ProgressBar';
import ContributionItem  from '../../components/ContributionItem';
import { SPACING, getEventStatus } from '../../constants';
import Icon from '../../components/Icon';

// ─── Custom Brand Dashboard Theme ───────────────────────────────────────────
const THEME = {
  background:    '#FFFFFF',
  surface:       '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  primary:       '#00AFEF',  // Sky Blue
  secondary:     '#3E4095',  // Society Deep Blue
  dark:          '#1E1E1E',  // Dark Text / Charcoal
  textMuted:     '#64748B',  // Slate Secondary Text
  border:        '#E2E8F0',  // Crisp Subtle Border
  borderSubtle:  '#F1F5F9',
  cardShadow:    '#3E4095',
  success:       '#10B981',
  danger:        '#EF4444',
  warning:       '#F59E0B',
};

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const STATUS_CONFIG = {
  active:   { label: 'Active',   color: '#00AFEF', bg: 'rgba(0, 175, 239, 0.12)' },
  upcoming: { label: 'Upcoming', color: '#3E4095', bg: 'rgba(62, 64, 149, 0.12)' },
  closed:   { label: 'Closed',   color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)' },
};

const AdminDashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout: authLogout }   = useAuth();
  const { showError, showAlert, hideAlert } = useAlert();
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

  // Lightweight active SOS fetcher (polled every 5s & fired immediately on FCM push)
  const fetchActiveSos = useCallback(async () => {
    if (!user) return;
    try {
      const sosRes = await sosAPI.getActive();
      setActiveSos(sosRes.data?.data || []);
    } catch (_) {}
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchData();

      // Lightweight polling heartbeat every 5s while Admin Dashboard is on screen
      const heartbeat = setInterval(fetchActiveSos, 5000);

      // Instant push notification listener for foreground broadcasts
      const unsubscribeSos = onSosAlertReceived(() => {
        fetchActiveSos();
      });

      return () => {
        clearInterval(heartbeat);
        unsubscribeSos();
      };
    }, [fetchData, fetchActiveSos])
  );

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
      <View style={[styles.center, { backgroundColor: THEME.background }]}>
        <ActivityIndicator color={THEME.primary} size="large" />
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
        activeOpacity={0.88}
        onPress={() => setSelectedEvent(ev)}
        style={styles.eventCard}>
        {/* Top Accent Strip */}
        <View style={[styles.cardAccentStrip, { backgroundColor: cfg.color }]} />

        {/* Header row: title + status badge */}
        <View style={styles.eventHeaderRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.eventTitle}>{ev.title}</Text>
            <View style={styles.dateRow}>
              {ev.startDate && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="calendar-month-outline" size={13} color={THEME.textMuted} style={{ marginRight: 4 }} />
                  <Text style={styles.dateText}>{fmtDate(ev.startDate)}</Text>
                </View>
              )}
              {ev.endDate && <Text style={styles.dateText}> - {fmtDate(ev.endDate)}</Text>}
            </View>
            <View style={styles.paidPersonsRow}>
              <View style={styles.paidPersonsPill}>
                <Icon name="account-group" size={13} color={THEME.primary} style={{ marginRight: 4 }} />
                <Text style={styles.paidPersonsText}>
                  {paidCount} {paidCount === 1 ? 'Person' : 'Persons'} Paid Fund
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: `${cfg.color}33` }]}>
            <View style={[styles.badgeDot, { backgroundColor: cfg.color }]} />
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Budget Progress Bar */}
        {ev.targetBudget > 0 && d && (
          <View style={{ marginVertical: SPACING.xs }}>
            <ProgressBar progress={d.budgetProgress ?? 0} label={`Target Budget: ${fmt(ev.targetBudget)}`} isLight />
          </View>
        )}

        {/* Financial Stats Grid (3 Modern Micro-Cards) */}
        {d ? (
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
              <View style={[styles.statIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Icon name="arrow-bottom-left" size={12} color={THEME.success} />
              </View>
              <Text style={styles.statLabel}>Collected</Text>
              <Text style={[styles.statValue, { color: THEME.success }]} numberOfLines={1} adjustsFontSizeToFit>
                {fmt(d.totalCollection)}
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
              <View style={[styles.statIconWrap, { backgroundColor: '#FEE2E2' }]}>
                <Icon name="arrow-top-right" size={12} color={THEME.danger} />
              </View>
              <Text style={styles.statLabel}>Spent</Text>
              <Text style={[styles.statValue, { color: THEME.danger }]} numberOfLines={1} adjustsFontSizeToFit>
                {fmt(d.totalExpenses)}
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: '#F0F9FF', borderColor: '#E0F2FE' }]}>
              <View style={[styles.statIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Icon name="account-group" size={12} color={THEME.secondary} />
              </View>
              <Text style={styles.statLabel}>Paid Persons</Text>
              <Text style={[styles.statValue, { color: THEME.secondary }]} numberOfLines={1} adjustsFontSizeToFit>
                {paidCount} {paidCount === 1 ? 'Person' : 'Persons'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() => setSelectedEvent(ev)}
            activeOpacity={0.8}>
            <Icon name="eye-outline" size={14} color={THEME.secondary} style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnOutlineText}>Paid List ({paidCount})</Text>
          </TouchableOpacity>
          {status === 'active' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: THEME.primary }]}
                onPress={() => navigation.navigate('CollectFalo', { event: ev })}
                activeOpacity={0.8}>
                <Icon name="cash-plus" size={15} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnText}>+ Collect</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: THEME.secondary }]}
                onPress={() => navigation.navigate('LogExpense', { event: ev })}
                activeOpacity={0.8}>
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
    <View style={[styles.screen, { backgroundColor: THEME.background, paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />}>

        {/* ─── Top Bar ─── */}
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.adminAvatar}>
              <Icon name="shield-crown-outline" size={20} color={THEME.secondary} />
            </View>
            <View>
              <Text style={styles.title}>Admin Portal</Text>
              <Text style={styles.sub}>{user?.name || 'Society Administration'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutBtnPill}
            onPress={handleLogout}
            activeOpacity={0.75}>
            <Icon name="logout" size={13} color={THEME.danger} style={{ marginRight: 4 }} />
            <Text style={styles.logoutBtn}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Active Emergency SOS Banner ─── */}
        <ActiveSosBanner alerts={activeSos} onPress={() => navigation.navigate('SosEmergency')} />

        {/* ─── Modern Quick Action Grid ─── */}
        <View style={styles.quickGrid}>
          {/* Row 1 */}
          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('NoticeBoard')}>
            <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(0, 175, 239, 0.1)' }]}>
              <Icon name="bullhorn" size={20} color={THEME.primary} />
            </View>
            <View style={styles.gridTextWrap}>
              <Text style={styles.gridTitle}>Notice Board</Text>
              <Text style={styles.gridSub}>Circulars & alerts</Text>
            </View>
            <Icon name="chevron-right" size={14} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Helpdesk')}>
            <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(62, 64, 149, 0.1)' }]}>
              <Icon name="message-alert-outline" size={20} color={THEME.secondary} />
            </View>
            <View style={styles.gridTextWrap}>
              <Text style={styles.gridTitle}>Complaints</Text>
              <Text style={styles.gridSub}>Resident tickets</Text>
            </View>
            <Icon name="chevron-right" size={14} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Row 2 */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Events')}>
            <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(0, 175, 239, 0.1)' }]}>
              <Icon name="calendar-month-outline" size={20} color={THEME.primary} />
            </View>
            <View style={styles.gridTextWrap}>
              <Text style={styles.gridTitle}>Manage Events</Text>
              <Text style={styles.gridSub}>Plans & budgets</Text>
            </View>
            <Icon name="chevron-right" size={14} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Residents')}>
            <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(62, 64, 149, 0.1)' }]}>
              <Icon name="account-group" size={20} color={THEME.secondary} />
            </View>
            <View style={styles.gridTextWrap}>
              <Text style={styles.gridTitle}>Residents</Text>
              <Text style={styles.gridSub}>Flats directory</Text>
            </View>
            <Icon name="chevron-right" size={14} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Row 3 */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Maintenance')}>
            <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(0, 175, 239, 0.1)' }]}>
              <Icon name="cash-check" size={20} color={THEME.primary} />
            </View>
            <View style={styles.gridTextWrap}>
              <Text style={styles.gridTitle}>Maintenance</Text>
              <Text style={styles.gridSub}>Flat dues & bills</Text>
            </View>
            <Icon name="chevron-right" size={14} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('GateVisitors')}>
            <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(62, 64, 149, 0.1)' }]}>
              <Icon name="shield-account" size={20} color={THEME.secondary} />
            </View>
            <View style={styles.gridTextWrap}>
              <Text style={styles.gridTitle}>Gate Visitors</Text>
              <Text style={styles.gridSub}>Check-in logs</Text>
            </View>
            <Icon name="chevron-right" size={14} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Row 4: SOS Full-Width Alert Card */}
        <TouchableOpacity
          style={[
            styles.sosCard,
            activeSos.length > 0 && styles.sosCardActive,
          ]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SosEmergency')}>
          <View style={styles.sosLeft}>
            <View style={[styles.sosIconWrap, activeSos.length > 0 && { backgroundColor: '#FEE2E2' }]}>
              <Icon name="alarm-light" size={20} color={THEME.danger} />
            </View>
            <View>
              <Text style={styles.sosTitle}>
                Emergency SOS
              </Text>
              <Text style={styles.sosSub}>
                {activeSos.length > 0 ? `${activeSos.length} Active Emergency Alert` : 'Security & resident emergency alerts'}
              </Text>
            </View>
          </View>
          <View style={[styles.sosPill, activeSos.length > 0 ? styles.sosPillActive : null]}>
            <Text style={[styles.sosPillText, activeSos.length > 0 ? { color: '#FFF' } : { color: THEME.danger }]}>
              {activeSos.length > 0 ? `${activeSos.length} ACTIVE` : 'READY'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Empty state */}
        {events.length === 0 && (
          <TouchableOpacity style={styles.createEventCta} onPress={() => navigation.navigate('Events')}>
            <Text style={styles.createEventText}>+ Create your first event</Text>
          </TouchableOpacity>
        )}

        {/* ─── ACTIVE (CURRENT) EVENTS ─── */}
        {activeEvents.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.dot, { backgroundColor: THEME.primary }]} />
              <Text style={styles.sectionTitle}>Active Events ({activeEvents.length})</Text>
            </View>
            {activeEvents.map(renderEventCard)}
          </View>
        )}

        {/* ─── UPCOMING (FUTURE) EVENTS ─── */}
        {upcomingEvents.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.dot, { backgroundColor: THEME.secondary }]} />
              <Text style={styles.sectionTitle}>Upcoming Events ({upcomingEvents.length})</Text>
            </View>
            {upcomingEvents.map(renderEventCard)}
          </View>
        )}

        {/* ─── PAST (CLOSED) EVENTS ─── */}
        {closedEvents.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.dot, { backgroundColor: THEME.textMuted }]} />
              <Text style={[styles.sectionTitle, { color: THEME.textMuted }]}>Past Events ({closedEvents.length})</Text>
            </View>
            {closedEvents.map(renderEventCard)}
          </View>
        )}

        {/* ─── Recent Collections ─── */}
        {recentC.length > 0 && (
          <View style={{ marginTop: SPACING.md }}>
            <Text style={[styles.sectionTitle, { color: THEME.dark, marginBottom: SPACING.xs }]}>Recent Collections</Text>
            {recentC.map((c) => <ContributionItem key={c._id} item={c} onPressReceipt={handlePdfReceipt} isLight />)}
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
  content: { padding: SPACING.md, paddingBottom: SPACING.xl * 1.5 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerRow:  {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  adminAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(62, 64, 149, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title:      { fontSize: 20, fontWeight: '900', color: THEME.dark, letterSpacing: -0.4 },
  sub:        { fontSize: 12, color: THEME.textMuted, marginTop: 1, fontWeight: '500' },
  logoutBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutBtn:  { fontWeight: '700', fontSize: 12, color: THEME.danger },

  // Quick Action Grid
  quickGrid: {
    flexDirection: 'row',
    gap: SPACING.xs + 4,
    marginBottom: SPACING.xs + 4,
  },
  gridCard: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: THEME.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: THEME.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  gridIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  gridTextWrap: {
    flex: 1,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.dark,
  },
  gridSub: {
    fontSize: 10.5,
    color: THEME.textMuted,
    marginTop: 1,
  },

  // SOS Card
  sosCard: {
    backgroundColor: THEME.surface,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: THEME.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: THEME.danger,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  sosCardActive: {
    backgroundColor: '#FEF2F2',
    borderColor: THEME.danger,
    borderWidth: 1.5,
  },
  sosLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sosIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sosTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: THEME.danger,
  },
  sosSub: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 1,
  },
  sosPill: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sosPillActive: {
    backgroundColor: THEME.danger,
  },
  sosPillText: {
    fontSize: 10,
    fontWeight: '800',
  },

  sectionContainer: { marginBottom: SPACING.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.xs },
  dot:              { width: 8, height: 8, borderRadius: 4 },
  sectionTitle:     { fontSize: 15, fontWeight: '800', color: THEME.dark, letterSpacing: -0.2 },

  // Event Card
  eventCard: {
    borderRadius:    22,
    padding:         SPACING.md,
    marginBottom:    SPACING.md,
    borderWidth:     1.2,
    borderColor:     THEME.border,
    backgroundColor: THEME.surface,
    elevation:       3.5,
    shadowColor:     THEME.secondary,
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.08,
    shadowRadius:    14,
    overflow:        'hidden',
    position:        'relative',
  },
  cardAccentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  eventHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, marginTop: 2 },
  eventTitle:      { fontSize: 17.5, fontWeight: '900', color: THEME.dark, letterSpacing: -0.3 },
  dateRow:         { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  dateText:        { fontSize: 11.5, fontWeight: '500', color: THEME.textMuted },
  paidPersonsRow:  { marginTop: 6 },
  paidPersonsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 175, 239, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  paidPersonsText: { fontSize: 11.5, fontWeight: '800', color: THEME.primary },

  badge:          {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  badgeDot:       { width: 5, height: 5, borderRadius: 2.5, marginRight: 5 },
  badgeText:      { fontSize: 11, fontWeight: '800' },

  statsGrid: { flexDirection: 'row', gap: 6, marginBottom: SPACING.sm, marginTop: 4 },
  statBox:   {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statLabel: { fontSize: 9.5, fontWeight: '700', color: THEME.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 13, fontWeight: '900', marginTop: 2 },

  cardActions:          { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn:            {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: THEME.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  actionBtnText:        { color: '#FFF', fontSize: 12, fontWeight: '800' },
  actionBtnOutline:     {
    flex: 1.1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: THEME.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  actionBtnOutlineText: { fontSize: 11.5, fontWeight: '800', color: THEME.secondary },

  createEventCta: {
    borderWidth:  1.5,
    borderRadius: 18,
    borderStyle:  'dashed',
    borderColor:  THEME.primary,
    padding:      SPACING.lg,
    alignItems:   'center',
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(0, 175, 239, 0.04)',
  },
  createEventText: { fontWeight: '800', fontSize: 15, color: THEME.primary },
});

export default AdminDashboardScreen;
