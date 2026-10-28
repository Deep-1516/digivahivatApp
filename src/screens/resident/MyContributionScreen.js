/**
 * src/screens/resident/MyContributionScreen.js
 *
 * Shows the logged-in resident's contributions:
 *  • Tab 1: Event Falo (Active & Past events contributions)
 *  • Tab 2: Society Maintenance (Annual maintenance payments with receipts)
 * Each row has a "PDF Receipt" button that opens and downloads the receipt voucher.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth }        from '../../context/AuthContext';
import { useAlert }       from '../../context/AlertContext';
import { useTheme }       from '../../context/ThemeContext';
import { contributionsAPI } from '../../services/api';
import ContributionItem   from '../../components/ContributionItem';
import PdfReceiptModal   from '../../components/PdfReceiptModal';
import Icon              from '../../components/Icon';
import { COLORS, SPACING }  from '../../constants';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const MyContributionScreen = () => {
  const insets = useSafeAreaInsets();
  const { user }    = useAuth();
  const { showError } = useAlert();
  const { colors }  = useTheme();

  const [activeTab, setActiveTab] = useState('Event'); // 'Event' | 'Annual'
  const [items,     setItems]      = useState([]);
  const [total,     setTotal]      = useState(0);
  const [loading,   setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?._id) return;
    try {
      const res = await contributionsAPI.getAll({
        residentId: user._id,
        contributionType: activeTab,
      });
      const contribs = res.data?.data || [];
      setItems(contribs);
      setTotal(contribs.reduce((s, c) => s + (Number(c.amount) || 0), 0));
    } catch (err) {
      if (!err?.isSilent && !err?.isAuthError) {
        showError('Error', err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id, activeTab, showError]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handlePdfReceipt = (item) => {
    setSelectedReceipt(item);
    setShowReceiptModal(true);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>My Payments & Receipts</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {user?.houseOrFlatNo ? `Flat ${user.houseOrFlatNo}  ·  ` : ''}{user?.name}
            </Text>
          </View>
          {total > 0 && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Total Paid</Text>
              <Text style={[styles.totalAmount, { color: colors.success }]}>{fmt(total)}</Text>
            </View>
          )}
        </View>

        {/* ── Segmented Tab Selector ── */}
        <View style={[styles.tabBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'Event' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('Event')}
            activeOpacity={0.8}>
            <Icon
              name="calendar-star"
              size={15}
              color={activeTab === 'Event' ? '#FFFFFF' : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'Event' && styles.tabTextActive]}>
              Event Falo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'Annual' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('Annual')}
            activeOpacity={0.8}>
            <Icon
              name="cash-check"
              size={16}
              color={activeTab === 'Annual' ? '#FFFFFF' : colors.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'Annual' && styles.tabTextActive]}>
              Society Maintenance
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content List ── */}
      {loading ? (
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it._id}
          renderItem={({ item }) => (
            <ContributionItem item={item} onPressReceipt={handlePdfReceipt} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
                <Icon
                  name={activeTab === 'Annual' ? 'cash-remove' : 'calendar-blank'}
                  size={36}
                  color={colors.textMuted}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {activeTab === 'Annual' ? 'No Maintenance Records' : 'No Event Contributions'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {activeTab === 'Annual'
                  ? 'No maintenance payment receipts recorded for this flat yet.'
                  : 'You have not made contributions to any society event yet.'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.list}
        />
      )}

      {/* PDF Receipt Viewer Modal */}
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
  screen:    { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:    { padding: SPACING.md, borderBottomWidth: 1 },
  title:     { fontSize: 18, fontWeight: '800' },
  subtitle:  { fontSize: 12, marginTop: 2 },
  totalLabel: { fontSize: 10, fontWeight: '600' },
  totalAmount: { fontSize: 16, fontWeight: '900' },

  tabBar: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  list:      { padding: SPACING.md, paddingBottom: SPACING.xl },
  empty:     { alignItems: 'center', marginTop: 50, paddingHorizontal: 30 },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  emptySub:   { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});

export default MyContributionScreen;
