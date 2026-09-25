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
    Pending:  { bg: isDark ? '#4A2800' : '#FFF3E0', text: '#FF9800', label: '⏳ Pending Approval' },
    Approved: { bg: isDark ? '#1B3E20' : '#E8F5E9', text: '#4CAF50', label: '✅ Approved' },
    Rejected: { bg: isDark ? '#4A151B' : '#FFEBEE', text: '#F44336', label: '❌ Rejected' },
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
        <Text style={[styles.eventTitlePill, { color: colors.primary }]}>🎉 {eventTitle}</Text>

        <View style={styles.row}>
          {/* Category pill & Status badge */}
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <View style={[styles.catPill, { backgroundColor: catColor + '25' }]}>
              <Text style={[styles.catText, { color: catColor }]}>{category}</Text>
            </View>
            <View style={[styles.catPill, { backgroundColor: stStyle.bg }]}>
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
            <Text style={[styles.rejectionText, { color: isDark ? '#EF4444' : '#C62828' }]}>
              ⚠️ <Text style={{ fontWeight: '700' }}>Reason for rejection:</Text> {rejectionReason}
            </Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={[styles.meta, { color: colors.textMuted }]}>{dateStr}  ·  {recordedBy?.name ?? 'Admin'}</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {canEdit && onEdit ? (
              <TouchableOpacity onPress={() => onEdit(item)} style={[styles.editBtn, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.editBtnText, { color: colors.warning }]}>✎ Edit</Text>
              </TouchableOpacity>
            ) : null}
            {receiptImageUrl ? (
              <TouchableOpacity onPress={() => setImgVisible(true)} style={[styles.imgBtn, { backgroundColor: colors.info + '20' }]}>
                <Text style={[styles.imgBtnText, { color: colors.info }]}>View Bill 🖼</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ── Admin Action Buttons for Pending Expenses ── */}
        {isAdmin && status === 'Pending' && (
          <View style={[styles.adminActionRow, { borderTopColor: colors.border + '60' }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
              onPress={() => onApprove && onApprove(item)}>
              <Text style={styles.actionBtnText}>✓ Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.danger }]}
              onPress={() => onReject && onReject(item)}>
              <Text style={styles.actionBtnText}>✕ Reject</Text>
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
    borderRadius:    12,
    padding:         SPACING.md,
    marginBottom:    SPACING.sm,
    borderWidth:     1,
    elevation:       1,
  },
  eventTitlePill: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catText: { fontSize: 11, fontWeight: '600' },
  amount:  { fontSize: 16, fontWeight: '800' },
  title:   { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  notes:   { fontSize: 12, marginBottom: 4 },
  rejectionBox: {
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
    marginBottom: 6,
    borderWidth: 1,
  },
  rejectionText: { fontSize: 12 },
  footer:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  meta:    { fontSize: 11 },
  editBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  editBtnText: { fontSize: 11, fontWeight: '700' },
  imgBtn:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  imgBtnText: { fontSize: 11, fontWeight: '600' },
  adminActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  // Modal
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: SCREEN_W - 32, height: SCREEN_W - 32 },
  closeHint: { color: '#fff', marginTop: 12, fontSize: 13, opacity: 0.7 },
});

export default ExpenseItem;
