/**
 * src/components/ExpenseItem.js
 *
 * Single row in the expenses feed. Tapping the receipt image opens a modal.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Image, Dimensions, Pressable,
} from 'react-native';
import { SPACING } from '../constants';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

const { width: SCREEN_W } = Dimensions.get('window');

const CATEGORY_COLOR = {
  'Decoration':       '#8E24AA',
  'Panditji/Pooja':   '#E65100',
  'Mahaprasad/Food':  '#2E7D32',
  'Sound/Lighting':   '#1565C0',
  'Miscellaneous':    '#757575',
};

const ExpenseItem = ({ item, isAdmin, currentUserId, onApprove, onReject, onEdit }) => {
  const { colors, isDark } = useTheme();
  const [imgVisible, setImgVisible] = useState(false);
  const { title, amount, category, date, receiptImageUrl, recordedBy, notes, status = 'Pending', rejectionReason, eventId } = item;

  const STATUS_STYLES = {
    Pending:  { bg: isDark ? '#4A2800' : '#FFF3E0', text: '#FF9800', label: 'Pending Approval', icon: 'clock-outline' },
    Approved: { bg: isDark ? '#1B3E20' : '#E8F5E9', text: '#4CAF50', label: 'Approved', icon: 'check-circle-outline' },
    Rejected: { bg: isDark ? '#4A151B' : '#FFEBEE', text: '#F44336', label: 'Rejected', icon: 'close-circle-outline' },
  };

  const dateStr = new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const catColor = CATEGORY_COLOR[category] || colors.textMuted;
  const stStyle = STATUS_STYLES[status] || STATUS_STYLES.Pending;
  const eventTitle = eventId?.title ?? 'Society Event';

  const isOwner = recordedBy?._id === currentUserId || recordedBy === currentUserId;
  const canEdit = (isAdmin || isOwner) && status !== 'Approved';

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Event Title pill */}
        <Text style={[styles.eventTitlePill, { color: colors.primary }]}>{eventTitle}</Text>

        <View style={styles.row}>
          {/* Category pill & Status badge */}
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <View style={[styles.catPill, { backgroundColor: catColor + '25' }]}>
              <Text style={[styles.catText, { color: catColor }]}>{category}</Text>
            </View>
            <View style={[styles.catPill, { backgroundColor: stStyle.bg, flexDirection: 'row', alignItems: 'center' }]}>
              <Icon name={stStyle.icon} size={12} color={stStyle.text} style={{ marginRight: 3 }} />
              <Text style={[styles.catText, { color: stStyle.text }]}>{stStyle.label}</Text>
            </View>
          </View>

          <Text style={[styles.amount, { color: colors.danger }]}>₹{amount.toLocaleString('en-IN')}</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {notes ? <Text style={[styles.notes, { color: colors.textMuted }]} numberOfLines={2}>{notes}</Text> : null}

        {/* ── Rejection Reason Box (displayed to both Admin & Resident) ── */}
        {status === 'Rejected' && rejectionReason ? (
          <View style={[styles.rejectionBox, { backgroundColor: isDark ? '#3D1518' : '#FFEBEE', borderColor: isDark ? '#7F1D1D' : '#FFCDD2' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Icon name="alert-circle-outline" size={15} color={isDark ? '#EF4444' : '#C62828'} style={{ marginRight: 5, marginTop: 1 }} />
              <Text style={[styles.rejectionText, { color: isDark ? '#EF4444' : '#C62828', flex: 1 }]}>
                <Text style={{ fontWeight: '700' }}>Reason for rejection: </Text>{rejectionReason}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={[styles.meta, { color: colors.textMuted }]}>{dateStr}  ·  {recordedBy?.name ?? 'Admin'}</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {canEdit && onEdit ? (
              <TouchableOpacity onPress={() => onEdit(item)} style={[styles.editBtn, { backgroundColor: colors.warning + '20', flexDirection: 'row', alignItems: 'center' }]}>
                <Icon name="pencil-outline" size={13} color={colors.warning} style={{ marginRight: 3 }} />
                <Text style={[styles.editBtnText, { color: colors.warning }]}>Edit</Text>
              </TouchableOpacity>
            ) : null}
            {receiptImageUrl ? (
              <TouchableOpacity onPress={() => setImgVisible(true)} style={[styles.imgBtn, { backgroundColor: colors.info + '20', flexDirection: 'row', alignItems: 'center' }]}>
                <Icon name="file-image-outline" size={13} color={colors.info} style={{ marginRight: 3 }} />
                <Text style={[styles.imgBtnText, { color: colors.info }]}>View Bill</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ── Admin Action Buttons for Pending Expenses ── */}
        {isAdmin && status === 'Pending' && (
          <View style={[styles.adminActionRow, { borderTopColor: colors.border + '60' }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success, flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => onApprove && onApprove(item)}>
              <Icon name="check" size={14} color="#FFF" style={{ marginRight: 3 }} />
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.danger, flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => onReject && onReject(item)}>
              <Icon name="close" size={14} color="#FFF" style={{ marginRight: 3 }} />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ─── Bill Image Modal ─────────────────────────────────────────── */}
      <Modal visible={imgVisible} transparent animationType="fade" onRequestClose={() => setImgVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setImgVisible(false)}>
          <Image
            source={{ uri: receiptImageUrl }}
            style={styles.fullImage}
            resizeMode="contain"
          />
          <Text style={styles.closeHint}>Tap anywhere to close</Text>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius:    16,
    padding:         SPACING.md,
    marginBottom:    SPACING.sm,
    borderWidth:     1,
    elevation:       2,
    shadowColor:     '#4F46E5',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.05,
    shadowRadius:    8,
  },
  eventTitlePill: { fontSize: 11, fontWeight: '800', marginBottom: 5, letterSpacing: 0.2 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  catText: { fontSize: 11, fontWeight: '700' },
  amount:  { fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  title:   { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  notes:   { fontSize: 12, marginBottom: 5 },
  rejectionBox: {
    borderRadius: 12,
    padding: 10,
    marginTop: 5,
    marginBottom: 6,
    borderWidth: 1,
  },
  rejectionText: { fontSize: 12 },
  footer:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  meta:    { fontSize: 11 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  editBtnText: { fontSize: 11, fontWeight: '700' },
  imgBtn:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  imgBtnText: { fontSize: 11, fontWeight: '700' },
  adminActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  // Modal
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: SCREEN_W - 32, height: SCREEN_W - 32 },
  closeHint: { color: '#fff', marginTop: 12, fontSize: 13, opacity: 0.7 },
});

export default ExpenseItem;
