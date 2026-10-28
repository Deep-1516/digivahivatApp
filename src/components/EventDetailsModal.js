/**
 * falomobileapp/src/components/EventDetailsModal.js
 *
 * Modal that opens when an event is clicked in the mobile app.
 * Displays:
 *  - Event details & target budget progress
 *  - Prominent "Persons Paid Fund" count badge (how many persons paid for that event)
 *  - Financial breakdown (Total Collection, Total Expenses, Net Balance)
 *  - List of residents who paid fund for the event
 */
import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, FlatList, TextInput,
} from 'react-native';
import { eventsAPI, contributionsAPI } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import ProgressBar from './ProgressBar';
import { SPACING } from '../constants';
import Icon from './Icon';

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function EventDetailsModal({ visible, onClose, event }) {
  const { colors } = useTheme();
  const [dashboard, setDashboard]         = useState(null);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');

  useEffect(() => {
    if (!visible || !event?._id) return;
    let isMounted = true;
    setLoading(true);

    Promise.all([
      eventsAPI.dashboard(event._id),
      contributionsAPI.getAll({ eventId: event._id }),
    ])
      .then(([dashRes, contRes]) => {
        if (!isMounted) return;
        setDashboard(dashRes.data.data);
        setContributions(contRes.data.data || []);
      })
      .catch((err) => {
        console.error('Failed to fetch event details:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [visible, event]);

  if (!event) return null;

  const paidCount = dashboard?.paidPersonsCount ?? dashboard?.contributorsCount ?? 0;

  const filteredContributions = contributions.filter((c) => {
    const q = searchQuery.toLowerCase();
    const name = c.residentId?.name?.toLowerCase() || '';
    const flat = String(c.residentId?.houseOrFlatNo || '').toLowerCase();
    return name.includes(q) || flat.includes(q);
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                {event.startDate ? `${fmtDate(event.startDate)}` : ''}{event.endDate ? ` - ${fmtDate(event.endDate)}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderCenter}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              {/* Persons Paid Banner */}
              <View style={[styles.bannerCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                <Text style={[styles.bannerLabel, { color: colors.primary }]}>PERSONS PAID FUND FOR THIS EVENT</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                  <Icon name="account-group" size={24} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.bannerCount, { color: colors.primary }]}>
                    {paidCount} {paidCount === 1 ? 'Person' : 'Persons'} Paid
                  </Text>
                </View>
                <Text style={[styles.bannerSub, { color: colors.textMuted }]}>
                  Total Collected: {fmt(dashboard?.totalCollection)}
                </Text>
              </View>

              {/* Progress */}
              {event.targetBudget > 0 && dashboard && (
                <View style={styles.sectionMargin}>
                  <ProgressBar progress={dashboard.budgetProgress ?? 0} label={`Target Budget: ${fmt(event.targetBudget)}`} />
                </View>
              )}

              {/* Stats Grid */}
              {dashboard && (
                <View style={styles.statsGrid}>
                  <View style={[styles.statBox, { backgroundColor: colors.background }]}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Collected</Text>
                    <Text style={[styles.statVal, { color: colors.success }]}>{fmt(dashboard.totalCollection)}</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: colors.background }]}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Spent</Text>
                    <Text style={[styles.statVal, { color: colors.danger }]}>{fmt(dashboard.totalExpenses)}</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: colors.background }]}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Net Balance</Text>
                    <Text style={[styles.statVal, { color: dashboard.netBalance >= 0 ? colors.success : colors.danger }]}>
                      {fmt(dashboard.netBalance)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Excluded Residents */}
              {event.excludedResidents && event.excludedResidents.length > 0 && (
                <View style={[styles.sectionMargin, { backgroundColor: '#EF444415', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EF444444' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Icon name="account-cancel-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>
                      EXCLUDED RESIDENTS ({event.excludedResidents.length})
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {event.excludedResidents.map((r) => (
                      <View key={r._id || r} style={{ backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#EF444444' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>
                          {r.name ? `${r.name} (Flat ${r.houseOrFlatNo || '—'})` : 'Resident'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Paid Persons List */}
              <View style={styles.sectionMargin}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Icon name="credit-card-check-outline" size={18} color={colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                    Paid Fund Members ({contributions.length})
                  </Text>
                </View>

                <TextInput
                  style={[styles.searchInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="Search by name or flat no..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />

                {filteredContributions.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: 13 }}>
                      {searchQuery ? 'No matching paid records found.' : 'No residents have paid fund for this event yet.'}
                    </Text>
                  </View>
                ) : (
                  filteredContributions.map((c) => (
                    <View key={c._id} style={[styles.itemCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { color: colors.text }]}>{c.residentId?.name || 'Resident'}</Text>
                        <Text style={[styles.itemSub, { color: colors.textMuted }]}>
                          Flat {c.residentId?.houseOrFlatNo || '—'}  ·  {fmtDate(c.date || c.createdAt)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.itemAmt, { color: colors.success }]}>{fmt(c.amount)}</Text>
                        <View style={[styles.modeBadge, { backgroundColor: c.paymentMode === 'UPI' ? '#A855F722' : '#F59E0B22' }]}>
                          <Text style={[styles.modeText, { color: c.paymentMode === 'UPI' ? '#A855F7' : '#D97706' }]}>
                            {c.paymentMode}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: SPACING.md },
  card:         { borderRadius: 24, padding: SPACING.md, maxHeight: '88%' },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1 },
  title:        { fontSize: 18, fontWeight: '800' },
  sub:          { fontSize: 12, marginTop: 2 },
  closeBtn:     { padding: 4 },
  loaderCenter: { paddingVertical: 40, alignItems: 'center' },

  scrollContent:{ paddingVertical: 12 },
  bannerCard:   { borderRadius: 16, padding: SPACING.md, borderWidth: 1.5, alignItems: 'center', marginBottom: SPACING.md },
  bannerLabel:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  bannerCount:  { fontSize: 20, fontWeight: '900', marginVertical: 4 },
  bannerSub:    { fontSize: 12, fontWeight: '600' },

  sectionMargin:{ marginBottom: SPACING.md },
  statsGrid:    { flexDirection: 'row', gap: 6, marginBottom: SPACING.md },
  statBox:      { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center' },
  statLabel:    { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statVal:      { fontSize: 13.5, fontWeight: '800', marginTop: 3 },

  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  searchInput:  { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 13.5, marginBottom: 8 },
  emptyBox:     { padding: 16, alignItems: 'center' },

  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  itemName: { fontSize: 14, fontWeight: '700' },
  itemSub:  { fontSize: 11, marginTop: 2 },
  itemAmt:  { fontSize: 14, fontWeight: '800' },
  modeBadge:{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  modeText: { fontSize: 9, fontWeight: '800' },
});
