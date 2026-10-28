/**
 * src/screens/admin/EventsScreen.js
 *
 * Full Admin management of festival events (Ganesh Utsav, Navratri, Diwali, etc.).
 * Includes all form fields matching Web:
 *  - Event Title *
 *  - Target Budget (₹) *
 *  - Per-House Amount (₹)
 *  - Start Date & End Date (with Visual Date Picker)
 *  - Description
 * Supports Create, Edit, Toggle Active/Closed, and Delete.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect }    from '@react-navigation/native';
import { eventsAPI, residentsAPI } from '../../services/api';
import { useAlert }         from '../../context/AlertContext';
import { useTheme }         from '../../context/ThemeContext';
import Input                 from '../../components/Input';
import Button                from '../../components/Button';
import DatePickerInput       from '../../components/DatePickerInput';
import { SPACING, getEventStatus } from '../../constants';
import Icon                  from '../../components/Icon';

import EventDetailsModal from '../../components/EventDetailsModal';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const EMPTY_EVENT = {
  title:             '',
  description:       '',
  targetBudget:      '',
  perHouseAmount:    '', // Empty by default so user can type directly without backspacing '0'
  startDate:         '',
  endDate:           '',
  excludedResidents: [],
};

const EventsScreen = () => {
  const insets                             = useSafeAreaInsets();
  const { showError, showSuccess, showConfirm } = useAlert();
  const { colors }                         = useTheme();

  const [events,        setEvents]        = useState([]);
  const [residents,     setResidents]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  // Details Modal State
  const [selectedDetailsEvent, setSelectedDetailsEvent] = useState(null);

  // Modal State
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editItem,    setEditItem]    = useState(null); // null = new, object = editing
  const [submitting,  setSubmitting]  = useState(false);
  const [form,        setForm]        = useState(EMPTY_EVENT);
  const [errors,      setErrors]      = useState({});
  const [residentSearch, setResidentSearch] = useState('');

  const setField = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const toggleExcludeResident = (id) => {
    setForm((f) => {
      const current = f.excludedResidents || [];
      const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return { ...f, excludedResidents: updated };
    });
  };

  const fetchData = useCallback(async () => {
    try {
      const [eRes, rRes] = await Promise.all([
        eventsAPI.getAll(),
        residentsAPI.getAll().catch(() => ({ data: { data: { residents: [] } } })),
      ]);
      setEvents(eRes.data.data || []);
      const rList = rRes.data?.data?.residents || rRes.data?.data || [];
      setResidents(rList);
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const openCreate = () => {
    setEditItem(null);
    setForm(EMPTY_EVENT);
    setErrors({});
    setResidentSearch('');
    setModalOpen(true);
  };

  const openEdit = (ev) => {
    setEditItem(ev);
    const excludedIds = ev.excludedResidents ? ev.excludedResidents.map((r) => r._id || r) : [];
    setForm({
      title:             ev.title || '',
      description:       ev.description || '',
      targetBudget:      String(ev.targetBudget || ''),
      perHouseAmount:    ev.perHouseAmount ? String(ev.perHouseAmount) : '',
      startDate:         ev.startDate ? ev.startDate.slice(0, 10) : '',
      endDate:           ev.endDate   ? ev.endDate.slice(0, 10)   : '',
      excludedResidents: excludedIds,
    });
    setErrors({});
    setResidentSearch('');
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Event title is required.';
    if (!form.targetBudget || isNaN(Number(form.targetBudget)) || Number(form.targetBudget) <= 0) {
      e.targetBudget = 'Enter a valid target budget (₹).';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveEvent = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        title:             form.title.trim(),
        description:       form.description.trim(),
        targetBudget:      Number(form.targetBudget),
        perHouseAmount:    Number(form.perHouseAmount) || 0,
        startDate:         form.startDate.trim() || undefined,
        endDate:           form.endDate.trim()   || undefined,
        excludedResidents: form.excludedResidents || [],
      };

      if (editItem) {
        await eventsAPI.update(editItem._id, payload);
        showSuccess('Updated', `Event "${form.title}" updated successfully.`);
      } else {
        await eventsAPI.create({ ...payload, isActive: true });
        showSuccess('Event Created', `Event "${form.title}" created successfully.`);
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = (ev) => {
    const action = ev.isActive ? 'close' : 'reopen';
    showConfirm(
      `${action.toUpperCase()} EVENT`,
      `Are you sure you want to ${action} "${ev.title}"?`,
      async () => {
        try {
          await eventsAPI.update(ev._id, { isActive: !ev.isActive });
          showSuccess('Status Updated', `Event marked as ${ev.isActive ? 'Closed' : 'Active'}.`);
          fetchData();
        } catch (err) {
          showError('Error', err.message);
        }
      }
    );
  };

  const handleDelete = (ev) => {
    showConfirm(
      'DELETE EVENT',
      `Permanently delete "${ev.title}" and all its data?\nThis cannot be undone.`,
      async () => {
        try {
          await eventsAPI.remove(ev._id);
          showSuccess('Deleted', `Event "${ev.title}" deleted.`);
          fetchData();
        } catch (err) {
          showError('Delete Failed', err.message);
        }
      }
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const filteredResidentsForForm = residents.filter((r) => {
    const q = residentSearch.toLowerCase();
    return (r.name || '').toLowerCase().includes(q) || String(r.houseOrFlatNo || '').toLowerCase().includes(q);
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[
        styles.headerRow,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingTop: Math.max(insets.top, 16),
        }
      ]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Festival Events</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>{events.length} total events</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate}>
          <Text style={styles.addBtnText}>+ New Event</Text>
        </TouchableOpacity>
      </View>

      {/* ── Event List ── */}
      <FlatList
        data={events}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        renderItem={({ item }) => {
          const excludedCount = item.excludedResidents?.length || 0;
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedDetailsEvent(item)}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <Text style={[styles.eventTitle, { color: colors.text }]}>{item.title}</Text>
                    {excludedCount > 0 && (
                      <View style={{ backgroundColor: '#EF444422', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="account-cancel-outline" size={12} color="#DC2626" style={{ marginRight: 3 }} />
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#DC2626' }}>
                          {excludedCount} Excluded
                        </Text>
                      </View>
                    )}
                  </View>
                  {!!item.description && (
                    <Text style={[styles.desc, { color: colors.textMuted }]}>{item.description}</Text>
                  )}
                </View>
                {(() => {
                  const st = getEventStatus(item);
                  const cfg = {
                    active:   { label: 'Active',   color: colors.success },
                    upcoming: { label: 'Upcoming', color: colors.info },
                    closed:   { label: 'Closed',   color: colors.textMuted },
                  }[st] || { label: 'Closed', color: colors.textMuted };
                  return (
                    <View style={[styles.badge, { backgroundColor: cfg.color + '22' }]}>
                      <Text style={[styles.badgeText, { color: cfg.color }]}>
                        {cfg.label}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              <View style={styles.detailGrid}>
                <View style={styles.detailCol}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Target Budget</Text>
                  <Text style={[styles.detailVal, { color: colors.primary }]}>{fmt(item.targetBudget)}</Text>
                </View>

                <View style={styles.detailCol}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Per House</Text>
                  <Text style={[styles.detailVal, { color: colors.text }]}>{item.perHouseAmount ? fmt(item.perHouseAmount) : '—'}</Text>
                </View>

                {!!item.startDate && (
                  <View style={styles.detailCol}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Dates</Text>
                    <Text style={[styles.detailVal, { color: colors.text, fontSize: 11 }]}>
                      {item.startDate.slice(0, 10)} {item.endDate ? `to ${item.endDate.slice(0, 10)}` : ''}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btnOutline, { borderColor: colors.primary, flexDirection: 'row', alignItems: 'center' }]}
                  onPress={() => setSelectedDetailsEvent(item)}>
                  <Icon name="account-group" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.btnOutlineText, { color: colors.primary }]}>Paid Persons</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnOutline, { borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}
                  onPress={() => openEdit(item)}>
                  <Icon name="pencil-outline" size={13} color={colors.text} style={{ marginRight: 4 }} />
                  <Text style={[styles.btnOutlineText, { color: colors.text }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnOutline, { borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}
                  onPress={() => handleToggleActive(item)}>
                  <Icon
                    name={item.isActive ? 'lock-outline' : 'lock-open-outline'}
                    size={13}
                    color={item.isActive ? colors.warning : colors.success}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.btnOutlineText, { color: item.isActive ? colors.warning : colors.success }]}>
                    {item.isActive ? 'Close' : 'Reopen'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnOutline, { borderColor: colors.danger + '44', flexDirection: 'row', alignItems: 'center' }]}
                  onPress={() => handleDelete(item)}>
                  <Icon name="delete-outline" size={13} color={colors.danger} style={{ marginRight: 4 }} />
                  <Text style={[styles.btnOutlineText, { color: colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="calendar-blank-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Events Created</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Create your first festival event above.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      {/* ─── Create / Edit Event Modal ─── */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editItem ? `Edit: ${editItem.title}` : 'Create New Event'}
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Input
                label="Event Title *"
                placeholder="e.g. Ganesh Utsav 2026"
                value={form.title}
                onChangeText={(t) => setField('title', t)}
                error={errors.title}
              />

              <View style={styles.twoCol}>
                <Input
                  label="Target Budget (₹) *"
                  placeholder="e.g. 50000"
                  value={form.targetBudget}
                  onChangeText={(t) => setField('targetBudget', t)}
                  keyboardType="numeric"
                  error={errors.targetBudget}
                  containerStyle={{ flex: 1, marginRight: SPACING.xs }}
                />

                <Input
                  label="Per-House Amount (₹)"
                  placeholder="e.g. 1000"
                  value={form.perHouseAmount}
                  onChangeText={(t) => setField('perHouseAmount', t)}
                  onFocus={() => {
                    if (form.perHouseAmount === '0') setField('perHouseAmount', '');
                  }}
                  keyboardType="numeric"
                  containerStyle={{ flex: 1 }}
                />
              </View>

              <View style={styles.twoCol}>
                <DatePickerInput
                  label="Start Date"
                  value={form.startDate}
                  onChangeDate={(d) => setField('startDate', d)}
                  placeholder="Select start date"
                  containerStyle={{ flex: 1, marginRight: SPACING.xs }}
                />

                <DatePickerInput
                  label="End Date"
                  value={form.endDate}
                  onChangeDate={(d) => setField('endDate', d)}
                  placeholder="Select end date"
                  containerStyle={{ flex: 1 }}
                />
              </View>

              <Input
                label="Description"
                placeholder="Optional details or instructions..."
                value={form.description}
                onChangeText={(t) => setField('description', t)}
                multiline
              />

              {/* ── Exclude Persons Section ── */}
              <View style={{ marginTop: SPACING.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="account-cancel-outline" size={15} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                      EXCLUDE PERSONS FROM EVENT (OPTIONAL)
                    </Text>
                  </View>
                  {form.excludedResidents?.length > 0 && (
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.danger }}>
                      {form.excludedResidents.length} Excluded
                    </Text>
                  )}
                </View>

                <TextInput
                  style={{ height: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, fontSize: 12, marginBottom: 6, color: colors.text, backgroundColor: colors.background }}
                  placeholder="Filter residents..."
                  placeholderTextColor={colors.textMuted}
                  value={residentSearch}
                  onChangeText={setResidentSearch}
                />

                <View style={{ maxHeight: 130, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, padding: 4 }}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {filteredResidentsForForm.length === 0 ? (
                      <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', padding: 8, textAlign: 'center' }}>
                        No residents found
                      </Text>
                    ) : (
                      filteredResidentsForForm.map((r) => {
                        const isExcluded = form.excludedResidents?.includes(r._id);
                        return (
                          <TouchableOpacity
                            key={r._id}
                            onPress={() => toggleExcludeResident(r._id)}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingVertical: 6,
                              paddingHorizontal: 8,
                              borderRadius: 6,
                              marginBottom: 2,
                              backgroundColor: isExcluded ? '#EF444415' : 'transparent',
                            }}>
                            <Text style={{ fontSize: 12, fontWeight: isExcluded ? '800' : '600', color: isExcluded ? colors.danger : colors.text }}>
                              {r.name} ({r.houseOrFlatNo ? `Flat ${r.houseOrFlatNo}` : r.phone})
                            </Text>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: isExcluded ? colors.danger : colors.textMuted }}>
                              {isExcluded ? 'Excluded' : '—'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>

            <View style={styles.btnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={editItem ? 'Save Changes' : 'Create Event'}
                onPress={handleSaveEvent}
                loading={submitting}
                style={{ flex: 1, marginLeft: SPACING.sm }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Event Details Modal ─── */}
      <EventDetailsModal
        visible={!!selectedDetailsEvent}
        onClose={() => setSelectedDetailsEvent(null)}
        event={selectedDetailsEvent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    padding:         SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  sub:         { fontSize: 12, marginTop: 2 },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderRadius:      10,
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  list: { padding: SPACING.md, paddingBottom: SPACING.xl },
  card: {
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  eventTitle: { fontSize: 16, fontWeight: '800' },
  desc:       { fontSize: 13, marginTop: 2 },

  badge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },

  detailGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginVertical: 8 },
  detailCol:  { minWidth: 90 },
  detailLabel:{ fontSize: 11, fontWeight: '600' },
  detailVal:  { fontSize: 13, fontWeight: '800', marginTop: 1 },

  actionRow:     { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnOutline:     { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  btnOutlineText: { fontSize: 12, fontWeight: '700' },

  empty:      { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 44, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText:  { fontSize: 13, marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: SPACING.md },
  modalCard:    { borderRadius: 24, padding: SPACING.lg, maxHeight: '85%' },
  modalTitle:   { fontSize: 18, fontWeight: '800', marginBottom: SPACING.md },
  twoCol:       { flexDirection: 'row', justifyContent: 'space-between' },
  btnRow:       { flexDirection: 'row', marginTop: SPACING.md },
});

export default EventsScreen;
