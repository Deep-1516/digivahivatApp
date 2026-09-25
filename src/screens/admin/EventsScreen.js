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
  RefreshControl, Modal, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect }    from '@react-navigation/native';
import { eventsAPI }        from '../../services/api';
import { useAlert }         from '../../context/AlertContext';
import { useTheme }         from '../../context/ThemeContext';
import Input                 from '../../components/Input';
import Button                from '../../components/Button';
import DatePickerInput       from '../../components/DatePickerInput';
import { SPACING }           from '../../constants';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const EMPTY_EVENT = {
  title:          '',
  description:    '',
  targetBudget:   '',
  perHouseAmount: '', // Empty by default so user can type directly without backspacing '0'
  startDate:      '',
  endDate:        '',
};

const EventsScreen = () => {
  const insets                             = useSafeAreaInsets();
  const { showError, showSuccess, showConfirm } = useAlert();
  const { colors }                         = useTheme();

  const [events,      setEvents]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  // Modal State
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editItem,    setEditItem]    = useState(null); // null = new, object = editing
  const [submitting,  setSubmitting]  = useState(false);
  const [form,        setForm]        = useState(EMPTY_EVENT);
  const [errors,      setErrors]      = useState({});

  const setField = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await eventsAPI.getAll();
      setEvents(res.data.data || []);
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
    setModalOpen(true);
  };

  const openEdit = (ev) => {
    setEditItem(ev);
    setForm({
      title:          ev.title || '',
      description:    ev.description || '',
      targetBudget:   String(ev.targetBudget || ''),
      perHouseAmount: ev.perHouseAmount ? String(ev.perHouseAmount) : '',
      startDate:      ev.startDate ? ev.startDate.slice(0, 10) : '',
      endDate:        ev.endDate   ? ev.endDate.slice(0, 10)   : '',
    });
    setErrors({});
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
        title:          form.title.trim(),
        description:    form.description.trim(),
        targetBudget:   Number(form.targetBudget),
        perHouseAmount: Number(form.perHouseAmount) || 0,
        startDate:      form.startDate.trim() || undefined,
        endDate:        form.endDate.trim()   || undefined,
      };

      if (editItem) {
        await eventsAPI.update(editItem._id, payload);
        showSuccess('Updated ✅', `Event "${form.title}" updated successfully.`);
      } else {
        await eventsAPI.create({ ...payload, isActive: true });
        showSuccess('Event Created 🎉', `Event "${form.title}" created successfully.`);
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
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.eventTitle, { color: colors.text }]}>{item.title}</Text>
                {!!item.description && (
                  <Text style={[styles.desc, { color: colors.textMuted }]}>{item.description}</Text>
                )}
              </View>
              <View style={[styles.badge, item.isActive ? { backgroundColor: colors.success + '22' } : { backgroundColor: colors.textMuted + '22' }]}>
                <Text style={[styles.badgeText, { color: item.isActive ? colors.success : colors.textMuted }]}>
                  {item.isActive ? 'Active' : 'Closed'}
                </Text>
              </View>
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
                style={[styles.btnOutline, { borderColor: colors.border }]}
                onPress={() => openEdit(item)}>
                <Text style={[styles.btnOutlineText, { color: colors.primary }]}>✏️ Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnOutline, { borderColor: colors.border }]}
                onPress={() => handleToggleActive(item)}>
                <Text style={[styles.btnOutlineText, { color: item.isActive ? colors.warning : colors.success }]}>
                  {item.isActive ? '🔒 Close' : '✅ Reopen'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnOutline, { borderColor: colors.danger + '44' }]}
                onPress={() => handleDelete(item)}>
                <Text style={[styles.btnOutlineText, { color: colors.danger }]}>🗑 Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyEmoji]}>🗓</Text>
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
              {editItem ? `✏️ Edit: ${editItem.title}` : '🗓 Create New Event'}
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
            </ScrollView>

            <View style={styles.btnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalOpen(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={editItem ? 'Save Changes' : 'Create Event 🎉'}
                onPress={handleSaveEvent}
                loading={submitting}
                style={{ flex: 1, marginLeft: SPACING.sm }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
