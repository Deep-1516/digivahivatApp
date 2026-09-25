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
import { eventsAPI, residentsAPI } from '../../services/api';
import StatCard    from '../../components/StatCard';
import ProgressBar from '../../components/ProgressBar';
import Button      from '../../components/Button';
import { COLORS, SPACING } from '../../constants';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const DashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { showError }    = useAlert();
  const { colors }       = useTheme();
  const [dashboard,   setDashboard]   = useState(null);
  const [societyStats, setSociety]    = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [activeEvent, setActiveEvent] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      // 1. Get all events, pick the first active one
      const evRes  = await eventsAPI.getAll();
      const events = evRes.data.data;
      const ev     = events.find((e) => e.isActive) ?? events[0];
      setActiveEvent(ev ?? null);

      if (ev) {
        const dashRes = await eventsAPI.dashboard(ev._id);
        setDashboard(dashRes.data.data);
      }

      // 2. Society stats
      const resRes = await residentsAPI.getAll();
      setSociety(resRes.data.data.societyStats);
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}>

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>🙏 Jai Ganesh!</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.name}</Text>
          {user?.houseOrFlatNo ? <Text style={[styles.flat, { color: colors.textMuted }]}>Flat {user.houseOrFlatNo}</Text> : null}
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={[styles.logoutBtn, { color: colors.danger }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ── Active Event ── */}
      {activeEvent ? (
        <View style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.eventTitle, { color: colors.primary }]}>{activeEvent.title}</Text>
          <ProgressBar
            progress={dashboard?.budgetProgress ?? 0}
            label="Collection Progress"
          />
          <Text style={[styles.eventSub, { color: colors.textMuted }]}>
            Target: {fmt(activeEvent.targetBudget)}
          </Text>
        </View>
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
            <StatCard label="Contributors" value={String(dashboard.contributorsCount)} color={colors.info} />
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

      {/* ── Quick Actions ── */}
      <Button
        title="View My Payment Status →"
        onPress={() => navigation.navigate('MyPayment')}
        variant="outline"
        style={{ marginTop: SPACING.md }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },

  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  greeting:   { fontSize: 13 },
  userName:   { fontSize: 20, fontWeight: '800' },
  flat:       { fontSize: 12 },
  logoutBtn:  { fontWeight: '700', fontSize: 13 },

  eventCard: {
    borderRadius:    14,
    padding:         SPACING.md,
    marginBottom:    SPACING.md,
    borderWidth:     1,
    elevation:       2,
  },
  eventTitle: { fontSize: 17, fontWeight: '800', marginBottom: SPACING.sm },
  eventSub:   { fontSize: 12, marginTop: 4 },

  noEvent:    { padding: SPACING.lg, alignItems: 'center' },
  noEventText:{ fontStyle: 'italic' },

  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: SPACING.md, marginBottom: SPACING.xs },
  statsRow:     { flexDirection: 'row', marginHorizontal: -SPACING.xs },
});

export default DashboardScreen;
