import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth }      from '../../context/AuthContext';
import { useAlert }     from '../../context/AlertContext';
import { useTheme }     from '../../context/ThemeContext';
import { societiesAPI, residentsAPI } from '../../services/api';
import Input            from '../../components/Input';
import Button           from '../../components/Button';
import { SPACING }      from '../../constants';

const EMPTY_SOCIETY = { name: '', city: '', address: '', isActive: true };
const EMPTY_ADMIN   = { name: '', phone: '', password: 'Admin@1234', houseOrFlatNo: '', totalMembers: '1' };

const SocietiesScreen = ({ navigation }) => {
  const insets                           = useSafeAreaInsets();
  const { logout }                       = useAuth();
  const { showSuccess, showError, showConfirm } = useAlert();
  const { colors }                       = useTheme();

  const [societies,  setSocieties]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  // Create / Edit Society modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [form,         setForm]         = useState(EMPTY_SOCIETY);
  const [errors,       setErrors]       = useState({});
  const [saving,       setSaving]       = useState(false);

  // Assign / Edit Admin modal
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminSociety,      setAdminSociety]      = useState(null);
  const [editingAdmin,      setEditingAdmin]      = useState(null); // null = new, object = editing existing
  const [adminForm,         setAdminForm]         = useState(EMPTY_ADMIN);
  const [adminErrors,       setAdminErrors]       = useState({});
  const [adminSaving,       setAdminSaving]       = useState(false);

  const fetchSocieties = useCallback(async () => {
    try {
      const res = await societiesAPI.getAll();
      setSocieties(res.data.data || []);
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      fetchSocieties();
    }, [fetchSocieties])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSocieties();
  };

  // ─── Create/Edit Society Handlers ─────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_SOCIETY);
    setErrors({});
    setEditItem(null);
    setModalVisible(true);
  };

  const openEdit = (soc) => {
    setForm({
      name:     soc.name,
      city:     soc.city || '',
      address:  soc.address || '',
      isActive: soc.isActive !== false,
    });
    setErrors({});
    setEditItem(soc);
    setModalVisible(true);
  };

  const validateSociety = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Society name is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveSociety = async () => {
    if (!validateSociety()) return;
    setSaving(true);
    try {
      const payload = {
        name:     form.name.trim(),
        city:     form.city.trim() || undefined,
        address:  form.address.trim() || undefined,
        isActive: form.isActive,
      };

      if (editItem) {
        await societiesAPI.update(editItem._id, payload);
        showSuccess('Updated ✅', `Society "${form.name}" updated successfully.`);
      } else {
        await societiesAPI.create(payload);
        showSuccess('Created ✅', `Society "${form.name}" created successfully! Now assign an Admin to it.`);
      }
      setModalVisible(false);
      fetchSocieties();
    } catch (err) {
      showError('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = (soc) => {
    const action = soc.isActive ? 'deactivate' : 'activate';
    showConfirm(
      `${action.toUpperCase()} SOCIETY`,
      `Are you sure you want to ${action} "${soc.name}"?`,
      async () => {
        try {
          await societiesAPI.update(soc._id, { isActive: !soc.isActive });
          showSuccess('Status Updated', `Society ${action}d successfully.`);
          fetchSocieties();
        } catch (err) {
          showError('Error', err.message);
        }
      }
    );
  };

  const handleDelete = (soc) => {
    showConfirm(
      'DELETE SOCIETY',
      `Permanently delete "${soc.name}"?\nThis cannot be undone.`,
      async () => {
        try {
          await societiesAPI.remove(soc._id);
          showSuccess('Deleted', `Society "${soc.name}" has been deleted.`);
          fetchSocieties();
        } catch (err) {
          showError('Delete Failed', err.message);
        }
      }
    );
  };

  // ─── Assign / Edit Admin Handlers ─────────────────────────────────────────
  const openAssignNewAdmin = (soc) => {
    setAdminSociety(soc);
    setEditingAdmin(null);
    setAdminForm(EMPTY_ADMIN);
    setAdminErrors({});
    setAdminModalVisible(true);
  };

  const openEditAdmin = (soc, adminObj) => {
    setAdminSociety(soc);
    setEditingAdmin(adminObj);
    setAdminForm({
      name:          adminObj.name || '',
      phone:         adminObj.phone || '',
      password:      '', // blank unless changing
      houseOrFlatNo: adminObj.houseOrFlatNo || '',
      totalMembers:  String(adminObj.totalMembers || 1),
    });
    setAdminErrors({});
    setAdminModalVisible(true);
  };

  const validateAdmin = () => {
    const e = {};
    if (!adminForm.name.trim())    e.name     = 'Admin name is required.';
    if (!adminForm.phone.trim())   e.phone    = 'Phone number is required.';
    else if (!/^\d{10}$/.test(adminForm.phone.trim())) e.phone = 'Enter a valid 10-digit phone.';
    if (!editingAdmin && !adminForm.password.trim()) {
      e.password = 'Password is required for new admin.';
    } else if (adminForm.password.trim() && adminForm.password.trim().length < 6) {
      e.password = 'Min 6 characters required.';
    }
    setAdminErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveAdmin = async () => {
    if (!validateAdmin()) return;
    setAdminSaving(true);
    try {
      if (editingAdmin) {
        // Edit existing admin
        const updatePayload = {
          name:          adminForm.name.trim(),
          phone:         adminForm.phone.trim(),
          houseOrFlatNo: adminForm.houseOrFlatNo.trim() || null,
          totalMembers:  parseInt(adminForm.totalMembers, 10) || 1,
        };
        if (adminForm.password.trim()) {
          updatePayload.password = adminForm.password.trim();
        }

        await residentsAPI.update(editingAdmin._id, updatePayload);
        showSuccess('Admin Updated ✅', `Admin "${adminForm.name}" profile updated.`);
      } else {
        // Create new admin for this society
        await residentsAPI.add({
          name:          adminForm.name.trim(),
          phone:         adminForm.phone.trim(),
          password:      adminForm.password,
          role:          'Admin',
          societyId:     adminSociety._id,
          houseOrFlatNo: adminForm.houseOrFlatNo.trim() || null,
          totalMembers:  parseInt(adminForm.totalMembers, 10) || 1,
        });
        showSuccess(
          'Admin Assigned 🎉',
          `New Admin "${adminForm.name}" created for ${adminSociety.name}.\nThey can login with mobile ${adminForm.phone}.`
        );
      }
      setAdminModalVisible(false);
      fetchSocieties();
    } catch (err) {
      showError('Save Failed', err.message);
    } finally {
      setAdminSaving(false);
    }
  };

  const filtered = societies.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderSocietyItem = ({ item }) => {
    const adminList = item.admins && item.admins.length > 0
      ? item.admins
      : (item.admin ? [item.admin] : []);

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.societyName, { color: colors.text }]}>{item.name}</Text>
            {!!item.city && (
              <Text style={[styles.societySub, { color: colors.textMuted }]}>📍 {item.city} {item.address ? `• ${item.address}` : ''}</Text>
            )}
          </View>
          <View style={[styles.badge, { backgroundColor: item.isActive !== false ? colors.success + '22' : colors.textMuted + '22' }]}>
            <Text style={[styles.badgeText, { color: item.isActive !== false ? colors.success : colors.textMuted }]}>
              {item.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Text style={[styles.statText, { color: colors.textMuted }]}>
            👥 Total Residents: <Text style={{ color: colors.text, fontWeight: '700' }}>{item.residentCount || 0}</Text>
          </Text>
        </View>

        {/* ─── Assigned Admins List ─── */}
        <View style={styles.adminSection}>
          <Text style={[styles.adminSectionHeader, { color: colors.textMuted }]}>
            👑 Assigned Admins ({adminList.length})
          </Text>

          {adminList.length > 0 ? (
            adminList.map((adm) => (
              <View key={adm._id} style={[styles.adminCardRow, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.adminNameText, { color: colors.primary }]}>👤 {adm.name}</Text>
                  <Text style={[styles.adminPhoneText, { color: colors.textMuted }]}>📱 {adm.phone}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.editAdminBtn, { backgroundColor: colors.primary }]}
                  onPress={() => openEditAdmin(item, adm)}>
                  <Text style={styles.editAdminBtnText}>✏️ Edit Admin</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={[styles.adminCardRow, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}>
              <Text style={[styles.adminPhoneText, { color: colors.warning, fontWeight: '700' }]}>
                ⚠️ No Admin assigned yet
              </Text>
            </View>
          )}
        </View>

        {/* ─── Actions Row ─── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.btnAction, { backgroundColor: colors.primary }]}
            onPress={() => openAssignNewAdmin(item)}>
            <Text style={styles.btnActionText}>+ Assign New Admin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnOutline, { borderColor: colors.border }]}
            onPress={() => openEdit(item)}>
            <Text style={[styles.btnOutlineText, { color: colors.text }]}>Edit Society</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnOutline, { borderColor: colors.border }]}
            onPress={() => handleToggleActive(item)}>
            <Text style={[styles.btnOutlineText, { color: item.isActive !== false ? colors.warning : colors.success }]}>
              {item.isActive !== false ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnOutline, { borderColor: colors.danger + '44' }]}
            onPress={() => handleDelete(item)}>
            <Text style={[styles.btnOutlineText, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={[
        styles.header,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingTop: Math.max(insets.top, 16),
        }
      ]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>👑 Societies Panel</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage Societies & Assign Admins</Text>
        </View>
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.danger + '18' }]}
          onPress={logout}>
          <Text style={[styles.logoutText, { color: colors.danger }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search & Add Bar ────────────────────────────────────────────────── */}
      <View style={styles.topActions}>
        <Input
          placeholder="Search by name or city..."
          value={search}
          onChangeText={setSearch}
          containerStyle={styles.searchInput}
        />
        <Button title="+ New Society" onPress={openAdd} style={styles.addBtn} />
      </View>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderSocietyItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🏘</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Societies Found</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>Create your first society to assign an admin and get started.</Text>
            </View>
          }
        />
      )}

      {/* ── Create / Edit Society Modal ─────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editItem ? `Edit: ${editItem.name}` : '✨ Create New Society'}
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Input
                label="Society Name *"
                placeholder="e.g. Royal Heights CHS"
                value={form.name}
                onChangeText={(t) => { setForm((f) => ({ ...f, name: t })); setErrors((e) => ({ ...e, name: '' })); }}
                error={errors.name}
              />
              <Input
                label="City"
                placeholder="e.g. Mumbai, Surat, Ahmedabad"
                value={form.city}
                onChangeText={(t) => setForm((f) => ({ ...f, city: t }))}
              />
              <Input
                label="Address"
                placeholder="e.g. Station Road, Sector 4"
                value={form.address}
                onChangeText={(t) => setForm((f) => ({ ...f, address: t }))}
              />

              <TouchableOpacity
                style={styles.switchRow}
                onPress={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Active Status</Text>
                <View style={[styles.pillToggle, { backgroundColor: form.isActive ? colors.success : colors.textMuted }]}>
                  <Text style={styles.pillToggleText}>{form.isActive ? 'ACTIVE' : 'INACTIVE'}</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={styles.flexBtn}
              />
              <Button
                title={editItem ? 'Save Changes' : 'Create Society'}
                onPress={handleSaveSociety}
                loading={saving}
                style={styles.flexBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Assign / Edit Admin Modal ────────────────────────────────────────── */}
      <Modal visible={adminModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingAdmin ? `✏️ Edit Admin — ${editingAdmin.name}` : `👤 Assign New Admin — ${adminSociety?.name}`}
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Input
                label="Admin Full Name *"
                placeholder="e.g. Ramesh Shah"
                value={adminForm.name}
                onChangeText={(t) => { setAdminForm((f) => ({ ...f, name: t })); setAdminErrors((e) => ({ ...e, name: '' })); }}
                error={adminErrors.name}
              />
              <Input
                label="Mobile Number * (for login)"
                placeholder="10-digit mobile number"
                value={adminForm.phone}
                onChangeText={(t) => { setAdminForm((f) => ({ ...f, phone: t })); setAdminErrors((e) => ({ ...e, phone: '' })); }}
                keyboardType="phone-pad"
                maxLength={10}
                error={adminErrors.phone}
              />
              <Input
                label={editingAdmin ? 'New Password (leave empty to keep unchanged)' : 'Temporary Password *'}
                placeholder={editingAdmin ? 'Enter new password or leave blank' : 'Min 6 characters'}
                value={adminForm.password}
                onChangeText={(t) => { setAdminForm((f) => ({ ...f, password: t })); setAdminErrors((e) => ({ ...e, password: '' })); }}
                secureTextEntry
                error={adminErrors.password}
              />
              <Input
                label="Flat / House No"
                placeholder="e.g. A-101 (optional)"
                value={adminForm.houseOrFlatNo}
                onChangeText={(t) => setAdminForm((f) => ({ ...f, houseOrFlatNo: t }))}
              />
              <Input
                label="Family Members Count"
                placeholder="e.g. 4"
                value={adminForm.totalMembers}
                onChangeText={(t) => setAdminForm((f) => ({ ...f, totalMembers: t }))}
                keyboardType="number-pad"
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setAdminModalVisible(false)}
                style={styles.flexBtn}
              />
              <Button
                title={editingAdmin ? 'Save Admin Changes' : 'Assign New Admin ✨'}
                onPress={handleSaveAdmin}
                loading={adminSaving}
                style={styles.flexBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1 },
  title:       { fontSize: 18, fontWeight: '800' },
  subtitle:    { fontSize: 12, marginTop: 2 },
  logoutBtn:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  logoutText:  { fontSize: 13, fontWeight: '700' },

  topActions:  { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, gap: 8 },
  searchInput: { marginBottom: 0 },
  addBtn:      { marginBottom: SPACING.xs },

  listContent: { padding: SPACING.md, paddingBottom: 40 },
  loaderCenter:{ flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    borderRadius: 18,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
    elevation: 3,
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  societyName: { fontSize: 16, fontWeight: '800' },
  societySub:  { fontSize: 12, marginTop: 3 },
  badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText:   { fontSize: 10, fontWeight: '800' },

  statsRow:    { marginVertical: SPACING.xs },
  statText:    { fontSize: 13 },

  adminSection:       { marginVertical: 8 },
  adminSectionHeader: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  adminCardRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  adminNameText:      { fontSize: 13, fontWeight: '800' },
  adminPhoneText:     { fontSize: 11, marginTop: 2 },
  editAdminBtn:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  editAdminBtnText:   { color: '#fff', fontSize: 11, fontWeight: '700' },

  actionsRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm },
  btnAction:      { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  btnActionText:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  btnOutline:     { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  btnOutlineText: { fontSize: 12, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji:     { fontSize: 44, marginBottom: 8 },
  emptyTitle:     { fontSize: 18, fontWeight: '700' },
  emptySub:       { fontSize: 13, textAlign: 'center', marginTop: 4, paddingHorizontal: 30 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: SPACING.md },
  modalCard:    { borderRadius: 24, padding: SPACING.lg, maxHeight: '85%' },
  modalTitle:   { fontSize: 18, fontWeight: '800', marginBottom: SPACING.md },

  switchRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: SPACING.sm },
  switchLabel:     { fontSize: 14, fontWeight: '600' },
  pillToggle:      { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  pillToggleText:  { color: '#fff', fontSize: 11, fontWeight: '800' },

  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: SPACING.md },
  flexBtn:     { flex: 1 },
});

export default SocietiesScreen;
