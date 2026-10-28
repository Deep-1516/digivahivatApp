/**
 * src/screens/admin/CollectFaloScreen.js
 *
 * Admin form to record a Falo (contribution) payment.
 *  • Resident picker (dropdown from API)
 *  • Amount field
 *  • Cash / UPI toggle
 *  • UPI Transaction ID (shown conditionally)
 *  • Payment Status selector
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, ActivityIndicator, Modal,
  TextInput, FlatList, SafeAreaView, Linking,
} from 'react-native';
import { residentsAPI, eventsAPI, contributionsAPI } from '../../services/api';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import Input  from '../../components/Input';
import Button from '../../components/Button';
import PdfReceiptModal from '../../components/PdfReceiptModal';
import { COLORS, SPACING, PAYMENT_MODES, PAYMENT_STATUSES, getEventStatus } from '../../constants';
import Icon from '../../components/Icon';

const CollectFaloScreen = ({ navigation, route }) => {
  const { showError, showSuccess, showAlert } = useAlert();
  const { colors } = useTheme();
  const [residents,  setResidents]  = useState([]);
  const [events,     setEvents]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedReceipt,  setSelectedReceipt]  = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const [selectedResident, setSelectedResident] = useState(null);
  const [selectedEvent,    setSelectedEvent]    = useState(null);
  const [amount,           setAmount]           = useState('');
  const [paymentMode,      setPaymentMode]      = useState('Cash');
  const [paymentStatus,    setPaymentStatus]    = useState('Paid');
  const [transactionId,    setTransactionId]    = useState('');
  const [notes,            setNotes]            = useState('');
  const [errors,           setErrors]           = useState({});

  // Modal & search states
  const [eventModalVisible,    setEventModalVisible]    = useState(false);
  const [residentModalVisible, setResidentModalVisible] = useState(false);
  const [eventSearchQuery,     setEventSearchQuery]     = useState('');
  const [residentSearchQuery,  setResidentSearchQuery]  = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [rRes, eRes] = await Promise.all([residentsAPI.getAll(), eventsAPI.getAll()]);
        setResidents(rRes.data.data.residents || []);
        const activeEvents = (eRes.data.data || []).filter((e) => getEventStatus(e) === 'active');
        setEvents(activeEvents);
        const passedEvent = route.params?.event;
        if (passedEvent) {
          const match = activeEvents.find((e) => e._id === passedEvent._id) || passedEvent;
          setSelectedEvent(match);
          if (match.perHouseAmount > 0) {
            setAmount(String(match.perHouseAmount));
          }
        } else if (activeEvents.length > 0) {
          const defaultEvent = activeEvents[0];
          setSelectedEvent(defaultEvent);
          if (defaultEvent.perHouseAmount > 0) {
            setAmount(String(defaultEvent.perHouseAmount));
          }
        }
      } catch (err) {
        showError('Error', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const validate = () => {
    const e = {};
    if (!selectedResident) {
      e.resident = 'Please select a resident.';
    } else if (
      selectedEvent?.excludedResidents?.some((x) => (x._id || x) === selectedResident._id)
    ) {
      e.resident = `${selectedResident.name} is excluded from "${selectedEvent.title}" and cannot pay for this event.`;
    }
    if (!selectedEvent) e.event = 'Please select an event.';
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = 'Enter a valid amount.';
    if (paymentMode === 'UPI' && paymentStatus === 'Paid' && !transactionId.trim())
      e.transactionId = 'Transaction ID is required for UPI payments.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        contributionType: 'Event',
        eventId:       selectedEvent._id,
        residentId:    selectedResident._id,
        amount:        Number(amount),
        paymentMode,
        paymentStatus,
        transactionId: paymentMode === 'UPI' ? transactionId.trim() : null,
        notes:         notes.trim(),
      };

      const res = await contributionsAPI.record(payload);
      const newContrib = res.data?.data;
      if (newContrib?._id) {
        newContrib.residentId = newContrib.residentId || selectedResident;
        newContrib.eventId = newContrib.eventId || selectedEvent;
        showAlert({
          title: 'Payment Recorded',
          message: `Payment of ₹${Number(amount).toLocaleString('en-IN')} recorded for ${selectedResident.name}.\n\nWould you like to view & download the official PDF receipt voucher?`,
          type: 'success',
          buttons: [
            {
              text: 'View PDF Receipt',
              primary: true,
              onPress: () => {
                setSelectedReceipt(newContrib);
                setShowReceiptModal(true);
              },
            },
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
            },
          ],
        });
      } else {
        showSuccess('Success', 'Payment recorded successfully.', () => navigation.goBack());
      }
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (!eventSearchQuery.trim()) return true;
    return ev.title.toLowerCase().includes(eventSearchQuery.toLowerCase().trim());
  });

  const filteredResidents = residents.filter((r) => {
    if (!residentSearchQuery.trim()) return true;
    const q = residentSearchQuery.toLowerCase().trim();
    const nameMatch = r.name?.toLowerCase().includes(q);
    const flatMatch = r.houseOrFlatNo?.toLowerCase().includes(q);
    const phoneMatch = r.phone?.includes(q);
    return nameMatch || flatMatch || phoneMatch;
  });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* ─── Event Selector ─── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Event *</Text>
        <TouchableOpacity
          style={[styles.dropdownSelector, { backgroundColor: colors.surface, borderColor: colors.border }, errors.event && styles.dropdownError]}
          activeOpacity={0.7}
          onPress={() => { setEventSearchQuery(''); setEventModalVisible(true); }}>
          <View style={{ flex: 1 }}>
            <Text style={selectedEvent ? [styles.dropdownSelectedText, { color: colors.text }] : [styles.dropdownPlaceholderText, { color: colors.textMuted }]}>
              {selectedEvent ? selectedEvent.title : 'Select Event'}
            </Text>
            {selectedEvent?.perHouseAmount > 0 && (
              <Text style={[styles.dropdownSubText, { color: colors.primary }]}>Default per house: ₹{selectedEvent.perHouseAmount}</Text>
            )}
          </View>
          <Icon name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        {errors.event && <Text style={styles.error}>{errors.event}</Text>}

        {/* ─── Resident Dropdown Picker ─── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Resident *</Text>
        <TouchableOpacity
          style={[styles.dropdownSelector, { backgroundColor: colors.surface, borderColor: colors.border }, errors.resident && styles.dropdownError]}
          activeOpacity={0.7}
          onPress={() => { setResidentSearchQuery(''); setResidentModalVisible(true); }}>
          <View style={{ flex: 1 }}>
            {selectedResident ? (
              <>
                <Text style={[styles.dropdownSelectedText, { color: colors.text }]}>
                  {selectedResident.name}
                  {selectedResident.houseOrFlatNo ? `  ·  Flat ${selectedResident.houseOrFlatNo}` : ''}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Icon name="phone-outline" size={12} color={colors.primary} style={{ marginRight: 3 }} />
                  <Text style={[styles.dropdownSubText, { color: colors.primary, marginTop: 0 }]}>{selectedResident.phone}</Text>
                </View>
              </>
            ) : (
              <Text style={[styles.dropdownPlaceholderText, { color: colors.textMuted }]}>Search & Select Resident ({residents.length} available)</Text>
            )}
          </View>
          <Icon name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        {errors.resident && <Text style={styles.error}>{errors.resident}</Text>}

        {/* Selected resident summary card */}
        {selectedResident && (
          <View style={[styles.selectedSummary, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' }]}>
            <View style={[styles.summaryAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.summaryAvatarText}>{selectedResident.name?.[0]?.toUpperCase() || 'R'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.selectedName, { color: colors.text }]}>{selectedResident.name}</Text>
              <Text style={[styles.selectedDetails, { color: colors.textMuted }]}>
                {selectedResident.houseOrFlatNo ? `Flat ${selectedResident.houseOrFlatNo}  •  ` : ''}
                {selectedResident.phone}
              </Text>
              {selectedEvent?.excludedResidents?.some((x) => (x._id || x) === selectedResident._id) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Icon name="account-cancel-outline" size={13} color={colors.danger} style={{ marginRight: 3 }} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.danger }}>
                    EXCLUDED from {selectedEvent.title}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => setSelectedResident(null)}>
              <Icon name="close" size={18} color={colors.textMuted} style={{ padding: 4 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Amount ─── */}
        <Input
          label="Amount (₹) *"
          placeholder="e.g. 500"
          value={amount}
          onChangeText={(t) => { setAmount(t); setErrors((e) => ({ ...e, amount: '' })); }}
          keyboardType="numeric"
          error={errors.amount}
          selectTextOnFocus={true}
        />

        {/* ─── Payment Mode Toggle ─── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Payment Mode</Text>
        <View style={styles.toggleRow}>
          {PAYMENT_MODES.map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.toggleBtn, { borderColor: colors.border, backgroundColor: colors.surface }, paymentMode === mode && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setPaymentMode(mode)}>
              <Text style={[styles.toggleText, { color: colors.text }, paymentMode === mode && { color: '#FFF' }]}>{mode}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* UPI Transaction ID (conditional) */}
        {paymentMode === 'UPI' && (
          <Input
            label="UPI Transaction ID"
            placeholder="e.g. TXN123456789"
            value={transactionId}
            onChangeText={(t) => { setTransactionId(t); setErrors((e) => ({ ...e, transactionId: '' })); }}
            error={errors.transactionId}
          />
        )}

        {/* ─── Payment Status ─── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Payment Status</Text>
        <View style={styles.toggleRow}>
          {PAYMENT_STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.toggleBtn, { borderColor: colors.border, backgroundColor: colors.surface }, paymentStatus === s && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setPaymentStatus(s)}>
              <Text style={[styles.toggleText, { color: colors.text }, paymentStatus === s && { color: '#FFF' }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── Notes ─── */}
        <Input
          label="Notes (optional)"
          placeholder="Any remarks..."
          value={notes}
          onChangeText={setNotes}
          multiline
          containerStyle={{ marginTop: SPACING.xs }}
        />

        <Button
          title="Record Payment"
          onPress={handleSubmit}
          loading={submitting}
          style={{ marginTop: SPACING.md }}
        />
      </ScrollView>

      {/* ─── Event Selection Modal ─── */}
      <Modal
        visible={eventModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEventModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Event</Text>
              <TouchableOpacity onPress={() => setEventModalVisible(false)}>
                <Icon name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {events.length > 5 && (
              <TextInput
                style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Search event..."
                placeholderTextColor={colors.textMuted}
                value={eventSearchQuery}
                onChangeText={setEventSearchQuery}
                autoCapitalize="none"
              />
            )}

            <FlatList
              data={filteredEvents}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                const isSelected = selectedEvent?._id === item._id;
                return (
                  <TouchableOpacity
                    style={[styles.listItem, { borderBottomColor: colors.border + '60' }, isSelected && { backgroundColor: colors.primary + '18', borderRadius: 8 }]}
                    onPress={() => {
                      setSelectedEvent(item);
                      setErrors((e) => ({ ...e, event: '' }));
                      if (item.perHouseAmount > 0) {
                        setAmount(String(item.perHouseAmount));
                      }
                      if (selectedResident && item.excludedResidents?.some((x) => (x._id || x) === selectedResident._id)) {
                        setSelectedResident(null);
                        setErrors((e) => ({ ...e, resident: `Resident removed: Excluded from "${item.title}".` }));
                      }
                      setEventModalVisible(false);
                    }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listItemTitle, { color: colors.text }, isSelected && { color: colors.primary }]}>
                        {item.title}
                      </Text>
                      {item.description ? (
                        <Text style={[styles.listItemSub, { color: colors.textMuted }]} numberOfLines={1}>{item.description}</Text>
                      ) : null}
                    </View>
                    {item.perHouseAmount > 0 && (
                      <Text style={[styles.amountBadge, { color: colors.primary, backgroundColor: colors.primary + '18' }]}>₹{item.perHouseAmount}</Text>
                    )}
                    {isSelected && <Icon name="check" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No events found</Text>
                </View>
              }
            />
          </SafeAreaView>
        </View>
      </Modal>

      {/* ─── Resident Selection Modal ─── */}
      <Modal
        visible={residentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setResidentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Resident</Text>
              <TouchableOpacity onPress={() => setResidentModalVisible(false)}>
                <Icon name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Search name, flat no, or phone..."
              placeholderTextColor={colors.textMuted}
              value={residentSearchQuery}
              onChangeText={setResidentSearchQuery}
              autoCapitalize="none"
            />

            <Text style={[styles.resultCount, { color: colors.textMuted }]}>
              Showing {filteredResidents.length} of {residents.length} residents
            </Text>

            <FlatList
              data={filteredResidents}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = selectedResident?._id === item._id;
                const isExcluded = selectedEvent?.excludedResidents?.some((x) => (x._id || x) === item._id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.listItem,
                      { borderBottomColor: colors.border + '60' },
                      isSelected && { backgroundColor: colors.primary + '18', borderRadius: 8 },
                      isExcluded && { opacity: 0.55, backgroundColor: colors.danger + '0A' },
                    ]}
                    onPress={() => {
                      if (isExcluded) {
                        showError(
                          'Resident Excluded',
                          `${item.name} is excluded from "${selectedEvent.title}" and cannot pay for this event.`
                        );
                        return;
                      }
                      setSelectedResident(item);
                      setErrors((e) => ({ ...e, resident: '' }));
                      setResidentModalVisible(false);
                    }}>
                    <View style={[styles.itemAvatar, { backgroundColor: isExcluded ? '#EF444422' : colors.border }]}>
                      {isExcluded ? (
                        <Icon name="account-cancel" size={18} color={colors.danger} />
                      ) : (
                        <Text style={[styles.itemAvatarText, { color: colors.textMuted }]}>
                          {item.name?.[0]?.toUpperCase() || 'R'}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.listItemTitle, { color: colors.text }, isSelected && { color: colors.primary }]}>
                          {item.name}
                        </Text>
                        {item.houseOrFlatNo ? (
                          <View style={[styles.flatBadge, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.flatBadgeText, { color: colors.primary }]}>Flat {item.houseOrFlatNo}</Text>
                          </View>
                        ) : null}
                        {isExcluded && (
                          <View style={{ backgroundColor: '#EF444422', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.danger }}>EXCLUDED</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Icon name="phone-outline" size={12} color={colors.textMuted} style={{ marginRight: 3 }} />
                        <Text style={[styles.listItemSub, { color: colors.textMuted, marginTop: 0 }]}>{item.phone}</Text>
                      </View>
                    </View>

                    {isSelected && <Icon name="check" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>No residents found matching "{residentSearchQuery}"</Text>
                </View>
              }
            />
          </SafeAreaView>
        </View>
      </Modal>

      {/* ─── PDF Receipt Viewer Modal ─── */}
      <PdfReceiptModal
        visible={showReceiptModal}
        item={selectedReceipt}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedReceipt(null);
          navigation.goBack();
        }}
      />

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex:    { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: SPACING.xs, marginTop: SPACING.sm },

  typeCard: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  typeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  typeDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  yearChipText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Dropdown selector button styles
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.xs,
  },
  dropdownError: {
    borderColor: COLORS.danger,
  },
  dropdownPlaceholderText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dropdownSubText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  dropdownChevron: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },

  selectedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    borderRadius: 10,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  summaryAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryAvatarText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  selectedDetails: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  toggleRow:        { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.md },
  toggleBtn:        { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10, alignItems: 'center' },
  toggleBtnActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleText:       { fontSize: 14, fontWeight: '600', color: COLORS.text },
  toggleTextActive: { color: COLORS.white },

  error: { fontSize: 12, color: COLORS.danger, marginBottom: SPACING.sm },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '50%',
    padding: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCloseBtn: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textMuted,
    padding: 4,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  resultCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
    marginLeft: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '60',
    gap: SPACING.sm,
  },
  listItemSelected: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  listItemTitleSelected: {
    color: COLORS.primary,
  },
  listItemSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  itemAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  flatBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  flatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  amountBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 4,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});

export default CollectFaloScreen;

