/**
 * src/screens/admin/AdminComplaintsScreen.js
 *
 * Admin Helpdesk: Member Complaints & Requests Manager.
 *
 * PRIVACY SPECIFICATION:
 * Admins can view and resolve all requests and complaints submitted
 * by residents of their society.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import { complaintsAPI } from '../../services/api';
import Button from '../../components/Button';
import { SPACING } from '../../constants';
import Icon from '../../components/Icon';

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Resolved', 'Rejected'];

const AdminComplaintsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showError, showSuccess } = useAlert();
  const { colors } = useTheme();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState('All');     // 'All' | 'Complaint' | 'Request'
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Pending' | 'In Progress' | 'Resolved' | 'Rejected'

  // Action / Resolution Modal
  const [selectedItem, setSelectedItem] = useState(null);
  const [newStatus, setNewStatus] = useState('In Progress');
  const [adminResponse, setAdminResponse] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchComplaints = useCallback(async () => {
    try {
      const params = {};
      if (filterType !== 'All')   params.type   = filterType;
      if (filterStatus !== 'All') params.status = filterStatus;

      const res = await complaintsAPI.getAll(params);
      setItems(res.data.data || []);
    } catch (err) {
      showError('Error', err.message || 'Could not load complaints.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterType, filterStatus]);

  useFocusEffect(useCallback(() => { fetchComplaints(); }, [fetchComplaints]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const openActionModal = (item) => {
    setSelectedItem(item);
    setNewStatus(item.status);
    setAdminResponse(item.adminResponse || '');
  };

  const handleUpdateStatus = async () => {
    if (!selectedItem) return;

    setUpdating(true);
    try {
      const res = await complaintsAPI.updateStatus(selectedItem._id, {
        status:        newStatus,
        adminResponse: adminResponse.trim(),
      });

      setItems((prev) =>
        prev.map((it) => (it._id === selectedItem._id ? res.data.data : it))
      );
      setSelectedItem(null);
      showSuccess('Status Updated', `Marked as "${newStatus}". Response saved for resident.`);
    } catch (err) {
      showError('Error', err.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved':
        return { label: 'RESOLVED', bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' };
      case 'In Progress':
        return { label: 'IN PROGRESS', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      case 'Rejected':
        return { label: 'REJECTED', bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      default:
        return { label: 'PENDING', bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
    }
  };

  // Aggregated counts
  const pendingCount    = items.filter((i) => i.status === 'Pending').length;
  const inProgressCount = items.filter((i) => i.status === 'In Progress').length;
  const resolvedCount   = items.filter((i) => i.status === 'Resolved').length;

  const renderItem = ({ item }) => {
    const sBadge = getStatusBadge(item.status);
    const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    const residentName = item.residentId?.name || 'Resident';
    const flatNo = item.unitOrFlat || item.residentId?.houseOrFlatNo ? `Flat ${item.unitOrFlat || item.residentId?.houseOrFlatNo}` : 'Resident';
    const phone = item.residentId?.phone || '';

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Header: Member info & Status badge */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="account" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.residentName, { color: colors.text }]}>
                {residentName}  •  <Text style={{ color: colors.primary }}>{flatNo}</Text>
              </Text>
            </View>
            {phone ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Icon name="phone-outline" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.phoneText, { color: colors.textMuted }]}>{phone}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: sBadge.bg, borderColor: sBadge.border }]}>
            <Text style={[styles.statusText, { color: sBadge.text }]}>{sBadge.label}</Text>
          </View>
        </View>

        {/* Sub-header tags */}
        <View style={styles.tagRow}>
          <View style={[styles.typeBadge, { backgroundColor: item.type === 'Complaint' ? '#FEE2E2' : '#EFF6FF', flexDirection: 'row', alignItems: 'center' }]}>
            <Icon
              name={item.type === 'Complaint' ? 'alert-circle-outline' : 'file-document-edit-outline'}
              size={13}
              color={item.type === 'Complaint' ? '#DC2626' : '#2563EB'}
              style={{ marginRight: 3 }}
            />
            <Text style={[styles.typeText, { color: item.type === 'Complaint' ? '#DC2626' : '#2563EB' }]}>
              {item.type}
            </Text>
          </View>
          <View style={[styles.catBadge, { backgroundColor: colors.border + '50' }]}>
            <Text style={[styles.catText, { color: colors.textMuted }]}>{item.category}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: item.priority === 'Urgent' ? '#FEE2E2' : colors.border + '30' }]}>
            <Text style={[styles.priorityText, { color: item.priority === 'Urgent' ? '#DC2626' : colors.textMuted }]}>
              {item.priority} Priority
            </Text>
          </View>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>{dateStr}</Text>
        </View>

        {/* Title & Description */}
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.cardDesc, { color: colors.text }]}>{item.description}</Text>

        {/* Admin Response (if existing) */}
        {item.adminResponse ? (
          <View style={[styles.responseBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Icon name="comment-text-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.responseTitle, { color: colors.primary }]}>
                Current Admin Remarks:
              </Text>
            </View>
            <Text style={[styles.responseText, { color: colors.text }]}>{item.adminResponse}</Text>
            {item.resolvedBy?.name && (
              <Text style={[styles.responseMeta, { color: colors.textMuted }]}>
                By {item.resolvedBy.name}
              </Text>
            )}
          </View>
        ) : null}

        {/* Footer Action */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="lock-outline" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.privacyNotice, { color: colors.textMuted }]}>
              Private to {residentName} & Admins
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
            onPress={() => openActionModal(item)}
            activeOpacity={0.8}>
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Update / Resolve</Text>
            <Icon name="arrow-right" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
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
            <Text style={[styles.title, { color: colors.text }]}>Member Complaints</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              Member complaints & service requests
            </Text>
          </View>
        </View>
      </View>

      {/* Stat Counter Strip */}
      <View style={styles.statsStrip}>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statVal, { color: '#D97706' }]}>{pendingCount}</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>Pending</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statVal, { color: '#2563EB' }]}>{inProgressCount}</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>In Progress</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statVal, { color: '#16A34A' }]}>{resolvedCount}</Text>
          <Text style={[styles.statLbl, { color: colors.textMuted }]}>Resolved</Text>
        </View>
      </View>

      {/* Filters: Type + Status */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          {['All', 'Complaint', 'Request'].map((t) => {
            const isSel = filterType === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setFilterType(t)}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSel && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}>
                <Text style={[styles.filterChipText, { color: isSel ? '#FFFFFF' : colors.text }, isSel && { fontWeight: '800' }]}>
                  {t === 'All' ? 'All Types' : t === 'Complaint' ? 'Complaints' : 'Requests'}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 4 }} />

          {['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'].map((s) => {
            const isSel = filterStatus === s;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setFilterStatus(s)}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSel && { backgroundColor: '#1E293B', borderColor: '#1E293B' },
                ]}>
                <Text style={[styles.filterChipText, { color: isSel ? '#FFFFFF' : colors.textMuted }, isSel && { fontWeight: '800' }]}>
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="checkbox-marked-circle-outline" size={44} color="#10B981" style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Complaints or Requests</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {filterStatus !== 'All' || filterType !== 'All'
                  ? 'No submissions match the current filter selection.'
                  : 'All member grievances and service requests are clear!'}
              </Text>
            </View>
          }
        />
      )}

      {/* ─── Status Update & Resolution Modal ─── */}
      <Modal visible={!!selectedItem} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Take Action on Submission
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedItem(null)}>
                    <Icon name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                  <Text style={[styles.modalItemTitle, { color: colors.text }]}>{selectedItem.title}</Text>
                  <Text style={[styles.modalItemSub, { color: colors.textMuted }]}>
                    By {selectedItem.residentId?.name || 'Resident'} ({selectedItem.unitOrFlat || 'Flat N/A'})
                  </Text>

                  {/* Status Selection */}
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Update Status *</Text>
                  <View style={styles.statusRow}>
                    {STATUS_OPTIONS.map((st) => {
                      const isSel = newStatus === st;
                      const sStyle = getStatusBadge(st);
                      return (
                        <TouchableOpacity
                          key={st}
                          onPress={() => setNewStatus(st)}
                          style={[
                            styles.statusBtn,
                            { borderColor: colors.border, backgroundColor: colors.background },
                            isSel && { backgroundColor: sStyle.bg, borderColor: sStyle.border },
                          ]}>
                          <Text
                            style={[
                              styles.statusBtnText,
                              { color: colors.text },
                              isSel && { color: sStyle.text, fontWeight: '900' },
                            ]}>
                            {st}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Admin Remarks / Response */}
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Admin Response / Resolution Remarks
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="e.g. Electrician sent at 3 PM, issue resolved. OR Pending parts arrival."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    value={adminResponse}
                    onChangeText={setAdminResponse}
                  />

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                    <Icon name="shield-lock-outline" size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.modalPrivacyNote, { color: colors.textMuted, marginTop: 0, flex: 1 }]}>
                      This response will only be visible to the submitting member ({selectedItem.residentId?.name || 'Resident'}).
                    </Text>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setSelectedItem(null)}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title={updating ? 'Saving...' : 'Save & Update'}
                    onPress={handleUpdateStatus}
                    loading={updating}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    borderBottomWidth: 1,
  },
  title: { fontSize: 19, fontWeight: '900' },
  sub:   { fontSize: 11.5, marginTop: 1 },

  statsStrip: {
    flexDirection:     'row',
    paddingHorizontal: SPACING.md,
    paddingVertical:   8,
    gap:               8,
  },
  statBox: {
    flex:         1,
    padding:      8,
    borderRadius: 10,
    borderWidth:  1,
    alignItems:   'center',
  },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLbl: { fontSize: 10.5, fontWeight: '700', marginTop: 1 },

  filterSection: {
    maxHeight: 46,
  },
  filterChips: {
    paddingHorizontal: SPACING.md,
    paddingVertical:   4,
    gap:               6,
    alignItems:        'center',
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical:   5,
    borderRadius:      16,
    borderWidth:       1,
  },
  filterChipText: { fontSize: 11.5, fontWeight: '600' },

  listContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  card: {
    borderRadius: 18,
    padding:      SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth:  1,
    elevation:    2.5,
    shadowColor:  '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius:  10,
  },
  cardHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   6,
  },
  residentName: { fontSize: 14, fontWeight: '800' },
  phoneText:    { fontSize: 11, marginTop: 1 },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical:   4,
    borderRadius:      10,
    borderWidth:       0.8,
  },
  statusText: { fontSize: 10.5, fontWeight: '900' },

  tagRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    flexWrap:      'wrap',
    marginBottom:  6,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      6,
  },
  typeText: { fontSize: 10.5, fontWeight: '800' },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      6,
  },
  catText: { fontSize: 10.5, fontWeight: '600' },
  priorityBadge: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      6,
  },
  priorityText: { fontSize: 10, fontWeight: '700' },
  dateText:     { fontSize: 10.5, marginLeft: 'auto' },

  cardTitle: { fontSize: 15.5, fontWeight: '800', marginBottom: 4 },
  cardDesc:  { fontSize: 13, lineHeight: 18, marginBottom: 8 },

  responseBox: {
    padding:         SPACING.sm,
    borderRadius:    8,
    borderWidth:     0.8,
    marginTop:       4,
    marginBottom:    6,
  },
  responseTitle: { fontSize: 11.5, fontWeight: '800', marginBottom: 2 },
  responseText:  { fontSize: 12.5, lineHeight: 17 },
  responseMeta:  { fontSize: 10, marginTop: 3, fontStyle: 'italic' },

  cardFooter: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingTop:     8,
    borderTopWidth: 0.8,
    marginTop:      4,
  },
  privacyNotice: { fontSize: 10.5, fontStyle: 'italic' },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      6,
    borderWidth:       0.8,
  },
  actionBtnText: { fontSize: 11.5, fontWeight: '800' },

  empty:      { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // Modal styles
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent:  'center',
    padding:         SPACING.md,
  },
  modalBox: {
    borderRadius: 16,
    padding:      SPACING.md,
    borderWidth:  1,
    elevation:    10,
  },
  modalHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   SPACING.xs,
  },
  modalTitle:     { fontSize: 17, fontWeight: '800' },
  modalItemTitle: { fontSize: 15, fontWeight: '800', marginTop: 8 },
  modalItemSub:   { fontSize: 12, marginTop: 2, marginBottom: 8 },
  fieldLabel:     { fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  statusRow: {
    flexDirection: 'row',
    gap:           6,
    marginBottom:  4,
  },
  statusBtn: {
    flex:            1,
    paddingVertical: 7,
    borderRadius:    8,
    borderWidth:     1,
    alignItems:      'center',
  },
  statusBtnText: { fontSize: 11 },
  input: {
    borderWidth:  1,
    borderRadius: 8,
    padding:      SPACING.sm,
    fontSize:     13.5,
  },
  textArea: {
    height: 80,
  },
  modalPrivacyNote: {
    fontSize:  11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop:     SPACING.md,
  },
});

export default AdminComplaintsScreen;
