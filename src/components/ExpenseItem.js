/**
 * src/components/ExpenseItem.js
 *
 * Single card in the expenses feed. Tapping the receipt image opens a modal.
 * Styled with custom brand palette: Background #FFFFFF, Primary #00AFEF, Secondary #3E4095, Dark #1E1E1E.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Image, Dimensions, Pressable,
} from 'react-native';
import { SPACING } from '../constants';
import Icon from './Icon';

const { width: SCREEN_W } = Dimensions.get('window');

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

const CATEGORY_COLOR = {
  'Decoration':       '#8E24AA',
  'Panditji/Pooja':   '#E65100',
  'Mahaprasad/Food':  '#2E7D32',
  'Sound/Lighting':   '#1565C0',
  'Miscellaneous':    '#64748B',
};

const ExpenseItem = ({ item, isAdmin, currentUserId, onApprove, onReject, onEdit, isLight = true }) => {
  const [imgVisible, setImgVisible] = useState(false);
  const { title, amount, category, date, receiptImageUrl, recordedBy, notes, status = 'Pending', rejectionReason, eventId } = item;

  const STATUS_STYLES = {
    Pending:  { bg: '#FFFBEB', text: '#F59E0B', label: 'Pending Approval', icon: 'clock-outline' },
    Approved: { bg: '#ECFDF5', text: '#10B981', label: 'Approved',         icon: 'check-circle-outline' },
    Rejected: { bg: '#FEF2F2', text: '#EF4444', label: 'Rejected',         icon: 'close-circle-outline' },
  };

  const dateStr = new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const catColor = CATEGORY_COLOR[category] || THEME.textMuted;
  const stStyle = STATUS_STYLES[status] || STATUS_STYLES.Pending;
  const eventTitle = eventId?.title || 'General Society Expense';

  const isOwner = recordedBy?._id === currentUserId || recordedBy === currentUserId;
  const canEdit = (isAdmin || isOwner) && status !== 'Approved';

  return (
    <>
      <View style={styles.card}>
        {/* Top Accent Strip */}
        <View style={[styles.cardAccentStrip, { backgroundColor: catColor }]} />

        {/* Event Title Pill */}
        <View style={styles.eventTitleRow}>
          <View style={styles.eventPill}>
            <Icon
              name={eventId?.title ? 'calendar-star' : 'office-building'}
              size={12}
              color={THEME.primary}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.eventTitleText} numberOfLines={1}>{eventTitle}</Text>
          </View>
        </View>

        <View style={styles.row}>
          {/* Category pill & Status badge */}
          <View style={styles.badgeRow}>
            <View style={[styles.catPill, { backgroundColor: `${catColor}15` }]}>
              <Text style={[styles.catText, { color: catColor }]}>{category}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: stStyle.bg }]}>
              <Icon name={stStyle.icon} size={12} color={stStyle.text} style={{ marginRight: 4 }} />
              <Text style={[styles.statusText, { color: stStyle.text }]}>{stStyle.label}</Text>
            </View>
          </View>

          <Text style={styles.amount}>₹{amount.toLocaleString('en-IN')}</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        {notes ? <Text style={styles.notes} numberOfLines={2}>{notes}</Text> : null}

        {/* ── Rejection Reason Box ── */}
        {status === 'Rejected' && rejectionReason ? (
          <View style={styles.rejectionBox}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Icon name="alert-circle-outline" size={15} color={THEME.danger} style={{ marginRight: 6, marginTop: 1 }} />
              <Text style={styles.rejectionText}>
                <Text style={{ fontWeight: '800' }}>Reason: </Text>{rejectionReason}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Card Footer: Metadata & Actions */}
        <View style={styles.footer}>
          <View style={styles.metaRow}>
            <Icon name="calendar-outline" size={12} color={THEME.textMuted} style={{ marginRight: 3 }} />
            <Text style={styles.metaText}>{dateStr}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Icon name="account-outline" size={12} color={THEME.textMuted} style={{ marginRight: 3 }} />
            <Text style={styles.metaText}>{recordedBy?.name ?? 'Admin'}</Text>
          </View>

          <View style={styles.actionBtnRow}>
            {canEdit && onEdit ? (
              <TouchableOpacity
                onPress={() => onEdit(item)}
                style={styles.editBtn}
                activeOpacity={0.75}>
                <Icon name="pencil-outline" size={13} color={THEME.warning} style={{ marginRight: 3 }} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            ) : null}
            {receiptImageUrl ? (
              <TouchableOpacity
                onPress={() => setImgVisible(true)}
                style={styles.imgBtn}
                activeOpacity={0.75}>
                <Icon name="file-image-outline" size={13} color={THEME.primary} style={{ marginRight: 4 }} />
                <Text style={styles.imgBtnText}>View Bill</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ── Admin Action Buttons for Pending Expenses ── */}
        {isAdmin && status === 'Pending' && (
          <View style={styles.adminActionRow}>
            <TouchableOpacity
              style={[styles.adminBtn, { backgroundColor: THEME.success }]}
              onPress={() => onApprove && onApprove(item)}
              activeOpacity={0.8}>
              <Icon name="check" size={14} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.adminBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.adminBtn, { backgroundColor: THEME.danger }]}
              onPress={() => onReject && onReject(item)}
              activeOpacity={0.8}>
              <Icon name="close" size={14} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.adminBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ─── Bill Image Modal ─── */}
      <Modal visible={imgVisible} transparent animationType="fade" onRequestClose={() => setImgVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setImgVisible(false)}>
          <View style={styles.modalContent}>
            <Image
              source={{ uri: receiptImageUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <View style={styles.closeHintPill}>
              <Icon name="close" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.closeHint}>Tap anywhere to close</Text>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius:    20,
    padding:         SPACING.md,
    marginBottom:    SPACING.md,
    borderWidth:     1.2,
    borderColor:     THEME.border,
    backgroundColor: THEME.surface,
    elevation:       2.5,
    shadowColor:     THEME.secondary,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.06,
    shadowRadius:    10,
    overflow:        'hidden',
    position:        'relative',
  },
  cardAccentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3.5,
  },
  eventTitleRow: {
    flexDirection: 'row',
    marginBottom: 6,
    marginTop: 2,
  },
  eventPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 175, 239, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  eventTitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  catPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  catText: { fontSize: 11, fontWeight: '700' },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: { fontSize: 10.5, fontWeight: '800' },
  amount:     { fontSize: 17, fontWeight: '900', color: THEME.danger, letterSpacing: -0.3 },
  title:      { fontSize: 15, fontWeight: '800', color: THEME.dark, marginBottom: 3 },
  notes:      { fontSize: 12, color: THEME.textMuted, marginBottom: 6, lineHeight: 16 },

  rejectionBox: {
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  rejectionText: {
    fontSize: 11.5,
    color: THEME.danger,
    flex: 1,
    lineHeight: 16,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.borderSubtle,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: { fontSize: 11, fontWeight: '500', color: THEME.textMuted },
  metaDot:  { marginHorizontal: 4, color: THEME.textMuted, fontSize: 12 },

  actionBtnRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  editBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtnText: { fontSize: 11, fontWeight: '800', color: THEME.warning },
  imgBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 175, 239, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  imgBtnText: { fontSize: 11, fontWeight: '800', color: THEME.primary },

  adminActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.borderSubtle,
  },
  adminBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1.5,
  },
  adminBtnText: { color: '#FFF', fontWeight: '800', fontSize: 11.5 },

  // Modal
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { alignItems: 'center', justifyContent: 'center' },
  fullImage:    { width: SCREEN_W - 32, height: SCREEN_W - 32, borderRadius: 14 },
  closeHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 14,
  },
  closeHint:    { color: '#fff', fontSize: 12.5, fontWeight: '700' },
});

export default ExpenseItem;
