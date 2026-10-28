/**
 * src/screens/shared/NoticeBoardScreen.js
 *
 * Notice Board Screen for Society Members and Admins.
 *  • Members can view all society announcements.
 *  • Admins can publish new notices, pin urgent items, or delete notices.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, ScrollView,
  TextInput, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import { noticesAPI } from '../../services/api';
import Button from '../../components/Button';
import { SPACING } from '../../constants';
import Icon from '../../components/Icon';

const CATEGORIES = ['All', 'General', 'Maintenance', 'Meeting', 'Festival', 'Emergency', 'Rules'];
const PRIORITIES = ['Normal', 'High', 'Urgent'];

const NoticeBoardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, isAdmin } = useAuth();
  const { showError, showSuccess, showConfirm } = useAlert();
  const { colors } = useTheme();

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeNotice, setActiveNotice] = useState(null);

  // Form states (Admin)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('Normal');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchNotices = useCallback(async () => {
    try {
      const params = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      const res = await noticesAPI.getAll(params);
      setNotices(res.data.data || []);
    } catch (err) {
      showError('Error', err.message || 'Failed to load notices.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useFocusEffect(useCallback(() => { fetchNotices(); }, [fetchNotices]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotices();
  };

  const handleCreateNotice = async () => {
    if (!title.trim()) {
      showError('Validation', 'Please enter a notice title.');
      return;
    }
    if (!description.trim()) {
      showError('Validation', 'Please enter the notice description.');
      return;
    }

    setSubmitting(true);
    try {
      await noticesAPI.create({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        pinned,
      });
      setCreateModalVisible(false);
      setTitle('');
      setDescription('');
      setCategory('General');
      setPriority('Normal');
      setPinned(false);
      showSuccess('Notice Published', 'The notice has been posted to the society notice board.');
      fetchNotices();
    } catch (err) {
      showError('Error', err.message || 'Could not post notice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = (noticeId) => {
    showConfirm({
      title: 'Delete Notice',
      message: 'Are you sure you want to remove this notice from the board?',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await noticesAPI.remove(noticeId);
          setNotices((prev) => prev.filter((n) => n._id !== noticeId));
          if (activeNotice?._id === noticeId) setDetailModalVisible(false);
          showSuccess('Deleted', 'Notice removed successfully.');
        } catch (err) {
          showError('Error', err.message || 'Could not delete notice.');
        }
      },
    });
  };

  const handleTogglePin = async (item) => {
    try {
      const updated = await noticesAPI.update(item._id, { pinned: !item.pinned });
      setNotices((prev) => prev.map((n) => (n._id === item._id ? updated.data.data : n)));
      if (activeNotice?._id === item._id) setActiveNotice(updated.data.data);
    } catch (err) {
      showError('Error', err.message);
    }
  };

  const getPriorityStyle = (p) => {
    switch (p) {
      case 'Urgent':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'High':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      default:
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    }
  };

  const renderNoticeItem = ({ item }) => {
    const pStyle = getPriorityStyle(item.priority);
    const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          setActiveNotice(item);
          setDetailModalVisible(true);
        }}
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: item.pinned ? colors.primary : colors.border },
          item.pinned && { borderWidth: 1.5 },
        ]}>
        {/* Card Header Tags */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {item.pinned && (
              <View style={[styles.tag, { backgroundColor: colors.primary + '18', borderColor: colors.primary, flexDirection: 'row', alignItems: 'center' }]}>
                <Icon name="pin" size={12} color={colors.primary} style={{ marginRight: 2 }} />
                <Text style={[styles.tagText, { color: colors.primary }]}>PINNED</Text>
              </View>
            )}
            <View style={[styles.tag, { backgroundColor: pStyle.bg, borderColor: pStyle.border }]}>
              <Text style={[styles.tagText, { color: pStyle.text }]}>{item.priority.toUpperCase()}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: colors.border + '50', borderColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.textMuted }]}>{item.category}</Text>
            </View>
          </View>

          <Text style={[styles.dateText, { color: colors.textMuted }]}>{dateStr}</Text>
        </View>

        {/* Notice Title */}
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>

        {/* Excerpt */}
        <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={3}>
          {item.description}
        </Text>

        {/* Card Footer */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.authorText, { color: colors.textMuted }]}>
            By: {item.postedBy?.name || 'Society Admin'}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {isAdmin && (
              <TouchableOpacity onPress={() => handleTogglePin(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 13, color: item.pinned ? colors.primary : colors.textMuted }}>
                  {item.pinned ? 'Unpin' : 'Pin'}
                </Text>
              </TouchableOpacity>
            )}
            {isAdmin && (
              <TouchableOpacity onPress={() => handleDeleteNotice(item._id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 13, color: colors.danger, fontWeight: '700' }}>Delete</Text>
              </TouchableOpacity>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Read More</Text>
              <Icon name="arrow-right" size={13} color={colors.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}>
      {/* Top Header */}
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
            <Text style={[styles.title, { color: colors.text }]}>Notice Board</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              Official society updates & circulars
            </Text>
          </View>
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={[styles.postBtn, { backgroundColor: colors.primary }]}
            onPress={() => setCreateModalVisible(true)}
            activeOpacity={0.8}>
            <Text style={styles.postBtnText}>+ Add Notice</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Chips */}
      <View style={{ maxHeight: 52 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {CATEGORIES.map((cat) => {
            const isSel = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSel && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.text },
                    isSel && { color: '#FFFFFF', fontWeight: '800' },
                  ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notice List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item._id}
          renderItem={renderNoticeItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="clipboard-text-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notices on the Board</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {selectedCategory === 'All'
                  ? 'There are currently no circulars or announcements posted.'
                  : `No notices found under "${selectedCategory}".`}
              </Text>
            </View>
          }
        />
      )}

      {/* ─── Create Notice Modal (Admin) ─── */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Publish New Notice</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Icon name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Title Input */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Notice Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Lift Maintenance Schedule"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />

              {/* Category Picker */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Category</Text>
              <View style={styles.optionRow}>
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
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

              {/* Priority Picker */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Priority Level</Text>
              <View style={styles.optionRow}>
                {PRIORITIES.map((p) => {
                  const isSel = priority === p;
                  const pStyle = getPriorityStyle(p);
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriority(p)}
                      style={[
                        styles.optionChip,
                        { borderColor: colors.border, backgroundColor: colors.background },
                        isSel && { backgroundColor: pStyle.bg, borderColor: pStyle.border },
                      ]}>
                      <Text style={[styles.optionText, { color: isSel ? pStyle.text : colors.text }, isSel && { fontWeight: '800' }]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Pin to Top Switch */}
              <View style={[styles.switchRow, { borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.switchTitle, { color: colors.text }]}>Pin Notice to Top</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>Keep this notice at the very top of the board</Text>
                </View>
                <Switch
                  value={pinned}
                  onValueChange={setPinned}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Description Input */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Full Notice Details *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Write the complete announcement details, dates, or guidelines here..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setCreateModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title={submitting ? 'Posting...' : 'Post Notice'}
                onPress={handleCreateNotice}
                loading={submitting}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Full Notice Details Modal ─── */}
      <Modal visible={detailModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {activeNotice && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {activeNotice.pinned && (
                      <View style={[styles.tag, { backgroundColor: colors.primary + '18', borderColor: colors.primary, flexDirection: 'row', alignItems: 'center' }]}>
                        <Icon name="pin" size={12} color={colors.primary} style={{ marginRight: 2 }} />
                        <Text style={[styles.tagText, { color: colors.primary }]}>PINNED</Text>
                      </View>
                    )}
                    <View style={[styles.tag, { backgroundColor: getPriorityStyle(activeNotice.priority).bg, borderColor: getPriorityStyle(activeNotice.priority).border }]}>
                      <Text style={[styles.tagText, { color: getPriorityStyle(activeNotice.priority).text }]}>
                        {activeNotice.priority.toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.tag, { backgroundColor: colors.border + '50', borderColor: colors.border }]}>
                      <Text style={[styles.tagText, { color: colors.textMuted }]}>{activeNotice.category}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <Icon name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                  <Text style={[styles.detailTitle, { color: colors.text }]}>{activeNotice.title}</Text>
                  <Text style={[styles.detailMeta, { color: colors.textMuted }]}>
                    Posted by {activeNotice.postedBy?.name || 'Admin'}  •  {new Date(activeNotice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>

                  <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />

                  <Text style={[styles.detailBody, { color: colors.text }]}>{activeNotice.description}</Text>
                </ScrollView>

                <View style={{ marginTop: SPACING.md }}>
                  <Button title="Close" onPress={() => setDetailModalVisible(false)} />
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
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
  },
  title:      { fontSize: 19, fontWeight: '900' },
  sub:        { fontSize: 12, marginTop: 1 },
  postBtn: {
    paddingHorizontal: 12,
    paddingVertical:   7,
    borderRadius:      8,
  },
  postBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },

  chipRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical:   8,
    gap:               6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      20,
    borderWidth:       1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },

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
    marginBottom:   SPACING.xs,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical:   3,
    borderRadius:      10,
    borderWidth:       0.8,
  },
  tagText:   { fontSize: 10, fontWeight: '800' },
  dateText:  { fontSize: 11 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  cardDesc:  { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  cardFooter: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingTop:     8,
    borderTopWidth: 0.8,
  },
  authorText: { fontSize: 11, fontStyle: 'italic' },

  empty:      { alignItems: 'center', marginTop: 70, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  emptySub:   { fontSize: 13, textAlign: 'center' },

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
  fieldLabel: { fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth:  1,
    borderRadius: 8,
    padding:      SPACING.sm,
    fontSize:     14,
  },
  textArea: {
    height: 100,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
    marginBottom:  4,
  },
  optionChip: {
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      8,
    borderWidth:       1,
  },
  optionText: { fontSize: 12 },
  switchRow: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingVertical:   8,
    borderBottomWidth: 0.5,
    marginTop:         8,
    marginBottom:      4,
  },
  switchTitle: { fontSize: 13, fontWeight: '700' },
  switchSub:   { fontSize: 11 },
  modalActions: {
    flexDirection: 'row',
    marginTop:     SPACING.md,
  },

  detailTitle:   { fontSize: 18, fontWeight: '900', marginTop: 6 },
  detailMeta:    { fontSize: 12, marginTop: 4, marginBottom: 8 },
  detailDivider: { height: 1, marginVertical: 8 },
  detailBody:    { fontSize: 14, lineHeight: 22 },
});

export default NoticeBoardScreen;
