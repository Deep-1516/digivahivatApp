/**
 * src/screens/resident/ExpensesFeedScreen.js
 *
 * Shared between Resident and Admin tab.
 * Shows all expenses for the active event, category-grouped with totals.
 * Styled with custom brand palette: Background #FFFFFF, Primary #00AFEF, Secondary #3E4095, Dark #1E1E1E.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect }  from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { expensesAPI, eventsAPI } from '../../services/api';
import ExpenseItem         from '../../components/ExpenseItem';
import StatCard            from '../../components/StatCard';
import { SPACING }         from '../../constants';
import Icon                from '../../components/Icon';

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

const ExpensesFeedScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, isAdmin } = useAuth();
  const { showError, showSuccess, showAlert } = useAlert();
  const [expenses,    setExpenses]   = useState([]);
  const [breakdown,   setBreakdown]  = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [refreshing,  setRefreshing] = useState(false);
  const [activeEvent, setActiveEvent]= useState(null);

  const fetchData = useCallback(async () => {
    try {
      const evRes = await eventsAPI.getAll();
      const ev    = evRes.data.data.find((e) => e.isActive) ?? evRes.data.data[0];
      setActiveEvent(ev ?? null);

      // Fetch all expenses for the society so expenses for any event display in feed
      const res = await expensesAPI.getAll(ev ? { eventId: ev._id } : {});
      setExpenses(res.data.data || []);
      setBreakdown(res.data.categoryBreakdown ?? []);
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleStatusUpdate = async (item, status, rejectionReason = '') => {
    try {
      await expensesAPI.updateStatus(item._id, status, rejectionReason);
      showSuccess('Updated', `Expense status updated to ${status}.`);
      fetchData();
    } catch (err) {
      showError('Error', err.message);
    }
  };

  const handleRejectPrompt = (item) => {
    showAlert({
      title: 'Reject Expense',
      message: `Reject "${item.title}" (₹${item.amount.toLocaleString('en-IN')})? Choose a rejection reason:`,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Receipt Missing',
          onPress: () => handleStatusUpdate(item, 'Rejected', 'Receipt or bill image is missing / unclear.'),
        },
        {
          text: 'Incorrect Amount',
          onPress: () => handleStatusUpdate(item, 'Rejected', 'Expense amount or details appear incorrect.'),
        },
        {
          text: 'Invalid / Duplicate',
          onPress: () => handleStatusUpdate(item, 'Rejected', 'Invalid or duplicate expense submission.'),
        },
      ],
    });
  };

  // Only Approved expenses count toward Total Spent in summary
  const approvedExpenses = expenses.filter((e) => e.status === 'Approved');
  const totalSpend = approvedExpenses.reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: THEME.background }]}>
        <ActivityIndicator color={THEME.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: THEME.background, paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <FlatList
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />}
        data={expenses}
        keyExtractor={(it) => it._id}
        renderItem={({ item }) => (
          <ExpenseItem
            item={item}
            isAdmin={isAdmin}
            currentUserId={user?._id}
            onApprove={(it) => handleStatusUpdate(it, 'Approved')}
            onReject={(it) => handleRejectPrompt(it)}
            onEdit={(it) => navigation.navigate('LogExpense', { expense: it })}
            isLight
          />
        )}
        ListHeaderComponent={
          <View>
            {/* Header row with Add Expense button */}
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.title}>Society Expenses</Text>
                  {activeEvent ? (
                    <View style={styles.eventPill}>
                      <Icon name="calendar-month-outline" size={13} color={THEME.secondary} style={{ marginRight: 4 }} />
                      <Text style={styles.sub}>{activeEvent.title}</Text>
                    </View>
                  ) : (
                    <Text style={styles.subMuted}>All Society Records</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.addBtn}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('LogExpense')}>
                  <Icon name="plus" size={15} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={styles.addBtnText}>Add Expense</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Summary row with StatCards */}
            <View style={styles.summaryRow}>
              <StatCard
                label="Total Spent"
                value={fmt(totalSpend)}
                color={THEME.danger}
                icon="arrow-top-right"
                style={styles.statCardOverride}
                isLight
              />
              <StatCard
                label="Total Entries"
                value={`${expenses.length} Records`}
                color={THEME.secondary}
                icon="receipt-text-outline"
                style={styles.statCardOverride}
                isLight
              />
            </View>

            {/* Category breakdown chips */}
            {breakdown.length > 0 && (
              <View style={styles.breakdownSection}>
                <View style={styles.sectionHeaderRow}>
                  <View style={[styles.sectionDot, { backgroundColor: THEME.secondary }]} />
                  <Text style={styles.sectionHeaderTitle}>Category Breakdown</Text>
                </View>
                <View style={styles.breakdownWrap}>
                  {breakdown.map((b) => (
                    <View key={b._id} style={styles.chip}>
                      <Text style={styles.chipLabel}>{b._id}</Text>
                      <Text style={styles.chipAmt}>{fmt(b.total)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* All Expenses Section Header */}
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionDot, { backgroundColor: THEME.primary }]} />
              <Text style={styles.sectionTitle}>All Expenses</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{expenses.length}</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Icon name="receipt-text-outline" size={32} color={THEME.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No expenses recorded yet.</Text>
            <Text style={styles.emptyText}>Tap "+ Add Expense" above to record a new bill or receipt.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen:       { flex: 1 },
  content:      { padding: SPACING.md, paddingBottom: SPACING.xl * 1.5 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:       { marginBottom: SPACING.md },
  title:        { fontSize: 24, fontWeight: '900', color: THEME.dark, letterSpacing: -0.4 },
  eventPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(62, 64, 149, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  sub:          { fontSize: 12, fontWeight: '700', color: THEME.secondary },
  subMuted:     { fontSize: 12, color: THEME.textMuted, marginTop: 2, fontWeight: '500' },

  addBtn: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    elevation: 2.5,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  addBtnText:   { color: '#FFF', fontWeight: '800', fontSize: 13 },

  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.sm,
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

  breakdownSection: {
    marginBottom: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs + 2,
  },
  sectionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sectionHeaderTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: THEME.dark,
    letterSpacing: -0.2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.dark,
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: THEME.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.textMuted,
  },

  breakdownWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  chip: {
    backgroundColor: THEME.surface,
    borderColor: THEME.border,
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 1,
    shadowColor: THEME.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  chipLabel:    { fontSize: 11.5, fontWeight: '600', color: THEME.textMuted },
  chipAmt:      { fontSize: 12, fontWeight: '800', color: THEME.danger },

  empty: {
    alignItems: 'center',
    marginTop: 40,
    padding: SPACING.lg,
    backgroundColor: THEME.surfaceSubtle,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: THEME.border,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: THEME.dark, marginBottom: 4 },
  emptyText:  { fontSize: 12.5, color: THEME.textMuted, textAlign: 'center', lineHeight: 17 },
});

export default ExpensesFeedScreen;
