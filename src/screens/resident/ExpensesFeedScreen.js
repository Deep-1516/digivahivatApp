/**
 * src/screens/resident/ExpensesFeedScreen.js
 *
 * Shared between Resident and Admin tab.
 * Shows all expenses for the active event, category-grouped with totals.
 * Tap "View Bill" on an expense card to see the receipt image in a modal.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect }  from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import { expensesAPI, eventsAPI } from '../../services/api';
import ExpenseItem         from '../../components/ExpenseItem';
import StatCard            from '../../components/StatCard';
import { COLORS, SPACING }         from '../../constants';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const ExpensesFeedScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, isAdmin } = useAuth();
  const { showError, showSuccess, showAlert } = useAlert();
  const { colors }       = useTheme();
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
      setExpenses(res.data.data);
      setBreakdown(res.data.categoryBreakdown ?? []);
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleStatusUpdate = async (item, status, rejectionReason = '') => {
    try {
      await expensesAPI.updateStatus(item._id, status, rejectionReason);
      showSuccess('Updated ✅', `Expense status updated to ${status}.`);
      fetchData();
    } catch (err) {
      showError('Error', err.message);
    }
  };

  const handleRejectPrompt = (item) => {
    showAlert({
      title: 'Reject Expense ⚠️',
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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
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
        />
      )}
      ListHeaderComponent={
        <View>
          {/* Header row with Add Expense button */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Expenses Feed</Text>
                {activeEvent && <Text style={[styles.sub, { color: colors.textMuted }]}>{activeEvent.title}</Text>}
              </View>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('LogExpense')}>
                <Text style={styles.addBtnText}>+ Add Expense</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary row */}
          <View style={styles.summaryRow}>
            <StatCard label="Total Spent" value={fmt(totalSpend)} color={colors.danger} />
            <StatCard label="Entries"     value={String(expenses.length)} color={colors.info} />
          </View>

          {/* Category breakdown chips */}
          {breakdown.length > 0 && (
            <View style={styles.breakdownWrap}>
              {breakdown.map((b) => (
                <View key={b._id} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.chipLabel, { color: colors.textMuted }]}>{b._id}</Text>
                  <Text style={[styles.chipAmt, { color: colors.danger }]}>{fmt(b.total)}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>All Expenses</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No expenses recorded yet.</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  screen:       { flex: 1 },
  content:      { padding: SPACING.md, paddingBottom: SPACING.xl },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { marginBottom: SPACING.md },
  title:        { fontSize: 20, fontWeight: '800' },
  sub:          { fontSize: 13 },
  addBtn:       { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText:   { color: '#FFF', fontWeight: '700', fontSize: 12 },
  summaryRow:   { flexDirection: 'row', marginHorizontal: -SPACING.xs, marginBottom: SPACING.sm },
  breakdownWrap:{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.md },
  chip:         {
    borderRadius:    8,
    borderWidth:     1,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   4,
    marginRight:       SPACING.xs,
    marginBottom:      SPACING.xs,
  },
  chipLabel:    { fontSize: 11 },
  chipAmt:      { fontSize: 12, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '700', marginBottom: SPACING.sm },
  empty:        { alignItems: 'center', marginTop: 60 },
  emptyText:    { fontStyle: 'italic' },
});

export default ExpensesFeedScreen;
