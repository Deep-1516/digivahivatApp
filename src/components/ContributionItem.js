/**
 * src/components/ContributionItem.js
 *
 * Single row in the contributions list.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SPACING } from '../constants';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

const ContributionItem = ({ item, onPressReceipt }) => {
  const { colors } = useTheme();
  const { residentId, amount, paymentMode, paymentStatus, date, transactionId, eventId, contributionType, annualYear } = item;

  const STATUS_COLOR = {
    Paid:    colors.success,
    Partial: colors.warning,
    Pending: colors.danger,
  };

  const dateStr = new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const eventName = contributionType === 'Annual'
    ? `Society Maintenance ${annualYear ?? ''}`
    : `${eventId?.title ?? 'Society Event'}`;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={[styles.eventPill, { color: colors.primary }]}>{eventName}</Text>
          <Text style={[styles.name, { color: colors.text }]}>{residentId?.name ?? 'Unknown'}</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            {residentId?.houseOrFlatNo ? `Flat ${residentId.houseOrFlatNo}  ·  ` : ''}
            {residentId?.phone ?? ''}
          </Text>
          <Text style={[styles.date, { color: colors.textMuted }]}>{dateStr}  ·  {paymentMode}</Text>
          {transactionId ? (
            <Text style={[styles.txn, { color: colors.info }]} numberOfLines={1}>TXN: {transactionId}</Text>
          ) : null}
        </View>

        <View style={styles.right}>
          <Text style={[styles.amount, { color: colors.success }]}>₹{amount.toLocaleString('en-IN')}</Text>
          <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[paymentStatus] || colors.info) + '22' }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLOR[paymentStatus] || colors.info }]}>
              {paymentStatus}
            </Text>
          </View>
          {onPressReceipt ? (
            <TouchableOpacity style={[styles.receiptBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => onPressReceipt(item)}>
              <Icon name="file-pdf-box" size={16} color={colors.primary} style={{ marginRight: 3 }} />
              <Text style={[styles.receiptBtnText, { color: colors.primary }]}>PDF Receipt</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
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
  row:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info:   { flex: 1, marginRight: SPACING.sm },
  eventPill: { fontSize: 11, fontWeight: '800', marginBottom: 4, letterSpacing: 0.2 },
  name:   { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  sub:    { fontSize: 12 },
  date:   { fontSize: 11, marginTop: 3 },
  txn:    { fontSize: 10, marginTop: 3, fontWeight: '600' },
  right:  { alignItems: 'flex-end', justifyContent: 'center' },
  amount: { fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  badge:  { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginTop: 5 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  receiptBtn: {
    marginTop:         7,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      10,
    flexDirection:     'row',
    alignItems:        'center',
  },
  receiptBtnText: { fontSize: 11, fontWeight: '700' },
});

export default ContributionItem;
