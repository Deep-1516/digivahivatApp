/**
 * src/screens/admin/LogExpenseScreen.js
 *
 * Admin & Resident form to record a new society expense with optional bill image upload.
 * Styled with custom brand palette: Background #FFFFFF, Primary #00AFEF, Secondary #3E4095, Dark #1E1E1E.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, FlatList, SafeAreaView, Image, StatusBar,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { eventsAPI, expensesAPI, residentsAPI } from '../../services/api';
import { useAlert } from '../../context/AlertContext';
import { useAuth }  from '../../context/AuthContext';
import Input  from '../../components/Input';
import Button from '../../components/Button';
import { SPACING, EXPENSE_CATEGORIES, getEventStatus } from '../../constants';
import Icon   from '../../components/Icon';

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

const LogExpenseScreen = ({ navigation, route }) => {
  const editingExpense = route.params?.expense ?? null;
  const { showError, showSuccess } = useAlert();
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const isMember = !isAdmin && !isSuperAdmin;

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
        const promises = [eventsAPI.getAll()];
        // Residents list is only needed for Admin to attribute expenses
        if (!isMember) {
          promises.push(residentsAPI.getAll());
        }
        const [eRes, rRes] = await Promise.all(promises);

        // ONLY currently active events (endDate has not passed and isActive = true)
        const activeEvents = (eRes.data.data || []).filter((e) => getEventStatus(e) === 'active');

        // General Society Expense option for non-event expenses
        const generalOption = {
          _id: 'general',
          title: 'General Society Expense (Non-Event)',
          isGeneral: true,
        };

        const list = [generalOption, ...activeEvents];
        setEvents(list);

        if (rRes?.data?.data?.residents) {
          setResidents(rRes.data.data.residents || []);
        }

        if (editingExpense?.eventId) {
          const match = activeEvents.find((e) => e._id === (editingExpense.eventId._id || editingExpense.eventId));
          setSelectedEvent(match || generalOption);
        } else if (editingExpense && !editingExpense.eventId) {
          setSelectedEvent(generalOption);
        } else if (route.params?.event) {
          const match = activeEvents.find((e) => e._id === route.params.event._id) || generalOption;
          setSelectedEvent(match);
        } else {
          // Default to first active event if available, otherwise General
          setSelectedEvent(activeEvents.length > 0 ? activeEvents[0] : generalOption);
        }

        if (editingExpense?.recordedBy && !isMember) {
          const matchRes = (rRes?.data?.data?.residents || []).find(
            (r) => r._id === (editingExpense.recordedBy._id || editingExpense.recordedBy)
          );
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
  }, [isMember, editingExpense, route.params, showError]);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  const handlePickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
      if (res.didCancel || res.errorCode) return;
      if (res.assets && res.assets.length > 0) {
        const pickedAsset = res.assets[0];
        if (pickedAsset.fileSize && pickedAsset.fileSize > MAX_FILE_SIZE) {
          showError('File Too Large', 'Receipt image size exceeds the 5 MB limit. Please select a smaller photo.');
          return;
        }
        setReceiptImage(pickedAsset);
      }
    });
  };

  const validate = () => {
    const e = {};
    if (!selectedEvent) e.event  = 'Select an event or General Expense.';
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
      if (selectedEvent && !selectedEvent.isGeneral && selectedEvent._id !== 'general') {
        formData.append('eventId', selectedEvent._id);
      }
      formData.append('title',    title.trim());
      formData.append('amount',   amount);
      formData.append('category', category);
      formData.append('notes',    notes.trim());

      // If resident (member), always attribute the expense to themselves
      if (isMember) {
        formData.append('residentId', user?._id);
      } else if (selectedResident) {
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
        showSuccess('Updated', 'Expense updated and submitted for approval.', () => navigation.goBack());
      } else {
        await expensesAPI.log(formData);
        showSuccess('Success', 'Expense logged successfully.', () => navigation.goBack());
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
      <View style={[styles.center, { backgroundColor: THEME.background }]}>
        <ActivityIndicator color={THEME.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: THEME.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ─── Top Page Header ─── */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.75}>
            <Icon name="arrow-left" size={20} color={THEME.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>{editingExpense ? 'Edit Expense' : 'Log Expense'}</Text>
            <Text style={styles.pageSub}>
              {editingExpense ? 'Modify expense entry & receipt bill' : 'Record society or event expense'}
            </Text>
          </View>
        </View>

        {/* ─── Event Dropdown Picker ─── */}
        <Text style={styles.sectionLabel}>Select Event *</Text>
        <TouchableOpacity
          style={[styles.dropdownSelector, errors.event && styles.dropdownError]}
          activeOpacity={0.75}
          onPress={() => { setEventSearchQuery(''); setEventModalVisible(true); }}>
          <View style={[styles.dropdownIconWrap, { backgroundColor: 'rgba(0, 175, 239, 0.1)' }]}>
            <Icon name="calendar-month-outline" size={18} color={THEME.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={selectedEvent ? styles.dropdownSelectedText : styles.dropdownPlaceholderText} numberOfLines={1}>
              {selectedEvent ? selectedEvent.title : 'Select Event'}
            </Text>
          </View>
          <Icon name="chevron-down" size={18} color={THEME.textMuted} />
        </TouchableOpacity>
        {errors.event && <Text style={styles.error}>{errors.event}</Text>}

        {/* ─── Paid / Incurred By: Resident Auto-Assignment or Admin Selector ─── */}
        {isMember ? (
          <View style={styles.memberInfoPill}>
            <View style={[styles.memberAvatar, { backgroundColor: THEME.secondary }]}>
              <Text style={styles.memberAvatarText}>{user?.name?.[0]?.toUpperCase() || 'M'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberIncurredLabel}>Expense Incurred By</Text>
              <Text style={styles.memberIncurredName}>
                {user?.name || 'Resident Member'}
                {user?.houseOrFlatNo ? `  ·  Flat ${user.houseOrFlatNo}` : ''}
              </Text>
            </View>
            <View style={styles.selfBadge}>
              <Text style={styles.selfBadgeText}>Self</Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Paid / Incurred By (Optional)</Text>
            <TouchableOpacity
              style={styles.dropdownSelector}
              activeOpacity={0.75}
              onPress={() => { setResidentSearchQuery(''); setResidentModalVisible(true); }}>
              <View style={[styles.dropdownIconWrap, { backgroundColor: 'rgba(62, 64, 149, 0.1)' }]}>
                <Icon name="account-outline" size={18} color={THEME.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                {selectedResident ? (
                  <>
                    <Text style={styles.dropdownSelectedText}>
                      {selectedResident.name}
                      {selectedResident.houseOrFlatNo ? `  ·  Flat ${selectedResident.houseOrFlatNo}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <Icon name="phone-outline" size={12} color={THEME.primary} />
                      <Text style={styles.dropdownSubText}>{selectedResident.phone}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.dropdownPlaceholderText}>Select Resident (Default: Admin / Self)</Text>
                )}
              </View>
              <Icon name="chevron-down" size={18} color={THEME.textMuted} />
            </TouchableOpacity>

            {/* Selected Resident Summary Card */}
            {selectedResident && (
              <View style={styles.selectedSummary}>
                <View style={[styles.summaryAvatar, { backgroundColor: THEME.secondary }]}>
                  <Text style={styles.summaryAvatarText}>{selectedResident.name?.[0]?.toUpperCase() || 'R'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedName}>{selectedResident.name}</Text>
                  <Text style={styles.selectedDetails}>
                    {selectedResident.houseOrFlatNo ? `Flat ${selectedResident.houseOrFlatNo}  •  ` : ''}
                    {selectedResident.phone}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedResident(null)}>
                  <Icon name="close" size={18} color={THEME.textMuted} style={{ padding: 4 }} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ─── Expense Title & Amount ─── */}
        <Input
          label="Expense Title *"
          placeholder="e.g. Flower Decoration & Stage Setup"
          value={title}
          onChangeText={(t) => { setTitle(t); setErrors((e) => ({ ...e, title: '' })); }}
          error={errors.title}
          labelStyle={{ color: THEME.dark, fontWeight: '700' }}
          inputStyle={{ backgroundColor: THEME.surface, borderColor: THEME.border, color: THEME.dark, borderRadius: 12 }}
          focusedBorderColor={THEME.primary}
        />

        <Input
          label="Amount (₹) *"
          placeholder="e.g. 15000"
          value={amount}
          onChangeText={(t) => { setAmount(t); setErrors((e) => ({ ...e, amount: '' })); }}
          keyboardType="numeric"
          error={errors.amount}
          selectTextOnFocus={true}
          labelStyle={{ color: THEME.dark, fontWeight: '700' }}
          inputStyle={{ backgroundColor: THEME.surface, borderColor: THEME.border, color: THEME.dark, borderRadius: 12 }}
          focusedBorderColor={THEME.primary}
        />

        {/* ─── Category Picker ─── */}
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.pillRow}>
          {EXPENSE_CATEGORIES.map((cat) => {
            const isActive = category === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.pill,
                  isActive && styles.pillActive,
                ]}
                activeOpacity={0.75}
                onPress={() => setCategory(cat)}>
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Receipt Photo ─── */}
        <Text style={styles.sectionLabel}>Bill / Receipt Photo (Optional)</Text>
        <TouchableOpacity
          style={styles.imagePickerBtn}
          activeOpacity={0.75}
          onPress={handlePickImage}>
          {receiptImage ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: receiptImage.uri }} style={styles.previewImage} />
              <View style={styles.changePhotoPill}>
                <Icon name="camera-retake-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.cameraIconWrap}>
                <Icon name="camera-plus-outline" size={20} color={THEME.primary} />
              </View>
              <View>
                <Text style={styles.imagePickerText}>Upload Bill / Receipt Photo</Text>
                <Text style={styles.imagePickerSub}>Tap to browse photo gallery</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* ─── Notes ─── */}
        <Input
          label="Notes (Optional)"
          placeholder="Vendor name, bill number, notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          labelStyle={{ color: THEME.dark, fontWeight: '700' }}
          inputStyle={{ backgroundColor: THEME.surface, borderColor: THEME.border, color: THEME.dark, borderRadius: 12 }}
          focusedBorderColor={THEME.primary}
        />

        <Button
          title={editingExpense ? "Update Expense" : "Save Expense"}
          onPress={handleSubmit}
          loading={submitting}
          style={styles.submitBtn}
          textStyle={styles.submitBtnText}
        />
      </ScrollView>

      {/* ─── Event Selection Modal ─── */}
      <Modal
        visible={eventModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEventModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Event</Text>
              <TouchableOpacity onPress={() => setEventModalVisible(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>

            {events.length > 5 && (
              <TextInput
                style={styles.searchInput}
                placeholder="Search event..."
                placeholderTextColor={THEME.textMuted}
                value={eventSearchQuery}
                onChangeText={setEventSearchQuery}
                autoCapitalize="none"
              />
            )}

            <FlatList
              data={filteredEvents}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedEvent?._id === item._id;
                return (
                  <TouchableOpacity
                    style={[styles.listItem, isSelected && styles.listItemSelected]}
                    onPress={() => {
                      setSelectedEvent(item);
                      setErrors((e) => ({ ...e, event: '' }));
                      setEventModalVisible(false);
                    }}>
                    <View style={[styles.eventBadgeIcon, { backgroundColor: item.isGeneral ? 'rgba(0, 175, 239, 0.12)' : 'rgba(16, 185, 129, 0.12)' }]}>
                      <Icon name={item.isGeneral ? 'office-building' : 'calendar-star'} size={18} color={item.isGeneral ? THEME.primary : THEME.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listItemTitle, isSelected && { color: THEME.primary, fontWeight: '800' }]}>
                        {item.title}
                      </Text>
                      <Text style={styles.listItemSub}>
                        {item.isGeneral ? 'Routine society maintenance, repairs & operations' : 'Active festival / society event'}
                      </Text>
                    </View>
                    {isSelected && <Icon name="check-circle" size={20} color={THEME.primary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No events found</Text>
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
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Resident</Text>
              <TouchableOpacity onPress={() => setResidentModalVisible(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={THEME.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search name, flat no, or phone..."
              placeholderTextColor={THEME.textMuted}
              value={residentSearchQuery}
              onChangeText={setResidentSearchQuery}
              autoCapitalize="none"
            />

            <Text style={styles.resultCount}>
              Showing {filteredResidents.length} of {residents.length} residents
            </Text>

            <FlatList
              data={filteredResidents}
              keyExtractor={(item) => item._id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedResident?._id === item._id;
                return (
                  <TouchableOpacity
                    style={[styles.listItem, isSelected && styles.listItemSelected]}
                    onPress={() => {
                      setSelectedResident(item);
                      setResidentModalVisible(false);
                    }}>
                    <View style={[styles.itemAvatar, { backgroundColor: 'rgba(62, 64, 149, 0.1)' }]}>
                      <Text style={[styles.itemAvatarText, { color: THEME.secondary }]}>{item.name?.[0]?.toUpperCase() || 'R'}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.listItemTitle, isSelected && { color: THEME.primary, fontWeight: '800' }]}>
                          {item.name}
                        </Text>
                        {item.houseOrFlatNo ? (
                          <View style={styles.flatBadge}>
                            <Text style={styles.flatBadgeText}>Flat {item.houseOrFlatNo}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Icon name="phone-outline" size={12} color={THEME.textMuted} />
                        <Text style={styles.listItemSub}>{item.phone}</Text>
                      </View>
                    </View>

                    {isSelected && <Icon name="check-circle" size={20} color={THEME.primary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No residents found matching "{residentSearchQuery}"</Text>
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
  content: { padding: SPACING.md, paddingBottom: SPACING.xl * 1.5 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: THEME.surfaceSubtle,
    borderWidth: 1.2,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: { fontSize: 20, fontWeight: '900', color: THEME.dark, letterSpacing: -0.3 },
  pageSub:   { fontSize: 12, color: THEME.textMuted, marginTop: 1, fontWeight: '500' },

  sectionLabel: { fontSize: 13, fontWeight: '800', color: THEME.dark, marginBottom: SPACING.xs, marginTop: SPACING.sm },

  // Dropdown selector button styles
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderWidth: 1.2,
    borderColor: THEME.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: SPACING.xs,
    elevation: 1,
    shadowColor: THEME.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  dropdownIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dropdownError: {
    borderColor: THEME.danger,
  },
  dropdownPlaceholderText: {
    fontSize: 13.5,
    color: THEME.textMuted,
    fontWeight: '500',
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.dark,
  },
  dropdownSubText: {
    fontSize: 12,
    color: THEME.primary,
    fontWeight: '600',
  },

  selectedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(62, 64, 149, 0.06)',
    borderWidth: 1.2,
    borderColor: 'rgba(62, 64, 149, 0.18)',
    borderRadius: 14,
    padding: SPACING.sm + 2,
    marginTop: 4,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  summaryAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryAvatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.dark,
  },
  selectedDetails: {
    fontSize: 11.5,
    color: THEME.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.md },
  pill: {
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: THEME.border,
    backgroundColor: THEME.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
    elevation: 2,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  pillText:       { fontSize: 12.5, color: THEME.dark, fontWeight: '600' },
  pillTextActive: { color: '#FFFFFF', fontWeight: '800' },

  imagePickerBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(0, 175, 239, 0.35)',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(0, 175, 239, 0.04)',
    minHeight: 90,
  },
  cameraIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 175, 239, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: { color: THEME.primary, fontWeight: '800', fontSize: 13.5 },
  imagePickerSub:  { color: THEME.textMuted, fontSize: 11, marginTop: 2, fontWeight: '500' },
  previewContainer: { alignItems: 'center' },
  previewImage:    { width: 130, height: 130, borderRadius: 12 },
  changePhotoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
  },
  changePhotoText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  error:           { fontSize: 12, color: THEME.danger, marginBottom: SPACING.sm, fontWeight: '600' },

  submitBtn: {
    backgroundColor: THEME.secondary,
    borderRadius: 16,
    minHeight: 52,
    marginTop: SPACING.md,
    elevation: 3.5,
    shadowColor: THEME.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
    padding: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm + 2,
    borderBottomWidth: 1.2,
    borderBottomColor: THEME.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.dark,
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: THEME.surfaceSubtle,
  },
  searchInput: {
    borderWidth: 1.2,
    borderColor: THEME.border,
    backgroundColor: THEME.surfaceSubtle,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 13.5,
    color: THEME.dark,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  resultCount: {
    fontSize: 11.5,
    color: THEME.textMuted,
    marginBottom: SPACING.xs,
    marginLeft: 4,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderSubtle,
    gap: SPACING.sm,
  },
  listItemSelected: {
    backgroundColor: 'rgba(0, 175, 239, 0.08)',
    borderRadius: 12,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.dark,
  },
  listItemSub: {
    fontSize: 11.5,
    color: THEME.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  itemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemAvatarText: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  flatBadge: {
    backgroundColor: 'rgba(62, 64, 149, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  flatBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.secondary,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: THEME.textMuted,
    fontWeight: '500',
  },
  memberInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: THEME.border,
    backgroundColor: THEME.surfaceSubtle,
    marginTop: 6,
    marginBottom: SPACING.sm,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  memberIncurredLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  memberIncurredName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: THEME.dark,
    marginTop: 1,
  },
  selfBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selfBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.success,
  },
  eventBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LogExpenseScreen;
