/**
 * src/screens/admin/ResidentsScreen.js
 *
 * Directory of all registered society residents.
 * Allows filtering by search term and navigating to Add Resident.
 *
 * Modern, elevated visual redesign adhering strictly to:
 * - Background: #FFFFFF
 * - Primary: #00AFEF
 * - Secondary: #3E4095
 * - Dark / Text: #1E1E1E
 * - Zero extra features / zero functionality changes.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, StatusBar, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { residentsAPI }  from '../../services/api';
import { useAlert }      from '../../context/AlertContext';
import { useAuth }       from '../../context/AuthContext';
import { useTheme }      from '../../context/ThemeContext';
import Icon               from '../../components/Icon';
import { SPACING }        from '../../constants';

const ResidentsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
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
  }, [showError]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filtered = residents.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
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

  if (!isAdmin) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 24 }]}>
        <View style={styles.lockIconCircle}>
          <Icon name="shield-lock-outline" size={42} color={colors.primary} />
        </View>
        <Text style={[styles.lockTitle, { color: colors.text }]}>Admin Access Required</Text>
        <Text style={[styles.lockSub, { color: colors.textMuted }]}>
          Only society administrators have permission to view the resident directory.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─── Modern Elevated Header ─── */}
      <View style={[styles.headerRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.title, { color: colors.text }]}>Society Residents</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            {residents.length} total residents
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('AddResident')}
          activeOpacity={0.85}>
          <Icon name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Resident</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Search Bar ─── */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="magnify" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search name, phone, or flat..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Residents List ─── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isAdminUser = item.role === 'Admin';
          const isGuardUser = item.role === 'Guard' || item.role === 'Gaurd';
          const initial = item.name?.[0]?.toUpperCase() ?? 'R';
          const accentColor = isGuardUser ? '#10B981' : isAdminUser ? colors.secondary : colors.primary;

          return (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Left Accent Strip */}
              <View style={[styles.cardAccentStrip, { backgroundColor: accentColor }]} />

              <View style={styles.cardContent}>
                {/* Top Row: Avatar + Name + Role Badge */}
                <View style={styles.cardHeaderRow}>
                  {/* Squircle Avatar */}
                  <View
                    style={[
                      styles.avatarSquircle,
                      {
                        backgroundColor: accentColor + '14',
                        borderColor: accentColor + '28',
                      },
                    ]}>
                    <Text style={[styles.avatarText, { color: accentColor }]}>
                      {initial}
                    </Text>
                  </View>

                  {/* Name and Flat */}
                  <View style={styles.infoCol}>
                    <View style={styles.nameAndBadgeRow}>
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>

                      {/* Role Badge */}
                      <View
                        style={[
                          styles.roleBadge,
                          {
                            backgroundColor: accentColor + '18',
                          },
                        ]}>
                        {isAdminUser && (
                          <Icon name="shield-crown" size={12} color={accentColor} style={{ marginRight: 3 }} />
                        )}
                        {isGuardUser && (
                          <Icon name="shield-account" size={12} color={accentColor} style={{ marginRight: 3 }} />
                        )}
                        <Text style={[styles.roleText, { color: accentColor }]}>
                          {item.role || 'Resident'}
                        </Text>
                      </View>
                    </View>

                    {item.houseOrFlatNo ? (
                      <View style={styles.flatRow}>
                        <View style={[styles.flatPill, { backgroundColor: colors.secondary + '10' }]}>
                          <Icon name="home-outline" size={12} color={colors.secondary} style={{ marginRight: 4 }} />
                          <Text style={[styles.flatText, { color: colors.secondary }]}>
                            Flat / House: {item.houseOrFlatNo}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Subtle Divider */}
                <View style={[styles.cardDivider, { backgroundColor: colors.border + '80' }]} />

                {/* Bottom Row: Phone and Members Count */}
                <View style={styles.cardMetaRow}>
                  <View style={styles.metaItem}>
                    <Icon name="phone-outline" size={13} color={colors.textMuted} style={styles.metaIcon} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {item.phone}
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Icon name="account-group" size={14} color={colors.textMuted} style={styles.metaIcon} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {item.totalMembers || 1} members
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.border + '40' }]}>
              <Icon name="account-search-outline" size={38} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No residents found.</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {search.trim() ? `No results matching "${search}".` : 'No registered residents.'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen:  { flex: 1 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  lockIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#00AFEF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  lockTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  lockSub:   { fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 30, lineHeight: 18 },

  headerRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitleCol: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  title: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#00AFEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },

  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: 8,
    paddingBottom: SPACING.xl,
  },
  card: {
    position: 'relative',
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1.2,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#3E4095',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  cardAccentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    padding: 14,
    paddingLeft: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSquircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 19,
    fontWeight: '900',
  },
  infoCol: {
    flex: 1,
  },
  nameAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  flatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  flatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  flatText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  cardDivider: {
    height: 1,
    marginVertical: 10,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: 12.5,
    fontWeight: '600',
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12.5,
    textAlign: 'center',
  },
});

export default ResidentsScreen;
