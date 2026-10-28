/**
 * src/screens/shared/SosEmergencyScreen.js
 *
 * Emergency SOS Monitor:
 *  • Real-time active alerts tracking for the society
 *  • Incident responder management (Help dispatched / Resolve / Cancel)
 *  • 1-Tap resident call and national emergency dialers
 *  • Past emergency incident history log
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking, Alert, Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth }  from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import { sosAPI }   from '../../services/api';
import { onSosAlertReceived, notifySosListeners } from '../../services/notification.service';
import Icon         from '../../components/Icon';
import SosTriggerModal from '../../components/SosTriggerModal';
import { SOS_TYPES, EMERGENCY_CONTACTS, SPACING } from '../../constants';

const SosEmergencyScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, isAdmin } = useAuth();
  const { showError, showSuccess } = useAlert();
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState('Active'); // 'Active' | 'History'
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [historyAlerts, setHistoryAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Trigger SOS modal
  const [showTriggerModal, setShowTriggerModal] = useState(false);

  // Resolve modal state
  const [resolvingAlert, setResolvingAlert] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [actRes, histRes] = await Promise.all([
        sosAPI.getActive(),
        sosAPI.getHistory(),
      ]);
      setActiveAlerts(actRes.data?.data || []);
      setHistoryAlerts(histRes.data?.data || []);
    } catch (err) {
      if (!err?.isSilent && !err?.isAuthError) {
        showError('Error', err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchData();
    // Poll every 5 seconds for active emergencies while on this screen
    const interval = setInterval(fetchData, 5000);
    // Instant update when push notification arrives
    const unsubscribeSos = onSosAlertReceived(() => {
      fetchData();
    });
    return () => {
      clearInterval(interval);
      unsubscribeSos();
    };
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCall = (phone) => {
    if (!phone) return;
    const url = `tel:${phone}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to make call.'));
  };

  const [testingPush, setTestingPush] = useState(false);
  const handleTestPush = async () => {
    setTestingPush(true);
    try {
      const res = await sosAPI.testNotification();
      showSuccess('Push Sent', res.data?.message || 'Check your phone notifications.');
    } catch (err) {
      showError('Test Failed', err.response?.data?.message || err.message);
    } finally {
      setTestingPush(false);
    }
  };

  const handleAcknowledge = async (alertItem) => {
    try {
      await sosAPI.acknowledge(alertItem._id);
      notifySosListeners({ alertId: alertItem._id, action: 'acknowledge' });
      showSuccess('Help Dispatched', 'Marked as responding. Resident informed.');
      fetchData();
    } catch (err) {
      showError('Error', err.message);
    }
  };

  const handleOpenResolve = (alertItem) => {
    setResolvingAlert(alertItem);
    setResolveNotes('');
  };

  const handleConfirmResolve = async () => {
    if (!resolvingAlert) return;
    setResolving(true);
    try {
      await sosAPI.resolve(resolvingAlert._id, { notes: resolveNotes });
      notifySosListeners({ alertId: resolvingAlert._id, action: 'resolve' });
      setResolvingAlert(null);
      showSuccess('Incident Resolved', 'Emergency marked as resolved and safely closed.');
      fetchData();
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setResolving(false);
    }
  };

  const handleCancelAlert = (alertItem) => {
    Alert.alert(
      'Cancel Alert',
      'Are you sure you want to cancel this emergency alert? (e.g. False alarm or crisis resolved)',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await sosAPI.cancel(alertItem._id, { reason: 'Cancelled by resident / safe now' });
              notifySosListeners({ alertId: alertItem._id, action: 'cancel' });
              showSuccess('Alert Cancelled', 'The emergency alert has been deactivated.');
              fetchData();
            } catch (err) {
              showError('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleTriggerSuccess = async (data) => {
    try {
      await sosAPI.trigger(data);
      notifySosListeners(data);
      showSuccess('SOS Sent', 'Security and society admins have been alerted immediately.');
      fetchData();
    } catch (err) {
      showError('SOS Failed', err.message);
    }
  };

  const renderActiveCard = ({ item }) => {
    const isOwner = item.residentId?._id === user?._id || item.residentId === user?._id;
    const timeAgo = formatTimeAgo(new Date(item.createdAt));
    const config = SOS_TYPES.find((t) => t.id === item.type) || SOS_TYPES[4];

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: '#DC2626' }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <View style={styles.flatPill}>
                <Text style={styles.flatPillText}>Flat {item.flatNo || '—'}</Text>
              </View>
              <View style={[styles.typePill, { backgroundColor: config.color + '22' }]}>
                <Icon name={config.icon} size={13} color={config.color} style={{ marginRight: 3 }} />
                <Text style={[styles.typePillText, { color: config.color }]}>{config.label}</Text>
              </View>
              <View style={[styles.statusPill, item.status === 'Responding' ? styles.statusPillResponding : styles.statusPillActive]}>
                <Text style={styles.statusPillText}>
                  {item.status === 'Responding' ? 'HELP RESPONDING' : 'ACTIVE SOS'}
                </Text>
              </View>
            </View>

            <Text style={[styles.residentName, { color: colors.text }]}>
              {item.residentId?.name || 'Resident'}
            </Text>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              Triggered {timeAgo}
            </Text>
          </View>

          {/* Quick Call Resident */}
          {item.residentId?.phone ? (
            <TouchableOpacity
              style={styles.callResidentBtn}
              onPress={() => handleCall(item.residentId.phone)}
              activeOpacity={0.8}>
              <Icon name="phone" size={16} color="#FFFFFF" />
              <Text style={styles.callResidentBtnText}>Call</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Description/Notes if any */}
        {item.description ? (
          <View style={[styles.notesBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.notesText, { color: colors.text }]}>"{item.description}"</Text>
          </View>
        ) : null}

        {/* Responder note if responding */}
        {item.status === 'Responding' && item.acknowledgedBy ? (
          <View style={styles.respondingStrip}>
            <Icon name="shield-check" size={14} color="#059669" style={{ marginRight: 5 }} />
            <Text style={styles.respondingText}>
              Security/Admin {item.acknowledgedBy.name} acknowledged & dispatching help
            </Text>
          </View>
        ) : null}

        {/* Action Row */}
        <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
          {item.status !== 'Responding' && (isAdmin || user?.role === 'Admin') && (
            <TouchableOpacity
              style={[styles.btnAction, { backgroundColor: '#0284C7' }]}
              onPress={() => handleAcknowledge(item)}>
              <Icon name="run-fast" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.btnActionText}>Dispatch Help</Text>
            </TouchableOpacity>
          )}

          {(isAdmin || user?.role === 'Admin') && (
            <TouchableOpacity
              style={[styles.btnAction, { backgroundColor: '#10B981' }]}
              onPress={() => handleOpenResolve(item)}>
              <Icon name="check-circle" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.btnActionText}>Mark Resolved</Text>
            </TouchableOpacity>
          )}

          {isOwner && (
            <TouchableOpacity
              style={[styles.btnAction, { backgroundColor: '#475569' }]}
              onPress={() => handleCancelAlert(item)}>
              <Icon name="close-circle-outline" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.btnActionText}>I'm Safe / Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderHistoryCard = ({ item }) => {
    const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const config = SOS_TYPES.find((t) => t.id === item.type) || SOS_TYPES[4];

    return (
      <View style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.historyHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.historyFlat, { color: colors.text }]}>Flat {item.flatNo}</Text>
              <Text style={[styles.historyType, { color: config.color }]}>· {config.label}</Text>
              <View style={[styles.historyStatusBadge, { backgroundColor: item.status === 'Resolved' ? '#10B98120' : '#64748B20' }]}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: item.status === 'Resolved' ? '#10B981' : '#64748B' }}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={[styles.historyResident, { color: colors.textMuted }]}>
              {item.residentId?.name || 'Resident'}  ·  {dateStr}
            </Text>
          </View>
        </View>

        {item.resolutionNotes ? (
          <Text style={[styles.historyNotes, { color: colors.textMuted }]}>
            Notes: {item.resolutionNotes}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12) }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {navigation?.canGoBack?.() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8, padding: 4 }}>
              <Icon name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>
          )}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.redDot} />
              <Text style={[styles.title, { color: colors.text }]}>Emergency SOS</Text>
            </View>
            <Text style={[styles.sub, { color: colors.textMuted }]}>Society real-time crisis monitor</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={[styles.testPushBtn, { borderColor: colors.border }]}
            onPress={handleTestPush}
            disabled={testingPush}
            activeOpacity={0.8}>
            <Icon name="bell-ring-outline" size={16} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.raiseSosBtn}
            onPress={() => setShowTriggerModal(true)}
            activeOpacity={0.85}>
            <Icon name="alarm-light" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.raiseSosBtnText}>Raise SOS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Segmented Tab Bar ── */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'Active' && { borderBottomColor: '#DC2626', borderBottomWidth: 2.5 }]}
          onPress={() => setActiveTab('Active')}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.tabBtnText, { color: colors.textMuted }, activeTab === 'Active' && { color: '#DC2626', fontWeight: '800' }]}>
              Active Emergencies
            </Text>
            {activeAlerts.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{activeAlerts.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'History' && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
          onPress={() => setActiveTab('History')}>
          <Text style={[styles.tabBtnText, { color: colors.textMuted }, activeTab === 'History' && { color: colors.primary, fontWeight: '800' }]}>
            Incident History
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      ) : activeTab === 'Active' ? (
        <FlatList
          data={activeAlerts}
          keyExtractor={(it) => it._id}
          renderItem={renderActiveCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: '#10B98118' }]}>
                <Icon name="shield-check" size={44} color="#10B981" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Emergencies</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                All flats are safe. In case of crisis, tap "Raise SOS" to broadcast immediate alert.
              </Text>
            </View>
          }
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={historyAlerts}
          keyExtractor={(it) => it._id}
          renderItem={renderHistoryCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>No past incidents logged.</Text>
            </View>
          }
          contentContainerStyle={styles.list}
        />
      )}

      {/* ── National Emergency Helpline Strip ── */}
      <View style={[styles.helplineBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <Text style={[styles.helplineTitle, { color: colors.textMuted }]}>Direct Helplines:</Text>
        <View style={styles.helplineRow}>
          {EMERGENCY_CONTACTS.map((c) => (
            <TouchableOpacity key={c.number} style={styles.helplineBtn} onPress={() => handleCall(c.number)}>
              <Text style={[styles.helplineNumber, { color: c.color }]}>{c.number}</Text>
              <Text style={[styles.helplineName, { color: colors.textMuted }]}>{c.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Raise SOS Modal ── */}
      <SosTriggerModal
        visible={showTriggerModal}
        onClose={() => setShowTriggerModal(false)}
        onTriggerSuccess={handleTriggerSuccess}
        userFlat={user?.houseOrFlatNo}
      />

      {/* ── Resolve Incident Modal ── */}
      <Modal
        visible={!!resolvingAlert}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setResolvingAlert(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Resolve Incident</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              Closing Flat {resolvingAlert?.flatNo}'s emergency alert:
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Resolution remarks (e.g., Doctor arrived, resident safe)..."
              placeholderTextColor={colors.textMuted}
              value={resolveNotes}
              onChangeText={setResolveNotes}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalBtnOutline, { borderColor: colors.border }]}
                onPress={() => setResolvingAlert(null)}>
                <Text style={{ fontWeight: '700', color: colors.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnPrimary, { backgroundColor: '#10B981' }]}
                onPress={handleConfirmResolve}
                disabled={resolving}>
                <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>Mark Resolved</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

function formatTimeAgo(date) {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  redDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#DC2626',
    marginRight: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  sub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  raiseSosBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    elevation: 3,
  },
  raiseSosBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  list: { padding: SPACING.md, paddingBottom: 80 },

  card: {
    borderRadius: 16,
    borderWidth: 2,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    elevation: 4,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  flatPill: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  flatPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillActive: {
    backgroundColor: '#FEE2E2',
  },
  statusPillResponding: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#991B1B',
  },
  residentName: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  timeText: {
    fontSize: 11,
    marginTop: 2,
  },
  callResidentBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  callResidentBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  notesBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  respondingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  respondingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyFlat: {
    fontSize: 14,
    fontWeight: '800',
  },
  historyType: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  historyResident: {
    fontSize: 11.5,
    marginTop: 2,
  },
  historyNotes: {
    fontSize: 11.5,
    fontStyle: 'italic',
    marginTop: 6,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  helplineBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  helplineTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 8,
  },
  helplineRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  helplineBtn: {
    alignItems: 'center',
  },
  helplineNumber: {
    fontSize: 14,
    fontWeight: '900',
  },
  helplineName: {
    fontSize: 9.5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    borderRadius: 18,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  modalSub: {
    fontSize: 12,
    marginBottom: SPACING.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    minHeight: 60,
    marginBottom: SPACING.md,
  },
  modalBtnOutline: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  testPushBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SosEmergencyScreen;
