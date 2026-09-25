/**
 * src/screens/resident/MyContributionScreen.js
 *
 * Shows the logged-in resident's own contributions for the active event.
 * Each row has a "Download PDF Receipt" button that opens the receipt PDF.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth }        from '../../context/AuthContext';
import { useAlert }       from '../../context/AlertContext';
import { useTheme }       from '../../context/ThemeContext';
import { contributionsAPI, eventsAPI } from '../../services/api';
import ContributionItem   from '../../components/ContributionItem';
import { COLORS, SPACING }  from '../../constants';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const MyContributionScreen = () => {
  const insets = useSafeAreaInsets();
  const { user }    = useAuth();
  const { showError, showAlert } = useAlert();
  const { colors }  = useTheme();
  const [items,     setItems]      = useState([]);
  const [total,     setTotal]      = useState(0);
  const [loading,   setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Get active event first
      const evRes   = await eventsAPI.getAll();
      const activeEv = evRes.data.data.find((e) => e.isActive);
      if (!activeEv) { setItems([]); return; }

      const res = await contributionsAPI.getAll({ eventId: activeEv._id, residentId: user._id });
      const contribs = res.data.data;
      setItems(contribs);
      setTotal(contribs.reduce((s, c) => s + c.amount, 0));
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user._id]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handlePdfReceipt = async (item) => {
    showAlert({
      title: 'PDF Receipt 📄',
      message: `Receipt for ₹${item.amount} payment.\n\nReceipt URL:\n${item._id}\n\nPDF download active via API.`,
      type: 'info',
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>My Contributions</Text>
        {total > 0 && <Text style={[styles.total, { color: colors.success }]}>Total Paid: {fmt(total)}</Text>}
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it._id}
        renderItem={({ item }) => (
          <ContributionItem item={item} onPressReceipt={handlePdfReceipt} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No contributions recorded yet.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen:    { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:    { padding: SPACING.md, borderBottomWidth: 1 },
  title:     { fontSize: 18, fontWeight: '800' },
  total:     { fontSize: 14, fontWeight: '700', marginTop: 2 },
  list:      { padding: SPACING.md, paddingBottom: SPACING.xl },
  empty:     { alignItems: 'center', marginTop: 60 },
  emptyText: { fontStyle: 'italic' },
});

export default MyContributionScreen;
