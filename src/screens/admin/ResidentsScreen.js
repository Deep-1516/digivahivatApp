/**
 * src/screens/admin/ResidentsScreen.js
 *
 * Directory of all registered society residents.
 * Allows filtering by search term and navigating to Add Resident.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { residentsAPI }  from '../../services/api';
import { useAlert }      from '../../context/AlertContext';
import { useTheme }      from '../../context/ThemeContext';
import Input              from '../../components/Input';
import { COLORS, SPACING }  from '../../constants';

const ResidentsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { showError } = useAlert();
  const { colors }    = useTheme();
  const [residents,  setResidents]  = useState([]);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await residentsAPI.getAll();
      setResidents(res.data.data.residents || []);
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filtered = residents.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.phone?.includes(q) ||
      r.houseOrFlatNo?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}>
      <View style={[styles.headerRow, { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Society Residents</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>{residents.length} total residents</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('AddResident')}>
          <Text style={styles.addBtnText}>+ Add Resident</Text>
        </TouchableOpacity>
      </View>

      <Input
        placeholder="🔍 Search name, phone, or flat..."
        value={search}
        onChangeText={setSearch}
        containerStyle={{ marginHorizontal: SPACING.md, marginVertical: SPACING.xs }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardRow}>
              <View style={[styles.avatar, { backgroundColor: colors.border }]}>
                <Text style={[styles.avatarText, { color: colors.text }]}>{item.name?.[0]?.toUpperCase() ?? 'R'}</Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.details, { color: colors.textMuted }]}>
                  📱 {item.phone}  ·  👨‍👩‍👧‍👦 {item.totalMembers || 1} members
                </Text>
                {item.houseOrFlatNo ? (
                  <Text style={[styles.flat, { color: colors.textMuted }]}>Flat / House: {item.houseOrFlatNo}</Text>
                ) : null}
              </View>
              <View style={[styles.roleBadge, item.role === 'Admin' ? { backgroundColor: colors.primary + '22' } : { backgroundColor: colors.info + '22' }]}>
                <Text style={[styles.roleText, { color: item.role === 'Admin' ? colors.primary : colors.info }]}>
                  {item.role}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No residents found.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    padding:         SPACING.md,
    backgroundColor: COLORS.surface,
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  sub:   { fontSize: 12, color: COLORS.textMuted },
  addBtn: {
    backgroundColor:   COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderRadius:      8,
  },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },

  list: { padding: SPACING.md, paddingBottom: SPACING.xl },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius:    12,
    padding:         SPACING.md,
    marginBottom:    SPACING.sm,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  avatar:  {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary + '18',
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  info:       { flex: 1 },
  name:       { fontSize: 15, fontWeight: '700', color: COLORS.text },
  details:    { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  flat:       { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 2 },

  roleBadge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 6 },
  adminBadge:    { backgroundColor: COLORS.primary + '20' },
  residentBadge: { backgroundColor: COLORS.info + '18' },
  roleText:      { fontSize: 11, fontWeight: '700' },
  adminRoleText: { color: COLORS.primary },
  residentRoleText: { color: COLORS.info },

  empty:     { alignItems: 'center', marginTop: 60 },
  emptyText: { color: COLORS.textMuted, fontStyle: 'italic' },
});

export default ResidentsScreen;
