/**
 * src/screens/admin/LogExpenseScreen.js
 *
 * Admin form to record a new society expense with optional bill image upload.
 * Fully styled for theme compatibility (Light/Dark mode) with optional Resident payer selection.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, FlatList, SafeAreaView, Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { eventsAPI, expensesAPI, residentsAPI } from '../../services/api';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import Input  from '../../components/Input';
import Button from '../../components/Button';
import { COLORS, SPACING, EXPENSE_CATEGORIES } from '../../constants';

const LogExpenseScreen = ({ navigation, route }) => {
  const editingExpense = route.params?.expense ?? null;
  const { showError, showSuccess } = useAlert();
  const { colors } = useTheme();
  const [events,           setEvents]           = useState([]);
  const [residents,        setResidents]        = useState([]);
  const [selectedEvent,    setSelectedEvent]    = useState(null);
  const [selectedResident, setSelectedResident] = useState(null);

  const [title,        setTitle]        = useState(editingExpense?.title ?? '');
  const [amount,       setAmount]       = useState(editingExpense?.amount ? String(editingExpense.amount) : '');
  const [category,     setCategory]     = useState(editingExpense?.category ?? EXPENSE_CATEGORIES[0]);
  const [notes,        setNotes]        = useState(editingExpense?.notes ?? '');
  const [receiptImage, setReceiptImage] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [errors,       setErrors]       = useState({});

  // Modal & Search states
  const [eventModalVisible,    setEventModalVisible]    = useState(false);
  const [residentModalVisible, setResidentModalVisible] = useState(false);
  const [eventSearchQuery,     setEventSearchQuery]     = useState('');
  const [residentSearchQuery,  setResidentSearchQuery]  = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [eRes, rRes] = await Promise.all([eventsAPI.getAll(), residentsAPI.getAll()]);
        const activeEvents = (eRes.data.data || []).filter((e) => e.isActive);
        const list = activeEvents.length > 0 ? activeEvents : (eRes.data.data || []);
        setEvents(list);
        setResidents(rRes.data.data.residents || []);

        if (editingExpense?.eventId) {
          const match = list.find((e) => e._id === (editingExpense.eventId._id || editingExpense.eventId));
          setSelectedEvent(match || list[0]);
        } else if (route.params?.event) {
          const match = list.find((e) => e._id === route.params.event._id) || route.params.event;
          setSelectedEvent(match);
        } else if (list.length > 0) {
          setSelectedEvent(list[0]);
        }

        if (editingExpense?.recordedBy) {
          const matchRes = (rRes.data.data.residents || []).find((r) => r._id === (editingExpense.recordedBy._id || editingExpense.recordedBy));
          if (matchRes) {
            setSelectedResident(matchRes);
          }
        }
      } catch (err) {
        showError('Error', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  const handlePickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.didCancel || res.errorCode) return;
      if (res.assets && res.assets.length > 0) {
        const pickedAsset = res.assets[0];
        if (pickedAsset.fileSize && pickedAsset.fileSize > MAX_FILE_SIZE) {
          showError('File Too Large ⚠️', 'Receipt image size exceeds the 5 MB limit. Please select a smaller photo.');
          return;
        }
        setReceiptImage(pickedAsset);
      }
    });
  };

  const validate = () => {
    const e = {};
    if (!selectedEvent) e.event  = 'Select an event.';
    if (!title.trim())  e.title  = 'Title is required.';
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = 'Enter a valid amount.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('eventId',  selectedEvent._id);
      formData.append('title',    title.trim());
      formData.append('amount',   amount);
      formData.append('category', category);
      formData.append('notes',    notes.trim());

      if (selectedResident) {
        formData.append('residentId', selectedResident._id);
      }

      if (receiptImage) {
        formData.append('receiptImage', {
          uri:  receiptImage.uri,
          name: receiptImage.fileName || 'receipt.jpg',
          type: receiptImage.type || 'image/jpeg',
        });
      }

      if (editingExpense) {
        await expensesAPI.update(editingExpense._id, formData);
        showSuccess('Updated ✅', 'Expense updated and submitted for approval.', () => navigation.goBack());
      } else {
        await expensesAPI.log(formData);
        showSuccess('Success ✅', 'Expense logged successfully.', () => navigation.goBack());
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

        {/* ─── Event Dropdown Picker ─── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Select Event *</Text>
        <TouchableOpacity
          style={[styles.dropdownSelector, { backgroundColor: colors.surface, borderColor: colors.border }, errors.event && styles.dropdownError]}
          activeOpacity={0.7}
          onPress={() => { setEventSearchQuery(''); setEventModalVisible(true); }}>
          <View style={{ flex: 1 }}>
            <Text style={selectedEvent ? [styles.dropdownSelectedText, { color: colors.text }] : [styles.dropdownPlaceholderText, { color: colors.textMuted }]}>
              {selectedEvent ? selectedEvent.title : 'Select Event'}
            </Text>
          </View>
          <Text style={[styles.dropdownChevron, { color: colors.textMuted }]}>▼</Text>
        </TouchableOpacity>
        {errors.event && <Text style={styles.error}>{errors.event}</Text>}

        {/* ─── Paid / Incurred By (Optional Resident Selector) ─── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Paid / Incurred By (Optional)</Text>
        <TouchableOpacity
          style={[styles.dropdownSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => { setResidentSearchQuery(''); setResidentModalVisible(true); }}>
          <View style={{ flex: 1 }}>
            {selectedResident ? (
              <>
                <Text style={[styles.dropdownSelectedText, { color: colors.text }]}>
                  {selectedResident.name}
                  {selectedResident.houseOrFlatNo ? `  ·  Flat ${selectedResident.houseOrFlatNo}` : ''}
                </Text>
                <Text style={[styles.dropdownSubText, { color: colors.primary }]}>📱 {selectedResident.phone}</Text>
              </>
            ) : (
              <Text style={[styles.dropdownPlaceholderText, { color: colors.textMuted }]}>Select Resident (Default: Admin / Self)</Text>
            )}
          </View>
          <Text style={[styles.dropdownChevron, { color: colors.textMuted }]}>▼</Text>
        </TouchableOpacity>

        {/* Selected Resident Summary Card */}
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
            </View>
            <TouchableOpacity onPress={() => setSelectedResident(null)}>
              <Text style={{ fontSize: 16, color: colors.textMuted, padding: 4 }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Expense Title & Amount ─── */}
        <Input
          label="Expense Title *"
          placeholder="e.g. Flower Decoration & Stage Setup"
          value={title}
          onChangeText={(t) => { setTitle(t); setErrors((e) => ({ ...e, title: '' })); }}
          error={errors.title}
        />

        <Input
          label="Amount (₹) *"
          placeholder="e.g. 15000"
          value={amount}
          onChangeText={(t) => { setAmount(t); setErrors((e) => ({ ...e, amount: '' })); }}
          keyboardType="numeric"
          error={errors.amount}
          selectTextOnFocus={true}
        />

        {/* ─── Category Picker ─── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Category</Text>
        <View style={styles.pillRow}>
          {EXPENSE_CATEGORIES.map((cat) => {
            const isActive = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.pill,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setCategory(cat)}>
                <Text style={[styles.pillText, { color: colors.text }, isActive && { color: '#FFFFFF', fontWeight: '700' }]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Receipt Photo ─── */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Bill / Receipt Photo (Optional)</Text>
        <TouchableOpacity
          style={[styles.imagePickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handlePickImage}>
          {receiptImage ? (
            <Image source={{ uri: receiptImage.uri }} style={styles.previewImage} />
          ) : (
            <Text style={[styles.imagePickerText, { color: colors.primary }]}>📷 Upload Receipt Image</Text>
          )}
        </TouchableOpacity>

        {/* ─── Notes ─── */}
        <Input
          label="Notes (Optional)"
          placeholder="Vendor name, bill number, notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Button
          title={editingExpense ? "Update Expense 🧾" : "Save Expense 🧾"}
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
                <Text style={[styles.modalCloseBtn, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {events.length > 5 && (
              <TextInput
                style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="🔍 Search event..."
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
                      setEventModalVisible(false);
                    }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listItemTitle, { color: colors.text }, isSelected && { color: colors.primary }]}>
                        {item.title}
                      </Text>
                    </View>
                    {isSelected && <Text style={[styles.checkMark, { color: colors.primary }]}>✓</Text>}
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
                <Text style={[styles.modalCloseBtn, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="🔍 Search name, flat no, or phone..."
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
                return (
                  <TouchableOpacity
                    style={[styles.listItem, { borderBottomColor: colors.border + '60' }, isSelected && { backgroundColor: colors.primary + '18', borderRadius: 8 }]}
                    onPress={() => {
                      setSelectedResident(item);
                      setResidentModalVisible(false);
                    }}>
                    <View style={[styles.itemAvatar, { backgroundColor: colors.border }]}>
                      <Text style={[styles.itemAvatarText, { color: colors.textMuted }]}>{item.name?.[0]?.toUpperCase() || 'R'}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.listItemTitle, { color: colors.text }, isSelected && { color: colors.primary }]}>
                          {item.name}
                        </Text>
                        {item.houseOrFlatNo ? (
                          <View style={[styles.flatBadge, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.flatBadgeText, { color: colors.primary }]}>Flat {item.houseOrFlatNo}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.listItemSub, { color: colors.textMuted }]}>📱 {item.phone}</Text>
                    </View>

                    {isSelected && <Text style={[styles.checkMark, { color: colors.primary }]}>✓</Text>}
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

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex:    { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '700', marginBottom: SPACING.xs, marginTop: SPACING.sm },

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
    marginTop: 4,
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

  pillRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.md },
  pill:       { borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 8 },
  pillText:   { fontSize: 13, color: COLORS.text, fontWeight: '500' },

  imagePickerBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    minHeight: 100,
  },
  imagePickerText: { color: COLORS.primary, fontWeight: '600' },
  previewImage:    { width: 120, height: 120, borderRadius: 8 },
  error:           { fontSize: 12, color: COLORS.danger, marginBottom: SPACING.sm },

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

export default LogExpenseScreen;
