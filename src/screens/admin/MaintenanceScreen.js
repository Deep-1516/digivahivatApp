/**
 * src/screens/admin/MaintenanceScreen.js
 *
 * Dedicated Society Maintenance Module:
 *  • Track society maintenance payments by flat and year.
 *  • View real-time collection metrics (Total Collected, Paid Flats, Pending Dues).
 *  • Filter by All, Paid, and Pending flats.
 *  • 1-tap collect maintenance for any flat with instant PDF receipt generation.
 *  • Fast search across flat number, name, and phone.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth }  from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import { residentsAPI, contributionsAPI } from '../../services/api';
import Input  from '../../components/Input';
import Button from '../../components/Button';
import Icon   from '../../components/Icon';
import PdfReceiptModal from '../../components/PdfReceiptModal';
import { COLORS, SPACING, PAYMENT_MODES, PAYMENT_STATUSES } from '../../constants';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const MaintenanceScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, isAdmin } = useAuth();
  const { showError, showSuccess, showAlert } = useAlert();
  const { colors } = useTheme();

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [residents, setResidents] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter tabs: 'All' | 'Paid' | 'Pending'
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');

  // Collect Maintenance Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  // Resident picker dropdown within modal
  const [residentPickerOpen, setResidentPickerOpen] = useState(false);
  const [residentSearchQuery, setResidentSearchQuery] = useState('');

  // PDF Receipt Viewer Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [resRes, cRes] = await Promise.all([
        residentsAPI.getAll(),
        contributionsAPI.getAll({ contributionType: 'Annual', annualYear: selectedYear }),
      ]);
      setResidents(resRes.data?.data?.residents || []);
      setContributions(cRes.data?.data || []);
    } catch (err) {
      if (!err?.isSilent && !err?.isAuthError) {
        showError('Error', err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, showError]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Map each resident to their maintenance status for selectedYear
  const flatMaintenanceData = useMemo(() => {
    // Map contribution by residentId
    const contribMap = {};
    contributions.forEach((c) => {
      const rId = c.residentId?._id || c.residentId;
      if (rId) contribMap[rId] = c;
    });

    return residents.map((r) => {
      const contrib = contribMap[r._id];
      const isPaid = !!contrib && (contrib.paymentStatus === 'Paid' || contrib.amount > 0);
      return {
        resident: r,
        contribution: contrib || null,
        isPaid,
        status: contrib ? contrib.paymentStatus : 'Pending',
        amount: contrib ? contrib.amount : 0,
        paidDate: contrib ? contrib.date : null,
      };
    });
  }, [residents, contributions]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalCollected = 0;
    let paidCount = 0;
    let pendingCount = 0;

    flatMaintenanceData.forEach((item) => {
      if (item.isPaid) {
        totalCollected += Number(item.amount || 0);
        paidCount++;
      } else {
        pendingCount++;
      }
    });

    return {
      totalCollected,
      paidCount,
      pendingCount,
      totalFlats: flatMaintenanceData.length,
    };
  }, [flatMaintenanceData]);

  // Filtered List
  const filteredList = useMemo(() => {
    return flatMaintenanceData.filter((item) => {
      // Tab filter
      if (activeTab === 'Paid' && !item.isPaid) return false;
      if (activeTab === 'Pending' && item.isPaid) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const nameMatch = item.resident.name?.toLowerCase().includes(q);
        const flatMatch = item.resident.houseOrFlatNo?.toLowerCase().includes(q);
        const phoneMatch = item.resident.phone?.includes(q);
        return nameMatch || flatMatch || phoneMatch;
      }
      return true;
    });
  }, [flatMaintenanceData, activeTab, search]);

  // Open modal pre-filling specific resident
  const handleOpenCollectForResident = (resident) => {
    setSelectedResident(resident);
    setAmount('');
    setPaymentMode('Cash');
    setPaymentStatus('Paid');
    setTransactionId('');
    setNotes('');
    setErrors({});
    setModalVisible(true);
  };

  const validate = () => {
    const e = {};
    if (!selectedResident) e.resident = 'Please select a flat/resident.';
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      e.amount = 'Please enter a valid maintenance amount.';
    }
    if (paymentMode === 'UPI' && paymentStatus === 'Paid' && !transactionId.trim()) {
      e.transactionId = 'Transaction ID is required for UPI payments.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRecordMaintenance = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        contributionType: 'Annual',
        annualYear:       selectedYear,
        residentId:       selectedResident._id,
        amount:           Number(amount),
        paymentMode,
        paymentStatus,
        transactionId:    paymentMode === 'UPI' ? transactionId.trim() : null,
        notes:            notes.trim(),
      };

      const res = await contributionsAPI.record(payload);
      const newRecord = res.data?.data;
      setModalVisible(false);

      if (newRecord?._id) {
        newRecord.residentId = newRecord.residentId || selectedResident;
        showAlert({
          title: 'Maintenance Recorded',
          message: `Maintenance payment of ${fmt(amount)} recorded for Flat ${selectedResident.houseOrFlatNo} (${selectedResident.name}).\n\nWould you like to view the official PDF receipt?`,
          type: 'success',
          buttons: [
            {
              text: 'View Receipt',
              primary: true,
              onPress: () => {
                setSelectedReceipt(newRecord);
                setShowReceiptModal(true);
              },
            },
            {
              text: 'Done',
              onPress: () => fetchData(),
            },
          ],
        });
      } else {
        showSuccess('Success', 'Maintenance payment recorded.');
      }
      fetchData();
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderFlatCard = ({ item }) => {
    const { resident, contribution, isPaid, status, amount: paidAmt, paidDate } = item;
    const dateStr = paidDate
      ? new Date(paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '';

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <View style={[styles.flatBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.flatBadgeText, { color: colors.primary }]}>
                  Flat {resident.houseOrFlatNo || '—'}
                </Text>
              </View>
              {isPaid ? (
                <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
                  <Icon name="check-circle" size={12} color={colors.success} style={{ marginRight: 3 }} />
                  <Text style={[styles.statusBadgeText, { color: colors.success }]}>Paid</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: colors.danger + '20' }]}>
                  <Icon name="alert-circle-outline" size={12} color={colors.danger} style={{ marginRight: 3 }} />
                  <Text style={[styles.statusBadgeText, { color: colors.danger }]}>Pending</Text>
                </View>
              )}
            </View>

            <Text style={[styles.residentName, { color: colors.text }]}>{resident.name}</Text>
            <Text style={[styles.residentPhone, { color: colors.textMuted }]}>{resident.phone}</Text>
          </View>

          <View style={styles.rightCol}>
            {isPaid ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.amountText, { color: colors.success }]}>{fmt(paidAmt)}</Text>
                <Text style={[styles.dateText, { color: colors.textMuted }]}>{dateStr}</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.dueText, { color: colors.danger }]}>Dues Pending</Text>
              </View>
            )}
          </View>
        </View>

        {/* Card Actions */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          {isPaid ? (
            <TouchableOpacity
              style={[styles.actionBtnOutline, { borderColor: colors.primary }]}
              onPress={() => {
                setSelectedReceipt(contribution);
                setShowReceiptModal(true);
              }}>
              <Icon name="file-pdf-box" size={16} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.actionBtnOutlineText, { color: colors.primary }]}>View PDF Receipt</Text>
            </TouchableOpacity>
          ) : isAdmin ? (
            <TouchableOpacity
              style={[styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
              onPress={() => handleOpenCollectForResident(resident)}>
              <Icon name="cash-plus" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnPrimaryText}>Collect Maintenance</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="clock-outline" size={14} color={colors.danger} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.danger }}>Pending Dues</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}>
      {/* ─── Top Header ─── */}
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
            <Text style={[styles.title, { color: colors.text }]}>Society Maintenance</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              Annual society fund & maintenance register
            </Text>
          </View>
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={[styles.collectBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setSelectedResident(null);
              setAmount('');
              setPaymentMode('Cash');
              setPaymentStatus('Paid');
              setTransactionId('');
              setNotes('');
              setErrors({});
              setModalVisible(true);
            }}
            activeOpacity={0.8}>
            <Icon name="plus" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.collectBtnText}>Record</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Year Selector Row ─── */}
      <View style={[styles.yearSelectorRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.yearLabel, { color: colors.textMuted }]}>Year:</Text>
        {YEAR_OPTIONS.map((yr) => {
          const isSelected = selectedYear === yr;
          return (
            <TouchableOpacity
              key={yr}
              style={[
                styles.yearPill,
                { borderColor: colors.border, backgroundColor: colors.background },
                isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
              ]}
              onPress={() => setSelectedYear(yr)}>
              <Text style={[styles.yearPillText, { color: colors.textMuted }, isSelected && { color: colors.primary, fontWeight: '800' }]}>
                {yr}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Metrics Summary Cards ─── */}
      <View style={styles.metricsContainer}>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>COLLECTED</Text>
          <Text style={[styles.metricVal, { color: colors.success }]}>{fmt(metrics.totalCollected)}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>PAID FLATS</Text>
          <Text style={[styles.metricVal, { color: colors.primary }]}>{metrics.paidCount} / {metrics.totalFlats}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>PENDING</Text>
          <Text style={[styles.metricVal, { color: colors.danger }]}>{metrics.pendingCount} Flats</Text>
        </View>
      </View>

      {/* ─── Search Bar ─── */}
      <View style={{ paddingHorizontal: SPACING.md, marginTop: 4 }}>
        <Input
          placeholder="Search by flat, name, or phone..."
          value={search}
          onChangeText={setSearch}
          containerStyle={{ marginBottom: 6 }}
        />
      </View>

      {/* ─── Filter Tabs ─── */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {[
          { key: 'All',     label: `All Flats (${flatMaintenanceData.length})` },
          { key: 'Paid',    label: `Paid (${metrics.paidCount})` },
          { key: 'Pending', label: `Pending (${metrics.pendingCount})` },
        ].map((t) => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabItem, isActive && { borderBottomColor: colors.primary }]}
              onPress={() => setActiveTab(t.key)}>
              <Text style={[styles.tabLabel, { color: colors.textMuted }, isActive && { color: colors.primary, fontWeight: '800' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Register List ─── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.resident._id}
          renderItem={renderFlatCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="cash-check" size={44} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No records found</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {activeTab === 'Pending'
                  ? 'Great! All society flats have paid maintenance for this year.'
                  : 'No residents matching your query.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ─── Record Maintenance Modal ─── */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.modalCard, { backgroundColor: colors.surface, paddingTop: Math.max(insets.top > 0 ? 16 : 24, 16) }]}>
            
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[styles.modalIconBadge, { backgroundColor: colors.primaryLight }]}>
                  <Icon name="cash-check" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Record Maintenance</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Year {selectedYear}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.background }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              {/* Resident / Flat Selector */}
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Select Flat & Resident *</Text>
              <TouchableOpacity
                style={[styles.dropdownSelector, { backgroundColor: colors.background, borderColor: colors.border }, errors.resident && styles.dropdownError]}
                onPress={() => {
                  setResidentSearchQuery('');
                  setResidentPickerOpen(true);
                }}>
                <View style={{ flex: 1 }}>
                  {selectedResident ? (
                    <Text style={[styles.selectedResidentText, { color: colors.text }]}>
                      Flat {selectedResident.houseOrFlatNo} — {selectedResident.name}
                    </Text>
                  ) : (
                    <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                      Tap to select resident flat...
                    </Text>
                  )}
                </View>
                <Icon name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {errors.resident ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.resident}</Text> : null}

              {/* Maintenance Year */}
              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 12 }]}>Maintenance Year *</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {YEAR_OPTIONS.map((yr) => (
                  <TouchableOpacity
                    key={yr}
                    style={[
                      styles.yearPill,
                      { flex: 1, alignItems: 'center', borderColor: colors.border, backgroundColor: colors.background },
                      selectedYear === yr && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => setSelectedYear(yr)}>
                    <Text style={[styles.yearPillText, { color: colors.textMuted }, selectedYear === yr && { color: colors.primary, fontWeight: '800' }]}>
                      {yr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Input
                label="Maintenance Amount (₹) *"
                placeholder="e.g. 1500"
                value={amount}
                onChangeText={(t) => { setAmount(t); setErrors((e) => ({ ...e, amount: '' })); }}
                keyboardType="numeric"
                error={errors.amount}
              />

              {/* Payment Mode */}
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Payment Mode</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {PAYMENT_MODES.map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modePill,
                      { flex: 1, borderColor: colors.border, backgroundColor: colors.background },
                      paymentMode === mode && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => setPaymentMode(mode)}>
                    <Icon
                      name={mode === 'Cash' ? 'cash' : 'qrcode-scan'}
                      size={16}
                      color={paymentMode === mode ? colors.primary : colors.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.modePillText, { color: colors.textMuted }, paymentMode === mode && { color: colors.primary, fontWeight: '800' }]}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* UPI Transaction ID if applicable */}
              {paymentMode === 'UPI' && (
                <Input
                  label="UPI Transaction ID / Ref No *"
                  placeholder="e.g. 423984928392"
                  value={transactionId}
                  onChangeText={(t) => { setTransactionId(t); setErrors((e) => ({ ...e, transactionId: '' })); }}
                  error={errors.transactionId}
                />
              )}

              {/* Notes */}
              <Input
                label="Notes (Optional)"
                placeholder="e.g. Paid in full for annual maintenance"
                value={notes}
                onChangeText={setNotes}
              />

              <Button
                title="Save & Generate PDF Receipt"
                onPress={handleRecordMaintenance}
                loading={submitting}
                style={{ marginTop: SPACING.md }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ─── Resident Picker Search Modal ─── */}
      <Modal visible={residentPickerOpen} animationType="slide" transparent={true} onRequestClose={() => setResidentPickerOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.pickerCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Resident Flat</Text>
              <TouchableOpacity onPress={() => setResidentPickerOpen(false)} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
                <Icon name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: SPACING.md, paddingBottom: 6 }}>
              <Input
                placeholder="Search by flat, name, or phone..."
                value={residentSearchQuery}
                onChangeText={setResidentSearchQuery}
                containerStyle={{ marginBottom: 4 }}
              />
            </View>

            <FlatList
              data={residents.filter((r) => {
                if (!residentSearchQuery.trim()) return true;
                const q = residentSearchQuery.toLowerCase().trim();
                return (
                  r.name?.toLowerCase().includes(q) ||
                  r.houseOrFlatNo?.toLowerCase().includes(q) ||
                  r.phone?.includes(q)
                );
              })}
              keyExtractor={(r) => r._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.residentPickerItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedResident(item);
                    setResidentPickerOpen(false);
                    setErrors((e) => ({ ...e, resident: '' }));
                  }}>
                  <View style={[styles.flatBadge, { backgroundColor: colors.primaryLight, marginRight: 10 }]}>
                    <Text style={[styles.flatBadgeText, { color: colors.primary }]}>
                      Flat {item.houseOrFlatNo}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerResidentName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.pickerResidentPhone, { color: colors.textMuted }]}>{item.phone}</Text>
                  </View>
                  <Icon name="chevron-right" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

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
  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  collectBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  yearSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  yearLabel: { fontSize: 12, fontWeight: '700' },
  yearPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  yearPillText: { fontSize: 12, fontWeight: '600' },

  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    gap: 6,
  },
  metricCard: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  metricLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5 },
  metricVal:   { fontSize: 14, fontWeight: '900', marginTop: 2 },

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
  tabLabel: { fontSize: 12.5, fontWeight: '700' },

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
  flatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  flatBadgeText: { fontSize: 11, fontWeight: '800' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: { fontSize: 10.5, fontWeight: '800' },
  residentName: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  residentPhone: { fontSize: 12, marginTop: 1 },

  rightCol: { alignItems: 'flex-end', justifyContent: 'center' },
  amountText: { fontSize: 16, fontWeight: '900' },
  dateText: { fontSize: 11, marginTop: 2 },
  dueText: { fontSize: 12, fontWeight: '800' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.2,
  },
  actionBtnOutlineText: { fontSize: 12, fontWeight: '700' },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnPrimaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 4 },

  // Modal styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '65%',
    flex: 1,
  },
  pickerCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  modalIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalSubtitle: { fontSize: 12, fontWeight: '500' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.2,
    marginBottom: 4,
  },
  dropdownError: { borderColor: '#F43F5E' },
  selectedResidentText: { fontSize: 14, fontWeight: '700' },
  placeholderText: { fontSize: 14 },
  errorText: { fontSize: 11, fontWeight: '600', marginBottom: 8 },

  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modePillText: { fontSize: 13, fontWeight: '600' },

  residentPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pickerResidentName: { fontSize: 14, fontWeight: '700' },
  pickerResidentPhone: { fontSize: 12, marginTop: 1 },
});

export default MaintenanceScreen;
