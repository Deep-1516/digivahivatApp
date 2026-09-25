/**
 * src/components/ContributionItem.js
 *
 * Single row in the contributions list.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SPACING } from '../constants';
import { useTheme } from '../context/ThemeContext';

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
    ? `📅 Annual Fund ${annualYear ?? ''}`
    : `🎉 ${eventId?.title ?? 'Society Event'}`;

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
              <Text style={[styles.receiptBtnText, { color: colors.primary }]}>PDF</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
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
  row:    { flexDirection: 'row', justifyContent: 'space-between' },
  info:   { flex: 1, marginRight: SPACING.sm },
  eventPill: { fontSize: 11, fontWeight: '700', marginBottom: 3 },
  name:   { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sub:    { fontSize: 12 },
  date:   { fontSize: 11, marginTop: 2 },
  txn:    { fontSize: 11, marginTop: 2 },
  right:  { alignItems: 'flex-end', justifyContent: 'space-between' },
  amount: { fontSize: 17, fontWeight: '800' },
  badge:  { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  receiptBtn: {
    marginTop:         6,
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      6,
  },
  receiptBtnText: { fontSize: 11, fontWeight: '700' },
});

export default ContributionItem;
