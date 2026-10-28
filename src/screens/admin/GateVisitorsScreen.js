/**
 * src/screens/admin/GateVisitorsScreen.js
 *
 * Security Guard / Society Admin Gate Console:
 * - Scan QR code or enter 6-digit passcode to verify pre-approved visitors
 * - Instantly see Visitor Name, Destination Flat, Member count, and Vehicle
 * - One-tap gate entry check-in (adds to active visitors list)
 * - Live "Currently Inside" register with 1-tap exit checkout.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ActivityIndicator, RefreshControl,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { visitorsAPI } from '../../services/api';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { COLORS, SPACING } from '../../constants';

const TABS = [
  { key: 'Inside',      label: 'Inside Now' },
  { key: 'PreApproved', label: 'Expected' },
  { key: 'Exited',      label: 'Exited' },
  { key: 'all',         label: 'All History' },
];

const GateVisitorsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showError, showSuccess, showConfirm } = useAlert();

  const [visitors,         setVisitors]         = useState([]);
  const [insideCount,      setInsideCount]      = useState(0);
  const [preApprovedCount, setPreApprovedCount] = useState(0);
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [activeTab,        setActiveTab]        = useState('Inside');
  const [search,           setSearch]           = useState('');

  // ─── Verify & Check-In Modal ───
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [passcodeInput,      setPasscodeInput]      = useState('');
  const [verifying,          setVerifying]          = useState(false);
  const [verifiedPass,       setVerifiedPass]       = useState(null);
  const [checkinMembers,     setCheckinMembers]     = useState(1);
  const [checkinVehicle,     setCheckinVehicle]     = useState('');
  const [checkingIn,         setCheckingIn]         = useState(false);

  const fetchRegister = useCallback(async () => {
    try {
      const res = await visitorsAPI.getSocietyRegister({
        status: activeTab === 'all' ? undefined : activeTab,
        search: search.trim() || undefined,
      });
      setVisitors(res.data?.data || []);
      setInsideCount(res.data?.insideCount || 0);
      setPreApprovedCount(res.data?.preApprovedCount || 0);
    } catch (err) {
      showError('Error', err.message || 'Could not load visitor register.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, search, showError]);

  useFocusEffect(useCallback(() => { fetchRegister(); }, [fetchRegister]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchRegister();
  };

  // ─── Verify Code / QR ───
  const handleVerify = async () => {
    if (!passcodeInput.trim()) {
      showError('Input Required', 'Please enter the 6-digit passcode or paste QR token.');
      return;
    }
    setVerifying(true);
    try {
      const res = await visitorsAPI.verify({ code: passcodeInput.trim() });
      const passData = res.data?.data;
      setVerifiedPass(passData);
      setCheckinMembers(passData.numberOfMembers || 1);
      setCheckinVehicle(passData.vehicleNumber || '');

      if (!res.data?.canCheckIn && !res.data?.canCheckOut) {
        showError('Pass Notice', res.data?.message || 'Cannot check in with this pass.');
      }
    } catch (err) {
      showError('Verification Failed', err.message || 'Passcode or QR not found in society.');
      setVerifiedPass(null);
    } finally {
      setVerifying(false);
    }
  };

  // ─── Confirm Check-In ───
  const handleConfirmCheckin = async () => {
    if (!verifiedPass) return;
    setCheckingIn(true);
    try {
      await visitorsAPI.checkin({
        visitorId:       verifiedPass._id,
        numberOfMembers: Math.max(Number(checkinMembers) || 1, 1),
        vehicleNumber:   checkinVehicle.trim(),
      });
      showSuccess(
        'Entry Approved',
        `Gate opened for ${verifiedPass.visitorName} (${checkinMembers} person${checkinMembers > 1 ? 's' : ''}) visiting Flat ${verifiedPass.flatNo}. Added to Inside list.`
      );
      setVerifyModalVisible(false);
      setVerifiedPass(null);
      setPasscodeInput('');
      fetchRegister();
    } catch (err) {
      showError('Check-in Failed', err.message || 'Could not log entry.');
    } finally {
      setCheckingIn(false);
    }
  };

  // ─── Record Checkout / Exit ───
  const handleCheckout = (visitor) => {
    showConfirm(
      'Visitor Exit',
      `Mark ${visitor.visitorName} (Flat ${visitor.flatNo}) as exited from society?`,
      async () => {
        try {
          await visitorsAPI.checkout(visitor._id);
          showSuccess('Exit Logged', `${visitor.visitorName} checked out successfully.`);
          fetchRegister();
        } catch (err) {
          showError('Checkout Failed', err.message || 'Could not mark exit.');
        }
      }
    );
  };

  const renderVisitorCard = ({ item }) => {
    const isInside = item.status === 'Inside';
    const isPreApproved = item.status === 'PreApproved';
    const isExited = item.status === 'Exited';

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

        {/* Header Strip */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.cardVisitorName, { color: colors.text }]}>{item.visitorName}</Text>
              <View style={[styles.typeBadge, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.typeBadgeText, { color: colors.primary }]}>{item.visitorType}</Text>
              </View>
            </View>

            {/* Destination & Host */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Icon name="home-outline" size={14} color={colors.primary} />
              <Text style={[styles.flatDestination, { color: colors.primary }]}>
                Flat {item.flatNo}
              </Text>
              <Text style={[styles.hostName, { color: colors.textMuted }]}>
                • Host: {item.residentId?.name || 'Resident'}
              </Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={[
            styles.statusPill,
            isInside && { backgroundColor: '#DCFCE7' },
            isPreApproved && { backgroundColor: '#EFF6FF' },
            isExited && { backgroundColor: colors.border },
          ]}>
            <Text style={[
              styles.statusPillText,
              isInside && { color: '#16A34A' },
              isPreApproved && { color: '#2563EB' },
              isExited && { color: colors.textMuted },
            ]}>
              {isInside ? 'INSIDE NOW' : isPreApproved ? 'EXPECTED' : 'EXITED'}
            </Text>
          </View>
        </View>

        {/* Member Count & Vehicle Info */}
        <View style={[styles.detailsRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="account-group" size={14} color={colors.text} />
            <Text style={[styles.detailItemText, { color: colors.text }]}>
              {item.numberOfMembers || 1} Person(s)
            </Text>
          </View>

          {item.vehicleNumber ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="car-outline" size={14} color={colors.text} />
              <Text style={[styles.detailItemText, { color: colors.text }]}>{item.vehicleNumber}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="qrcode" size={13} color={colors.textMuted} />
            <Text style={[styles.detailItemText, { color: colors.textMuted }]}>#{item.passcode}</Text>
          </View>
        </View>

        {/* Timestamps */}
        <View style={styles.timestampRow}>
          {item.entryTime ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="login" size={12} color="#16A34A" />
              <Text style={[styles.timeText, { color: colors.textMuted }]}>
                In: {new Date(item.entryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
            </View>
          ) : (
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              Pre-approved for {new Date(item.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </Text>
          )}

          {item.exitTime && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="logout" size={12} color="#DC2626" />
              <Text style={[styles.timeText, { color: colors.textMuted }]}>
                Out: {new Date(item.exitTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
            </View>
          )}
        </View>

        {/* Gate Actions */}
        {isInside && (
          <TouchableOpacity
            style={[styles.checkoutBtn, { backgroundColor: colors.danger + '18', borderColor: colors.danger }]}
            onPress={() => handleCheckout(item)}
            activeOpacity={0.8}>
            <Icon name="exit-to-app" size={16} color={colors.danger} style={{ marginRight: 6 }} />
            <Text style={[styles.checkoutBtnText, { color: colors.danger }]}>Record Exit / Check Out</Text>
          </TouchableOpacity>
        )}

        {isPreApproved && (
          <TouchableOpacity
            style={[styles.quickCheckinBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setVerifiedPass(item);
              setCheckinMembers(item.numberOfMembers || 1);
              setCheckinVehicle(item.vehicleNumber || '');
              setVerifyModalVisible(true);
            }}
            activeOpacity={0.8}>
            <Icon name="door-open" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.quickCheckinBtnText}>Check In at Gate</Text>
          </TouchableOpacity>
        )}

      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}>

      {/* Header */}
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
            <Text style={[styles.title, { color: colors.text }]}>Security Gate Register</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>Scan QR & monitor society visitors</Text>
          </View>
        </View>
      </View>

      {/* Top Action Bar — Big "Verify Pass" Button */}
      <View style={styles.scanActionBox}>
        <TouchableOpacity
          style={[styles.verifyTriggerBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            setVerifiedPass(null);
            setPasscodeInput('');
            setVerifyModalVisible(true);
          }}
          activeOpacity={0.85}>
          <Icon name="qrcode-scan" size={20} color="#FFFFFF" />
          <Text style={styles.verifyTriggerText}>Scan QR / Enter Passcode</Text>
        </TouchableOpacity>
      </View>

      {/* Metric Counters Strip */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
          <Text style={[styles.metricCount, { color: '#16A34A' }]}>{insideCount}</Text>
          <Text style={[styles.metricLabel, { color: '#15803D' }]}>Inside Now</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <Text style={[styles.metricCount, { color: '#2563EB' }]}>{preApprovedCount}</Text>
          <Text style={[styles.metricLabel, { color: '#1D4ED8' }]}>Expected Passes</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.metricCount, { color: colors.text }]}>{visitors.length}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Today's Total</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={{ paddingHorizontal: SPACING.md, marginTop: 4 }}>
        <Input
          placeholder="Search by name, flat, phone, or vehicle..."
          value={search}
          onChangeText={setSearch}
          containerStyle={{ marginBottom: 4 }}
        />
      </View>

      {/* Filter Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((t) => {
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

      {/* Register List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={visitors}
          keyExtractor={(it) => it._id}
          renderItem={renderVisitorCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="shield-account" size={44} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No visitors found</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {activeTab === 'Inside'
                  ? 'No visitors are currently inside the society.'
                  : 'Tap "Scan QR / Enter Passcode" to verify a guest pass.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ─── Verification & Check-In Modal ─── */}
      <Modal visible={verifyModalVisible} animationType="slide" transparent={true} onRequestClose={() => setVerifyModalVisible(false)}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.modalCard, { backgroundColor: colors.surface, paddingTop: Math.max(insets.top > 0 ? 16 : 24, 16) }]}>

            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[styles.modalIconBadge, { backgroundColor: colors.primary + '18' }]}>
                  <Icon name="qrcode-scan" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Gate Pass Verifier</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Enter 6-digit passcode or scan QR</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setVerifyModalVisible(false)} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
                <Icon name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Input Box */}
              {!verifiedPass ? (
                <View>
                  <Text style={[styles.inputHeading, { color: colors.text }]}>Enter Visitor Passcode</Text>
                  <Text style={[styles.inputSub, { color: colors.textMuted }]}>
                    Ask the visitor for their 6-digit passcode or QR code token:
                  </Text>

                  <Input
                    placeholder="e.g. 849201 or PASS-..."
                    value={passcodeInput}
                    onChangeText={setPasscodeInput}
                    autoCapitalize="characters"
                    containerStyle={{ marginTop: 8 }}
                  />

                  <Button
                    title="Verify Passcode"
                    onPress={handleVerify}
                    loading={verifying}
                    style={{ marginTop: 4 }}
                  />
                </View>
              ) : (

                /* ─── Verified Pass Details Card ─── */
                <View style={styles.verifiedBox}>

                  {/* Top Success Banner */}
                  <View style={styles.verifiedBanner}>
                    <Icon name="check-circle" size={22} color="#16A34A" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verifiedBannerTitle}>VALID PRE-APPROVED PASS</Text>
                      <Text style={styles.verifiedBannerSub}>Code #{verifiedPass.passcode} • Approved by Host</Text>
                    </View>
                  </View>

                  {/* Destination Card */}
                  <View style={[styles.destCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.destLabel, { color: colors.textMuted }]}>DESTINATION FLAT</Text>
                    <Text style={[styles.destFlat, { color: colors.primary }]}>Flat {verifiedPass.flatNo}</Text>
                    <Text style={[styles.destHost, { color: colors.text }]}>Host: {verifiedPass.residentId?.name || 'Resident'}</Text>
                    {verifiedPass.residentId?.phone ? (
                      <Text style={[styles.destPhone, { color: colors.textMuted }]}>Phone: {verifiedPass.residentId.phone}</Text>
                    ) : null}
                  </View>

                  {/* Visitor Information */}
                  <View style={styles.visitorMetaBox}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaItemLabel}>VISITOR NAME</Text>
                      <Text style={[styles.metaItemVal, { color: colors.text }]}>{verifiedPass.visitorName}</Text>
                    </View>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaItemLabel}>VISITOR TYPE</Text>
                      <Text style={[styles.metaItemVal, { color: colors.primary }]}>{verifiedPass.visitorType}</Text>
                    </View>
                  </View>

                  {/* Adjustable Member Count */}
                  <View style={styles.stepperContainer}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepperTitle, { color: colors.text }]}>Number of Persons</Text>
                      <Text style={[styles.stepperHint, { color: colors.textMuted }]}>Adjust if more people arrived</Text>
                    </View>
                    <View style={[styles.stepperControls, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <TouchableOpacity
                        style={styles.stepperStepBtn}
                        onPress={() => setCheckinMembers((prev) => Math.max(1, prev - 1))}>
                        <Icon name="minus" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperValText, { color: colors.text }]}>{checkinMembers}</Text>
                      <TouchableOpacity
                        style={styles.stepperStepBtn}
                        onPress={() => setCheckinMembers((prev) => prev + 1)}>
                        <Icon name="plus" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Vehicle Number (Optional / Editable) */}
                  <Input
                    label="Vehicle Number (Optional)"
                    placeholder="e.g. MH-04-AB-1234"
                    value={checkinVehicle}
                    onChangeText={setCheckinVehicle}
                    autoCapitalize="characters"
                  />

                  {/* Big Confirm Button */}
                  <TouchableOpacity
                    style={[styles.allowGateBtn, { backgroundColor: '#16A34A' }]}
                    onPress={handleConfirmCheckin}
                    disabled={checkingIn}
                    activeOpacity={0.85}>
                    {checkingIn ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Icon name="door-open" size={20} color="#FFFFFF" />
                        <Text style={styles.allowGateBtnText}>ALLOW ENTRY & OPEN GATE</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resetVerificationBtn}
                    onPress={() => { setVerifiedPass(null); setPasscodeInput(''); }}>
                    <Text style={[styles.resetVerificationText, { color: colors.textMuted }]}>Verify a different pass</Text>
                  </TouchableOpacity>
                </View>
              )}

            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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

  scanActionBox: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  verifyTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
  },
  verifyTriggerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricCount: { fontSize: 18, fontWeight: '900' },
  metricLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },

  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.sm,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {},
  tabLabel: { fontSize: 12, fontWeight: '700' },
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
  cardVisitorName: { fontSize: 15, fontWeight: '800' },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  flatDestination: { fontSize: 13, fontWeight: '800' },
  hostName: { fontSize: 12 },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillText: { fontSize: 10.5, fontWeight: '800' },

  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  detailItemText: { fontSize: 12, fontWeight: '600' },

  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: { fontSize: 11, fontWeight: '500' },

  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.2,
    marginTop: 8,
  },
  checkoutBtnText: { fontSize: 12, fontWeight: '800' },

  quickCheckinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  quickCheckinBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 4 },

  // ─── Modal Styles ───
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '60%',
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
  inputHeading: { fontSize: 15, fontWeight: '800' },
  inputSub: { fontSize: 12, marginTop: 2, marginBottom: 8 },

  verifiedBox: {},
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    padding: SPACING.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
    gap: 8,
    marginBottom: SPACING.md,
  },
  verifiedBannerTitle: { fontSize: 13, fontWeight: '900', color: '#16A34A' },
  verifiedBannerSub: { fontSize: 11, color: '#15803D' },

  destCard: {
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  destLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  destFlat: { fontSize: 18, fontWeight: '900', marginVertical: 2 },
  destHost: { fontSize: 13, fontWeight: '700' },
  destPhone: { fontSize: 11, marginTop: 1 },

  visitorMetaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  metaCol: { flex: 1 },
  metaItemLabel: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  metaItemVal: { fontSize: 14, fontWeight: '800', marginTop: 2 },

  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  stepperTitle: { fontSize: 13, fontWeight: '700' },
  stepperHint: { fontSize: 11, marginTop: 1 },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stepperStepBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  stepperValText: { fontSize: 15, fontWeight: '800', paddingHorizontal: 8, minWidth: 28, textAlign: 'center' },

  allowGateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: SPACING.sm,
    elevation: 3,
  },
  allowGateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resetVerificationBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resetVerificationText: { fontSize: 12, fontWeight: '600' },
});

export default GateVisitorsScreen;
