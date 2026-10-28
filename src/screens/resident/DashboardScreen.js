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
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth }        from '../../context/AuthContext';
import { useAlert }       from '../../context/AlertContext';
import { useTheme }       from '../../context/ThemeContext';
import { eventsAPI, residentsAPI, sosAPI } from '../../services/api';
import EventDetailsModal from '../../components/EventDetailsModal';
import StatCard    from '../../components/StatCard';
import ProgressBar from '../../components/ProgressBar';
import Button      from '../../components/Button';
import ActiveSosBanner from '../../components/ActiveSosBanner';
import SosTriggerModal from '../../components/SosTriggerModal';
import { COLORS, SPACING, getEventStatus } from '../../constants';
import Icon from '../../components/Icon';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const DashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout: authLogout } = useAuth();
  const { showError, hideAlert }      = useAlert();
  const { colors }                   = useTheme();
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
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, showError]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const paidCount = dashboard?.paidPersonsCount ?? dashboard?.contributorsCount ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}>

        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>Jai Ganesh!</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.name}</Text>
            {user?.houseOrFlatNo ? <Text style={[styles.flat, { color: colors.textMuted }]}>Flat {user.houseOrFlatNo}</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
              style={styles.headerSosBtn}
              onPress={() => setShowSosModal(true)}
              activeOpacity={0.85}>
              <Icon name="alarm-light" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.headerSosBtnText}>SOS</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={[styles.logoutBtn, { color: colors.danger }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Active Society SOS Banner ── */}
        <ActiveSosBanner alerts={activeSos} onPress={() => navigation.navigate('SosEmergency')} />

        {/* ── Active Event ── */}
        {activeEvent ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowModal(true)}
            style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.eventTitle, { color: colors.primary }]}>{activeEvent.title}</Text>
              <View style={{ backgroundColor: colors.primary + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="account-group" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
                  {paidCount} Paid
                </Text>
              </View>
            </View>
            <ProgressBar
              progress={dashboard?.budgetProgress ?? 0}
              label="Collection Progress"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Text style={[styles.eventSub, { color: colors.textMuted }]}>
                Target: {fmt(activeEvent.targetBudget)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                  Tap to view details
                </Text>
                <Icon name="chevron-right" size={14} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.noEvent}>
            <Text style={[styles.noEventText, { color: colors.textMuted }]}>No active event. Check back later.</Text>
          </View>
        )}

        {/* ── Financial Stats ── */}
        {dashboard && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Financial Summary</Text>
            <View style={styles.statsRow}>
              <StatCard label="Total Collected" value={fmt(dashboard.totalCollection)} color={colors.success} />
              <StatCard label="Total Spent"     value={fmt(dashboard.totalExpenses)}  color={colors.danger}  />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                label="Net Balance"
                value={fmt(dashboard.netBalance)}
                color={dashboard.netBalance >= 0 ? colors.success : colors.danger}
              />
              <StatCard label="Paid Persons" value={`${paidCount} Persons`} color={colors.info} />
            </View>
          </>
        )}

        {/* ── Society Stats ── */}
        {societyStats && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Society Overview</Text>
            <View style={styles.statsRow}>
              <StatCard label="Registered Houses" value={String(societyStats.totalHouses)}     color={colors.primary} />
              <StatCard label="Total Members"     value={String(societyStats.totalPopulation)} color={colors.secondary} />
            </View>
          </>
        )}

        {/* ── Society Community Services ── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Society Services</Text>
        <View style={{ flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.xs }}>
          <TouchableOpacity
            style={[styles.serviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MyVisitors')}>
            <Icon name="qrcode-scan" size={26} color={colors.primary} style={{ marginBottom: 6 }} />
            <Text style={[styles.serviceCardTitle, { color: colors.text }]}>Visitor Pass</Text>
            <Text style={[styles.serviceCardSub, { color: colors.textMuted }]}>Pre-approve guests & QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.serviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('NoticeBoard')}>
            <Icon name="bullhorn" size={26} color={colors.info} style={{ marginBottom: 6 }} />
            <Text style={[styles.serviceCardTitle, { color: colors.text }]}>Notice Board</Text>
            <Text style={[styles.serviceCardSub, { color: colors.textMuted }]}>View society circulars</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.xs }}>
          <TouchableOpacity
            style={[styles.serviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Helpdesk')}>
            <Icon name="lifebuoy" size={26} color={colors.secondary} style={{ marginBottom: 6 }} />
            <Text style={[styles.serviceCardTitle, { color: colors.text }]}>Private Helpdesk</Text>
            <Text style={[styles.serviceCardSub, { color: colors.textMuted }]}>Submit request / complaint</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.serviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Maintenance')}>
            <Icon name="cash-check" size={26} color={colors.primary} style={{ marginBottom: 6 }} />
            <Text style={[styles.serviceCardTitle, { color: colors.text }]}>Maintenance Register</Text>
            <Text style={[styles.serviceCardSub, { color: colors.textMuted }]}>Society dues & flats</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.xs }}>
          <TouchableOpacity
            style={[styles.serviceCard, { backgroundColor: '#DC262615', borderColor: '#DC2626', borderWidth: 1.5 }]}
            activeOpacity={0.8}
            onPress={() => setShowSosModal(true)}>
            <Icon name="alarm-light" size={26} color="#DC2626" style={{ marginBottom: 6 }} />
            <Text style={[styles.serviceCardTitle, { color: '#DC2626' }]}>Emergency SOS</Text>
            <Text style={[styles.serviceCardSub, { color: colors.textMuted }]}>Alert guards & admins</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.serviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Expenses')}>
            <Icon name="receipt" size={26} color={colors.warning} style={{ marginBottom: 6 }} />
            <Text style={[styles.serviceCardTitle, { color: colors.text }]}>Society Expenses</Text>
            <Text style={[styles.serviceCardSub, { color: colors.textMuted }]}>View bills & accounts</Text>
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ── */}
        <Button
          title="View My Payments & Receipts"
          onPress={() => navigation.navigate('MyPayment')}
          variant="outline"
          style={{ marginTop: SPACING.sm }}
        />
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
          fetchData();
          navigation.navigate('SosEmergency');
        }}
        userFlat={user?.houseOrFlatNo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },

  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  greeting:   { fontSize: 13, fontWeight: '500' },
  userName:   { fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  flat:       { fontSize: 12, marginTop: 2, fontWeight: '600' },
  logoutBtn:  { fontWeight: '700', fontSize: 13 },
  headerSosBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    elevation: 3,
  },
  headerSosBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  eventCard: {
    borderRadius:    18,
    padding:         SPACING.md,
    marginBottom:    SPACING.md,
    borderWidth:     1,
    elevation:       2.5,
    shadowColor:     '#4F46E5',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.06,
    shadowRadius:    12,
  },
  eventTitle: { fontSize: 17, fontWeight: '800', marginBottom: SPACING.sm, letterSpacing: -0.2 },
  eventSub:   { fontSize: 12, marginTop: 4 },

  noEvent:    { padding: SPACING.lg, alignItems: 'center', borderRadius: 16 },
  noEventText:{ fontStyle: 'italic' },

  sectionTitle: { fontSize: 14, fontWeight: '800', marginTop: SPACING.md, marginBottom: SPACING.xs, letterSpacing: 0.2 },
  statsRow:     { flexDirection: 'row', marginHorizontal: -SPACING.xs },
  serviceCard: {
    flex:         1,
    padding:      SPACING.md,
    borderRadius: 16,
    borderWidth:  1,
    alignItems:   'flex-start',
    elevation:    2,
    shadowColor:  '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  serviceCardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  serviceCardSub:   { fontSize: 11 },
});

export default DashboardScreen;
