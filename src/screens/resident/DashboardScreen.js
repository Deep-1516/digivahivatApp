/**
 * src/screens/resident/DashboardScreen.js
 *
 * Resident Home Dashboard:
 *  • Active event progress bar (collection vs target)
 *  • Total Collected / Total Spent / Net Balance stat cards
 *  • Society Population Stats (total houses, total members)
 *  • Quick link to My Payment
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth }        from '../../context/AuthContext';
import { useAlert }       from '../../context/AlertContext';
import { eventsAPI, residentsAPI, sosAPI } from '../../services/api';
import { onSosAlertReceived, notifySosListeners } from '../../services/notification.service';
import EventDetailsModal from '../../components/EventDetailsModal';
import StatCard    from '../../components/StatCard';
import ProgressBar from '../../components/ProgressBar';
import ActiveSosBanner from '../../components/ActiveSosBanner';
import SosTriggerModal from '../../components/SosTriggerModal';
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

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const DashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout: authLogout } = useAuth();
  const { showError, hideAlert }      = useAlert();
  const [dashboard,   setDashboard]   = useState(null);
  const [societyStats, setSociety]    = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [activeEvent, setActiveEvent] = useState(null);
  const [showModal,   setShowModal]   = useState(false);
  const [activeSos,   setActiveSos]   = useState([]);
  const [showSosModal, setShowSosModal] = useState(false);

  const handleLogout = () => {
    hideAlert();
    authLogout();
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Get all events, pick the currently active event whose end date has not passed
      const evRes  = await eventsAPI.getAll();
      const events = evRes.data.data || [];
      const ev     = events.find((e) => getEventStatus(e) === 'active') || null;
      setActiveEvent(ev);

      if (ev) {
        const dashRes = await eventsAPI.dashboard(ev._id);
        setDashboard(dashRes.data.data);
      } else {
        setDashboard(null);
      }

      // 2. Society stats & Active SOS
      const [resRes, sosRes] = await Promise.all([
        residentsAPI.getAll(),
        sosAPI.getActive(),
      ]);
      setSociety(resRes.data.data.societyStats);
      setActiveSos(sosRes.data?.data || []);
    } catch (err) {
      if (!user || err?.isSilent || err?.isAuthError) return;
      showError('Error', err.message);
    } finally {
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

      // Lightweight polling heartbeat every 5s while Dashboard is on screen
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

  const paidCount = dashboard?.paidPersonsCount ?? dashboard?.contributorsCount ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        style={[styles.screen, { backgroundColor: THEME.background, paddingTop: Math.max(insets.top, 12) }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />}>

        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="hands-pray" size={14} color={THEME.primary} style={{ marginRight: 4 }} />
              <Text style={styles.greeting}>Jai Ganesh!</Text>
            </View>
            <Text style={styles.userName}>{user?.name}</Text>
            {user?.houseOrFlatNo ? (
              <View style={styles.flatBadge}>
                <Icon name="home-outline" size={12} color={THEME.secondary} style={{ marginRight: 4 }} />
                <Text style={styles.flat}>Flat {user.houseOrFlatNo}</Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              style={styles.headerSosBtn}
              onPress={() => setShowSosModal(true)}
              activeOpacity={0.85}>
              <Icon name="alarm-light" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.headerSosBtnText}>SOS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutBtnPill}
              onPress={handleLogout}
              activeOpacity={0.75}>
              <Icon name="logout" size={13} color={THEME.danger} style={{ marginRight: 3 }} />
              <Text style={styles.logoutBtn}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Active Society SOS Banner ── */}
        <ActiveSosBanner alerts={activeSos} onPress={() => navigation.navigate('SosEmergency')} />

        {/* ── Active Event (Featured Card) ── */}
        {activeEvent ? (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setShowModal(true)}
            style={styles.eventCard}>
            {/* Top Accent Strip */}
            <View style={styles.cardAccentStrip} />

            <View style={styles.eventHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={styles.activeTag}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeTagText}>Active Society Event</Text>
                </View>
                <Text style={styles.eventTitle}>{activeEvent.title}</Text>
              </View>
              <View style={styles.paidBadge}>
                <Icon name="account-group" size={13} color={THEME.primary} style={{ marginRight: 4 }} />
                <Text style={styles.paidBadgeText}>
                  {paidCount} Paid
                </Text>
              </View>
            </View>

            <ProgressBar
              progress={dashboard?.budgetProgress ?? 0}
              label="Collection Progress"
              isLight
            />

            <View style={styles.eventFooterRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="target" size={13} color={THEME.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.eventSub}>
                  Target: {fmt(activeEvent.targetBudget)}
                </Text>
              </View>
              <View style={styles.viewDetailsPill}>
                <Text style={styles.viewDetailsText}>
                  View Details
                </Text>
                <Icon name="chevron-right" size={14} color={THEME.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.noEvent}>
            <Icon name="calendar-blank-outline" size={32} color={THEME.textMuted} style={{ marginBottom: 6 }} />
            <Text style={styles.noEventText}>No active society event right now.</Text>
          </View>
        )}

        {/* ── Financial Stats ── */}
        {dashboard && (
          <>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionDot, { backgroundColor: THEME.primary }]} />
              <Text style={styles.sectionTitle}>Financial Summary</Text>
            </View>
            <View style={styles.statsRow}>
              <StatCard
                label="Total Collected"
                value={fmt(dashboard.totalCollection)}
                color={THEME.success}
                icon="arrow-bottom-left"
                style={styles.statCardOverride}
                isLight
              />
              <StatCard
                label="Total Spent"
                value={fmt(dashboard.totalExpenses)}
                color={THEME.danger}
                icon="arrow-top-right"
                style={styles.statCardOverride}
                isLight
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                label="Net Balance"
                value={fmt(dashboard.netBalance)}
                color={dashboard.netBalance >= 0 ? THEME.success : THEME.danger}
                icon="wallet-outline"
                style={styles.statCardOverride}
                isLight
              />
              <StatCard
                label="Paid Persons"
                value={`${paidCount} Persons`}
                color={THEME.secondary}
                icon="account-check-outline"
                style={styles.statCardOverride}
                isLight
              />
            </View>
          </>
        )}

        {/* ── Society Stats ── */}
        {societyStats && (
          <>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionDot, { backgroundColor: THEME.secondary }]} />
              <Text style={styles.sectionTitle}>Society Overview</Text>
            </View>
            <View style={styles.statsRow}>
              <StatCard
                label="Registered Houses"
                value={String(societyStats.totalHouses)}
                color={THEME.primary}
                icon="home-city-outline"
                style={styles.statCardOverride}
                isLight
              />
              <StatCard
                label="Total Members"
                value={String(societyStats.totalPopulation)}
                color={THEME.secondary}
                icon="account-group-outline"
                style={styles.statCardOverride}
                isLight
              />
            </View>
          </>
        )}

        {/* ── Society Community Services ── */}
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionDot, { backgroundColor: THEME.dark }]} />
          <Text style={styles.sectionTitle}>Society Services</Text>
        </View>

        <View style={styles.servicesGrid}>
          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('MyVisitors')}>
            <View style={styles.serviceTopRow}>
              <View style={[styles.serviceIconContainer, { backgroundColor: 'rgba(0, 175, 239, 0.1)' }]}>
                <Icon name="qrcode-scan" size={20} color={THEME.primary} />
              </View>
              <Icon name="chevron-right" size={15} color="#CBD5E1" />
            </View>
            <Text style={styles.serviceCardTitle}>Visitor Pass</Text>
            <Text style={styles.serviceCardSub}>Pre-approve guests & QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('NoticeBoard')}>
            <View style={styles.serviceTopRow}>
              <View style={[styles.serviceIconContainer, { backgroundColor: 'rgba(62, 64, 149, 0.1)' }]}>
                <Icon name="bullhorn" size={20} color={THEME.secondary} />
              </View>
              <Icon name="chevron-right" size={15} color="#CBD5E1" />
            </View>
            <Text style={styles.serviceCardTitle}>Notice Board</Text>
            <Text style={styles.serviceCardSub}>View society circulars</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesGrid}>
          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('Helpdesk')}>
            <View style={styles.serviceTopRow}>
              <View style={[styles.serviceIconContainer, { backgroundColor: 'rgba(62, 64, 149, 0.1)' }]}>
                <Icon name="message-alert-outline" size={20} color={THEME.secondary} />
              </View>
              <Icon name="chevron-right" size={15} color="#CBD5E1" />
            </View>
            <Text style={styles.serviceCardTitle}>Complaints</Text>
            <Text style={styles.serviceCardSub}>Submit or track ticket</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('Maintenance')}>
            <View style={styles.serviceTopRow}>
              <View style={[styles.serviceIconContainer, { backgroundColor: 'rgba(0, 175, 239, 0.1)' }]}>
                <Icon name="cash-check" size={20} color={THEME.primary} />
              </View>
              <Icon name="chevron-right" size={15} color="#CBD5E1" />
            </View>
            <Text style={styles.serviceCardTitle}>Maintenance</Text>
            <Text style={styles.serviceCardSub}>Flat dues & receipts</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesGrid}>
          <TouchableOpacity
            style={[styles.serviceCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
            activeOpacity={0.82}
            onPress={() => setShowSosModal(true)}>
            <View style={styles.serviceTopRow}>
              <View style={[styles.serviceIconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Icon name="alarm-light" size={20} color={THEME.danger} />
              </View>
              <Icon name="chevron-right" size={15} color={THEME.danger} />
            </View>
            <Text style={[styles.serviceCardTitle, { color: THEME.danger }]}>Emergency SOS</Text>
            <Text style={styles.serviceCardSub}>Alert guards & admins</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceCard}
            activeOpacity={0.82}
            onPress={() => navigation.navigate('Expenses')}>
            <View style={styles.serviceTopRow}>
              <View style={[styles.serviceIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Icon name="receipt" size={20} color={THEME.warning} />
              </View>
              <Icon name="chevron-right" size={15} color="#CBD5E1" />
            </View>
            <Text style={styles.serviceCardTitle}>Society Expenses</Text>
            <Text style={styles.serviceCardSub}>View bills & accounts</Text>
          </TouchableOpacity>
        </View>

        {/* ── Quick Action Button ── */}
        <TouchableOpacity
          style={styles.myPaymentBtn}
          onPress={() => navigation.navigate('MyPayment')}
          activeOpacity={0.85}>
          <Icon name="credit-card-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.myPaymentBtnText}>View My Payments & Receipts</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Event Details Modal */}
      <EventDetailsModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        event={activeEvent}
      />

      {/* SOS Trigger Modal */}
      <SosTriggerModal
        visible={showSosModal}
        onClose={() => setShowSosModal(false)}
        onTriggerSuccess={async (data) => {
          await sosAPI.trigger(data);
          notifySosListeners(data);
          fetchActiveSos();
          navigation.navigate('SosEmergency');
        }}
        userFlat={user?.houseOrFlatNo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl * 1.5 },

  headerRow:  {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  greeting:   { fontSize: 13, fontWeight: '700', color: THEME.primary, letterSpacing: 0.2 },
  userName:   { fontSize: 24, fontWeight: '900', color: THEME.dark, letterSpacing: -0.4 },
  flatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(62, 64, 149, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  flat:       { fontSize: 11.5, fontWeight: '700', color: THEME.secondary },
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
  logoutBtn:  { fontWeight: '700', fontSize: 12.5, color: THEME.danger },
  headerSosBtn: {
    backgroundColor: THEME.danger,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 2,
    shadowColor: THEME.danger,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  headerSosBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

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
    backgroundColor: THEME.primary,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 2,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.primary,
    marginRight: 5,
  },
  activeTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  eventTitle: { fontSize: 18, fontWeight: '900', color: THEME.dark, letterSpacing: -0.3 },
  paidBadge: {
    backgroundColor: 'rgba(0, 175, 239, 0.1)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paidBadgeText: { fontSize: 11, fontWeight: '800', color: THEME.primary },
  eventFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  eventSub:   { fontSize: 12, color: THEME.textMuted, fontWeight: '600' },
  viewDetailsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 175, 239, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primary,
    marginRight: 2,
  },

  noEvent: {
    padding: SPACING.lg,
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: THEME.border,
    backgroundColor: THEME.surfaceSubtle,
    marginBottom: SPACING.md,
  },
  noEventText: { fontSize: 13, color: THEME.textMuted, fontWeight: '500' },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs + 2,
  },
  sectionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.dark,
    letterSpacing: -0.2,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -SPACING.xs,
  },
  statCardOverride: {
    backgroundColor: THEME.surface,
    borderColor: THEME.border,
    borderWidth: 1.2,
    shadowColor: THEME.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },

  servicesGrid: {
    flexDirection: 'row',
    gap: SPACING.xs + 4,
    marginBottom: SPACING.xs + 4,
  },
  serviceCard: {
    flex:         1,
    padding:      13,
    borderRadius: 18,
    borderWidth:  1.2,
    borderColor:  THEME.border,
    backgroundColor: THEME.surface,
    alignItems:   'flex-start',
    elevation:    2,
    shadowColor:  THEME.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  serviceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  serviceIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceCardTitle: { fontSize: 13.5, fontWeight: '800', color: THEME.dark, marginBottom: 2 },
  serviceCardSub:   { fontSize: 10.5, color: THEME.textMuted, lineHeight: 14 },

  myPaymentBtn: {
    backgroundColor: THEME.secondary,
    borderRadius: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: SPACING.lg,
    elevation: 3.5,
    shadowColor: THEME.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  myPaymentBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default DashboardScreen;
