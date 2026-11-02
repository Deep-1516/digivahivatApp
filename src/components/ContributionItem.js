/**
 * src/components/ContributionItem.js
 *
 * Single row in the contributions list.
 * Styled with modern avatar badge, clean pill metadata, and tactile receipt action.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SPACING } from '../constants';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

const ContributionItem = ({ item, onPressReceipt, isLight = false, style }) => {
  const { colors } = useTheme();
  const { residentId, amount, paymentMode, paymentStatus, date, transactionId, eventId, contributionType, annualYear } = item;

  const STATUS_COLOR = {
    Paid:    isLight ? '#10B981' : colors.success,
    Partial: isLight ? '#F59E0B' : colors.warning,
    Pending: isLight ? '#EF4444' : colors.danger,
  };

  const cardBg = isLight ? '#FFFFFF' : colors.surface;
  const cardBorder = isLight ? '#E2E8F0' : colors.border;
  const textColor = isLight ? '#1E1E1E' : colors.text;
  const textMuted = isLight ? '#64748B' : colors.textMuted;
  const primaryColor = isLight ? '#00AFEF' : colors.primary;
  const secondaryColor = isLight ? '#3E4095' : colors.primary;

  const dateStr = new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const eventName = contributionType === 'Annual'
    ? `Society Maintenance ${annualYear ?? ''}`
    : `${eventId?.title ?? 'Society Event'}`;

  const residentName = residentId?.name ?? 'Resident';
  const initial = residentName.charAt(0).toUpperCase() || 'R';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }, isLight && styles.cardLightShadow, style]}>
      <View style={styles.row}>
        {/* Left: Avatar with initials */}
        <View style={[styles.avatar, { backgroundColor: `${secondaryColor}15` }]}>
          <Text style={[styles.avatarText, { color: secondaryColor }]}>{initial}</Text>
        </View>

        {/* Center: Info */}
        <View style={styles.info}>
          <View style={styles.eventBadge}>
            <Text style={[styles.eventBadgeText, { color: primaryColor }]} numberOfLines={1}>
              {eventName}
            </Text>
          </View>
          <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>{residentName}</Text>
          <View style={styles.subRow}>
            {residentId?.houseOrFlatNo ? (
              <View style={styles.flatTag}>
                <Text style={styles.flatTagText}>Flat {residentId.houseOrFlatNo}</Text>
              </View>
            ) : null}
            <Text style={[styles.subText, { color: textMuted }]}>{dateStr} · {paymentMode}</Text>
          </View>
          {transactionId ? (
            <Text style={[styles.txn, { color: textMuted }]} numberOfLines={1}>TXN: {transactionId}</Text>
          ) : null}
        </View>

        {/* Right: Amount + Status + Receipt */}
        <View style={styles.right}>
          <Text style={[styles.amount, { color: STATUS_COLOR.Paid }]}>₹{amount.toLocaleString('en-IN')}</Text>
          <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[paymentStatus] || primaryColor) + '1A' }]}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[paymentStatus] || primaryColor }]} />
            <Text style={[styles.badgeText, { color: STATUS_COLOR[paymentStatus] || primaryColor }]}>
              {paymentStatus}
            </Text>
          </View>
          {onPressReceipt ? (
            <TouchableOpacity
              style={[styles.receiptBtn, { backgroundColor: `${primaryColor}12` }]}
              onPress={() => onPressReceipt(item)}
              activeOpacity={0.75}>
              <Icon name="file-pdf-box" size={15} color={primaryColor} style={{ marginRight: 3 }} />
              <Text style={[styles.receiptBtnText, { color: primaryColor }]}>Receipt</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius:    18,
    padding:         13,
    marginBottom:    SPACING.sm,
    borderWidth:     1.2,
    elevation:       2.5,
    shadowColor:     '#3E4095',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
  },
  cardLightShadow: {
    shadowColor:     '#3E4095',
    shadowOpacity:   0.06,
    shadowRadius:    10,
    elevation:       2,
  },
  row:    { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width:          40,
    height:         40,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
    marginRight:    12,
  },
  avatarText: {
    fontSize:   16,
    fontWeight: '900',
  },
  info:   { flex: 1, marginRight: SPACING.sm },
  eventBadge: {
    alignSelf:         'flex-start',
    backgroundColor:   'rgba(0, 175, 239, 0.08)',
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      6,
    marginBottom:      4,
  },
  eventBadgeText: {
    fontSize:      10.5,
    fontWeight:    '800',
    letterSpacing: 0.2,
  },
  name:   { fontSize: 14.5, fontWeight: '800', marginBottom: 2 },
  subRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  flatTag: {
    backgroundColor:   'rgba(62, 64, 149, 0.08)',
    paddingHorizontal: 6,
    paddingVertical:   1.5,
    borderRadius:      5,
  },
  flatTagText: {
    fontSize:   10,
    fontWeight: '800',
    color:      '#3E4095',
  },
  subText: { fontSize: 11, fontWeight: '500' },
  txn:    { fontSize: 9.5, marginTop: 3, fontWeight: '500' },
  right:  { alignItems: 'flex-end', justifyContent: 'center' },
  amount: { fontSize: 16.5, fontWeight: '900', letterSpacing: -0.2 },
  badge:  {
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:      10,
    paddingHorizontal: 8,
    paddingVertical:   3,
    marginTop:         4,
  },
  statusDot: {
    width:        5,
    height:       5,
    borderRadius: 2.5,
    marginRight:  4,
  },
  badgeText: { fontSize: 10.5, fontWeight: '800' },
  receiptBtn: {
    marginTop:         6,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      8,
    flexDirection:     'row',
    alignItems:        'center',
  },
  receiptBtnText: { fontSize: 10.5, fontWeight: '800' },
});

export default ContributionItem;
