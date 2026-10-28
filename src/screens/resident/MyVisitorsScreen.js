/**
 * src/screens/resident/MyVisitorsScreen.js
 *
 * Resident view of all pre-approved gate passes, visitor QR codes,
 * and entry/exit history for their flat.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { visitorsAPI } from '../../services/api';
import PreApproveVisitorModal from '../../components/PreApproveVisitorModal';
import Icon from '../../components/Icon';
import { SPACING } from '../../constants';

const FILTER_TABS = [
  { key: 'all',         label: 'All' },
  { key: 'PreApproved', label: 'Expected' },
  { key: 'Inside',      label: 'Inside Now' },
  { key: 'Exited',      label: 'Exited' },
];

const MyVisitorsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showError, showSuccess, showConfirm } = useAlert();

  const [visitors,     setVisitors]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activeTab,    setActiveTab]    = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPass, setSelectedPass] = useState(null);

  const fetchVisitors = useCallback(async () => {
    try {
      const res = await visitorsAPI.getMyVisitors();
      setVisitors(res.data?.data || []);
    } catch (err) {
      showError('Error', err.message || 'Could not fetch visitors.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useFocusEffect(useCallback(() => { fetchVisitors(); }, [fetchVisitors]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchVisitors();
  };

  const handleCancelPass = (item) => {
    showConfirm(
      'Cancel Gate Pass',
      `Cancel the pre-approved pass for ${item.visitorName}? The visitor will not be allowed gate entry.`,
      async () => {
        try {
          await visitorsAPI.cancel(item._id);
          showSuccess('Cancelled', 'Gate pass cancelled.');
          fetchVisitors();
        } catch (err) {
          showError('Failed', err.message || 'Could not cancel pass.');
        }
      }
    );
  };

  const filteredVisitors = visitors.filter((v) => {
    if (activeTab === 'all') return true;
    return v.status === activeTab;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Inside':
        return { label: 'INSIDE NOW', bg: '#DCFCE7', color: '#16A34A', icon: 'door-open' };
      case 'PreApproved':
        return { label: 'PRE-APPROVED', bg: '#EFF6FF', color: '#2563EB', icon: 'clock-check-outline' };
      case 'Exited':
        return { label: 'EXITED', bg: colors.border, color: colors.textMuted, icon: 'exit-run' };
      case 'Cancelled':
        return { label: 'CANCELLED', bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle-outline' };
      default:
        return { label: status, bg: colors.border, color: colors.textMuted, icon: 'help-circle-outline' };
    }
  };

  const renderVisitorCard = ({ item }) => {
    const badge = getStatusBadge(item.status);
    const dateFormatted = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short',
    });

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.visitorName, { color: colors.text }]}>{item.visitorName}</Text>
              <View style={[styles.typeBadge, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.typeText, { color: colors.primary }]}>{item.visitorType}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="account-group" size={13} color={colors.textMuted} />
                <Text style={[styles.subText, { color: colors.textMuted }]}>
                  {item.numberOfMembers || 1} Person(s)
                </Text>
              </View>
              {item.vehicleNumber ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="car-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.subText, { color: colors.textMuted }]}>{item.vehicleNumber}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Icon name={badge.icon} size={11} color={badge.color} />
            <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Passcode & QR Row */}
        <View style={[styles.passcodeStrip, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="qrcode" size={16} color={colors.primary} />
            <Text style={[styles.passcodeKey, { color: colors.textMuted }]}>Passcode:</Text>
            <Text style={[styles.passcodeVal, { color: colors.primary }]}>{item.passcode}</Text>
          </View>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>{dateFormatted}</Text>
        </View>

        {/* Time stamps */}
        {item.entryTime && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <Icon name="login" size={12} color="#16A34A" />
            <Text style={[styles.timeDetail, { color: colors.textMuted }]}>
              Entry: {new Date(item.entryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </Text>
            {item.exitTime && (
              <>
                <Text style={{ color: colors.textMuted }}> • </Text>
                <Icon name="logout" size={12} color="#DC2626" />
                <Text style={[styles.timeDetail, { color: colors.textMuted }]}>
                  Exit: {new Date(item.exitTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {item.status === 'PreApproved' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.btnAction, { backgroundColor: colors.primary }]}
              onPress={() => setSelectedPass(item)}>
              <Icon name="qrcode-scan" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.btnActionText}>View QR Gate Pass</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnCancel, { borderColor: colors.danger + '40' }]}
              onPress={() => handleCancelPass(item)}>
              <Text style={[styles.btnCancelText, { color: colors.danger }]}>Cancel Pass</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}>

      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {navigation?.canGoBack?.() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginRight: 10, padding: 4 }}>
              <Icon name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Gate Passes & Visitors</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>Pre-approved passes for guests & deliveries</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => { setSelectedPass(null); setModalVisible(true); }}>
          <Icon name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.newBtnText}>New Pass</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {FILTER_TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabItem, isActive && [styles.tabItemActive, { borderBottomColor: colors.primary }]]}
              onPress={() => setActiveTab(t.key)}>
              <Text style={[styles.tabLabel, { color: colors.textMuted }, isActive && [styles.tabLabelActive, { color: colors.primary }]]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredVisitors}
          keyExtractor={(it) => it._id}
          renderItem={renderVisitorCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="shield-account-outline" size={44} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No visitors found</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {activeTab === 'all'
                  ? 'Tap "+ New Pass" to generate an instant QR gate pass for your guests.'
                  : `No visitors with status "${activeTab}".`}
              </Text>
            </View>
          }
        />
      )}

      {/* Create / View Gate Pass Modal */}
      <PreApproveVisitorModal
        visible={modalVisible || !!selectedPass}
        onClose={() => { setModalVisible(false); setSelectedPass(null); }}
        onSuccess={() => { fetchVisitors(); }}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '800' },
  sub:   { fontSize: 12, marginTop: 2 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  newBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.sm,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {},
  tabLabel: { fontSize: 12.5, fontWeight: '700' },
  tabLabelActive: { fontWeight: '800' },

  list: { padding: SPACING.md, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    borderRadius: 18,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    elevation: 2.5,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  visitorName: { fontSize: 15, fontWeight: '800' },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  subText: { fontSize: 12 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusBadgeText: { fontSize: 10.5, fontWeight: '800' },

  passcodeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  passcodeKey: { fontSize: 11, fontWeight: '600' },
  passcodeVal: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  dateText: { fontSize: 11 },

  timeDetail: { fontSize: 11, fontWeight: '500' },

  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.sm,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F060',
  },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnActionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  btnCancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: { fontWeight: '700', fontSize: 12 },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 4 },
});

export default MyVisitorsScreen;
