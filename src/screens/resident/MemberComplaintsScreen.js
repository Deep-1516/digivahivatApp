/**
 * src/screens/resident/MemberComplaintsScreen.js
 *
 * Member Requests & Complaints (Resident Helpdesk).
 *
 * PRIVACY SPECIFICATION:
 * Visible ONLY to the creator member and Society Admins.
 * Other members of the society CANNOT view these requests or complaints.
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

const COMPLAINT_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'Cleanliness',
  'Noise',
  'Parking',
  'Security',
  'Maintenance',
  'Billing',
  'Other',
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const MemberComplaintsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showError, showSuccess, showConfirm } = useAlert();
  const { colors } = useTheme();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('All'); // 'All' | 'Complaint' | 'Request'

  // Submission modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [type, setType] = useState('Complaint'); // 'Complaint' | 'Request'
  const [category, setCategory] = useState('Plumbing');
  const [priority, setPriority] = useState('Medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchComplaints = useCallback(async () => {
    try {
      const params = {};
      if (filterType !== 'All') params.type = filterType;
      // Backend automatically restricts residents to only their own records
      const res = await complaintsAPI.getAll(params);
      setItems(res.data.data || []);
    } catch (err) {
      showError('Error', err.message || 'Could not load your requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterType]);

  useFocusEffect(useCallback(() => { fetchComplaints(); }, [fetchComplaints]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      showError('Validation', 'Please enter a title for your request or complaint.');
      return;
    }
    if (!description.trim()) {
      showError('Validation', 'Please provide details or description.');
      return;
    }

    setSubmitting(true);
    try {
      await complaintsAPI.create({
        title:       title.trim(),
        description: description.trim(),
        type,
        category,
        priority,
        unitOrFlat:  user?.houseOrFlatNo || '',
      });
      setModalVisible(false);
      setTitle('');
      setDescription('');
      setType('Complaint');
      setCategory('Plumbing');
      setPriority('Medium');
      showSuccess(
        'Submitted Successfully',
        `Your ${type.toLowerCase()} has been sent to Society Admins. It is private and visible only to you and management.`
      );
      fetchComplaints();
    } catch (err) {
      showError('Error', err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item) => {
    if (item.status !== 'Pending') {
      showError('Notice', 'Only pending requests can be deleted.');
      return;
    }

    showConfirm({
      title: 'Withdraw Request',
      message: 'Are you sure you want to withdraw this submission?',
      confirmText: 'Withdraw',
      onConfirm: async () => {
        try {
          await complaintsAPI.remove(item._id);
          setItems((prev) => prev.filter((x) => x._id !== item._id));
          showSuccess('Withdrawn', 'Your request has been withdrawn.');
        } catch (err) {
          showError('Error', err.message || 'Could not withdraw request.');
        }
      },
    });
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

  const renderItem = ({ item }) => {
    const sBadge = getStatusBadge(item.status);
    const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
          </View>

          <View style={[styles.statusBadge, { backgroundColor: sBadge.bg, borderColor: sBadge.border }]}>
            <Text style={[styles.statusText, { color: sBadge.text }]}>{sBadge.label}</Text>
          </View>
        </View>

        {/* Title & Date */}
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.cardDate, { color: colors.textMuted }]}>
          Submitted on {dateStr}  •  Priority: {item.priority}
        </Text>

        {/* Description */}
        <Text style={[styles.cardDesc, { color: colors.text }]}>{item.description}</Text>

        {/* Admin Response Box (if available) */}
        {item.adminResponse ? (
          <View style={[styles.responseBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Icon name="comment-text-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.responseTitle, { color: colors.primary }]}>
                Admin Response {item.resolvedBy?.name ? `(${item.resolvedBy.name})` : ''}:
              </Text>
            </View>
            <Text style={[styles.responseText, { color: colors.text }]}>{item.adminResponse}</Text>
            {item.resolvedAt && (
              <Text style={[styles.responseDate, { color: colors.textMuted }]}>
                Updated on {new Date(item.resolvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            )}
          </View>
        ) : null}

        {/* Footer */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="lock-outline" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.privacyNotice, { color: colors.textMuted }]}>
              Confidential (Visible to Admins only)
            </Text>
          </View>
          {item.status === 'Pending' && (
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 12, color: colors.danger, fontWeight: '700' }}>Withdraw</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
          {navigation?.canGoBack?.() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginRight: 10, padding: 4 }}>
              <Icon name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Complain & Requests</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              Private complaints & service requests to Society Admins
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Privacy Banner */}
      <View style={[styles.privacyBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', flexDirection: 'row', alignItems: 'center' }]}>
        <Icon name="shield-lock-outline" size={16} color="#166534" style={{ marginRight: 6 }} />
        <Text style={[styles.privacyBannerText, { flex: 1 }]}>
          <Text style={{ fontWeight: '800' }}>Private & Confidential: </Text>Your submissions are visible ONLY to you and Society Admins. Other members of the society cannot view your complaints or requests.
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { key: 'All', label: 'All Submissions' },
          { key: 'Complaint', label: 'Complaints', icon: 'alert-circle-outline' },
          { key: 'Request', label: 'Requests', icon: 'file-document-edit-outline' },
        ].map((tab) => {
          const isSel = filterType === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setFilterType(tab.key)}
              style={[
                styles.tabBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSel && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}>
              <Text
                style={[
                  styles.tabText,
                  { color: colors.text },
                  isSel && { color: '#FFFFFF', fontWeight: '800' },
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content List */}
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
              <Icon name="inbox-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Submissions Found</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Have a maintenance issue, repair request, or dispute? Tap "+ New" to privately notify your society administration.
              </Text>
            </View>
          }
        />
      )}

      {/* ─── Create Request / Complaint Modal ─── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                New Member Submission
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Type Switcher (Complaint vs Request) */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Submission Type *</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                {[
                  { key: 'Complaint', label: 'Issue / Complaint', icon: 'alert-circle-outline', desc: 'Report a problem or disruption' },
                  { key: 'Request', label: 'Service Request', icon: 'file-document-edit-outline', desc: 'Request permission, help, or amenity' },
                ].map((t) => {
                  const isSel = type === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setType(t.key)}
                      style={[
                        styles.typeSelectBox,
                        { borderColor: colors.border, backgroundColor: colors.background },
                        isSel && { borderColor: colors.primary, backgroundColor: colors.primary + '14' },
                      ]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Icon name={t.icon} size={15} color={isSel ? colors.primary : colors.text} style={{ marginRight: 4 }} />
                        <Text style={[styles.typeSelectTitle, { color: colors.text }, isSel && { color: colors.primary }]}>
                          {t.label}
                        </Text>
                      </View>
                      <Text style={[styles.typeSelectDesc, { color: colors.textMuted }]}>{t.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Category */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Category *</Text>
              <View style={styles.optionRow}>
                {COMPLAINT_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[
                      styles.optionChip,
                      { borderColor: colors.border, backgroundColor: colors.background },
                      category === c && { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                    ]}>
                    <Text style={[styles.optionText, { color: colors.text }, category === c && { color: colors.primary, fontWeight: '700' }]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Priority */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Urgency / Priority</Text>
              <View style={styles.optionRow}>
                {PRIORITIES.map((p) => {
                  const isSel = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriority(p)}
                      style={[
                        styles.optionChip,
                        { borderColor: colors.border, backgroundColor: colors.background },
                        isSel && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}>
                      <Text style={[styles.optionText, { color: colors.text }, isSel && { color: '#FFFFFF', fontWeight: '800' }]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Title */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Summary / Subject *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder={type === 'Complaint' ? 'e.g. Water leakage in 3rd floor pipe' : 'e.g. Request for elevator key during shifting'}
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />

              {/* Description */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Detailed Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Describe the issue, location, when it occurred, or what assistance is needed..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />

              {/* Info footer */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <Icon name="shield-lock-outline" size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.modalPrivacyNote, { color: colors.textMuted, marginTop: 0, flex: 1 }]}>
                  This request is confidential and will only be shared with verified Society Admins.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title={submitting ? 'Submitting...' : 'Submit Privately'}
                onPress={handleCreate}
                loading={submitting}
                style={{ flex: 1 }}
              />
            </View>
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
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
  },
  title:  { fontSize: 19, fontWeight: '900' },
  sub:    { fontSize: 11, marginTop: 1 },
  newBtn: {
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      8,
  },
  newBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },

  privacyBanner: {
    marginHorizontal: SPACING.md,
    marginTop:        8,
    padding:          SPACING.sm,
    borderRadius:     8,
    borderWidth:      1,
  },
  privacyBannerText: {
    fontSize:   11.5,
    color:      '#166534',
    lineHeight: 16,
  },

  filterRow: {
    flexDirection:     'row',
    paddingHorizontal: SPACING.md,
    paddingVertical:   8,
    gap:               6,
  },
  tabBtn: {
    flex:              1,
    paddingVertical:   8,
    borderRadius:      12,
    borderWidth:       1,
    alignItems:        'center',
  },
  tabText: { fontSize: 12, fontWeight: '700' },

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
    alignItems:     'center',
    marginBottom:   6,
  },
  typeBadge: {
    paddingHorizontal: 9,
    paddingVertical:   4,
    borderRadius:      10,
  },
  typeText: { fontSize: 11, fontWeight: '800' },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      10,
  },
  catText: { fontSize: 10.5, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical:   4,
    borderRadius:      10,
    borderWidth:       0.8,
  },
  statusText: { fontSize: 10.5, fontWeight: '900' },

  cardTitle: { fontSize: 16, fontWeight: '800', marginTop: 2, marginBottom: 2 },
  cardDate:  { fontSize: 11, marginBottom: 8 },
  cardDesc:  { fontSize: 13.5, lineHeight: 19, marginBottom: 8 },

  responseBox: {
    padding:         SPACING.sm,
    borderRadius:    8,
    borderWidth:     0.8,
    marginTop:       6,
    marginBottom:    4,
  },
  responseTitle: { fontSize: 12, fontWeight: '800', marginBottom: 2 },
  responseText:  { fontSize: 12.5, lineHeight: 17 },
  responseDate:  { fontSize: 10, marginTop: 4, fontStyle: 'italic' },

  cardFooter: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingTop:     8,
    borderTopWidth: 0.8,
    marginTop:      4,
  },
  privacyNotice: { fontSize: 10.5, fontStyle: 'italic' },

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
    marginBottom:   SPACING.sm,
  },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  typeSelectBox: {
    flex:         1,
    padding:      8,
    borderRadius: 8,
    borderWidth:  1,
  },
  typeSelectTitle: { fontSize: 12, fontWeight: '800' },
  typeSelectDesc:  { fontSize: 10, marginTop: 2 },
  optionRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    marginBottom:  4,
  },
  optionChip: {
    paddingHorizontal: 9,
    paddingVertical:   5,
    borderRadius:      8,
    borderWidth:       1,
  },
  optionText: { fontSize: 11.5 },
  input: {
    borderWidth:  1,
    borderRadius: 8,
    padding:      SPACING.sm,
    fontSize:     13.5,
  },
  textArea: {
    height: 90,
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

export default MemberComplaintsScreen;
