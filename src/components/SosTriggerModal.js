/**
 * src/components/SosTriggerModal.js
 *
 * Emergency SOS Trigger Modal:
 *  • Category selector (Medical, Fire, Lift Stuck, Threat, General)
 *  • 3-Second safety countdown buffer to prevent accidental panic presses
 *  • Immediate cancel option
 *  • 1-Tap emergency helpline dialers (112, 108, 101, 100)
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, Linking, Alert, Animated, Vibration, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';
import { SOS_TYPES, EMERGENCY_CONTACTS, SPACING } from '../constants';

const SosTriggerModal = ({ visible, onClose, onTriggerSuccess, userFlat }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [selectedType, setSelectedType] = useState('Medical');
  const [notes, setSelectedNotes] = useState('');
  const [countingDown, setCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const countdownRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation while modal is visible
  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      handleCancelCountdown();
    }
  }, [visible, pulseAnim]);

  // Countdown timer effect
  useEffect(() => {
    if (countingDown) {
      if (countdown > 0) {
        countdownRef.current = setTimeout(() => {
          setCountdown((c) => c - 1);
        }, 1000);
      } else {
        // Countdown reached 0: fire the alert!
        sendAlert();
      }
    }
    return () => clearTimeout(countdownRef.current);
  }, [countingDown, countdown]);

  const handleStartCountdown = () => {
    try {
      Vibration.vibrate(200);
    } catch (_) {}
    setCountdown(3);
    setCountingDown(true);
  };

  const handleCancelCountdown = () => {
    if (countdownRef.current) clearTimeout(countdownRef.current);
    setCountingDown(false);
    setCountdown(3);
  };

  const sendAlert = async () => {
    handleCancelCountdown();
    setSubmitting(true);
    try {
      await onTriggerSuccess({
        type: selectedType,
        description: notes,
      });
      onClose();
    } catch (err) {
      Alert.alert('SOS Trigger Failed', err.message || 'Could not send emergency alert.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCall = (number) => {
    const url = `tel:${number}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', `Cannot dial ${number} on this device.`);
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={countingDown ? handleCancelCountdown : onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.headerDot} />
              <Text style={[styles.title, { color: colors.text }]}>Emergency SOS Alert</Text>
            </View>
            <TouchableOpacity onPress={countingDown ? handleCancelCountdown : onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {countingDown ? (
            /* ─── Active 3-Second Countdown View ─── */
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownWarning}>BROADCASTING EMERGENCY IN</Text>
              <Animated.View style={[styles.countdownCircle, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.countdownNumber}>{countdown}</Text>
              </Animated.View>
              <Text style={[styles.countdownFlatText, { color: colors.text }]}>
                Alerting Security & Society Admins for Flat {userFlat || '—'}
              </Text>
              <Text style={[styles.countdownCategoryText, { color: colors.primary }]}>
                Type: {SOS_TYPES.find((t) => t.id === selectedType)?.label || selectedType}
              </Text>

              <TouchableOpacity
                style={styles.cancelCountdownBtn}
                onPress={handleCancelCountdown}
                activeOpacity={0.8}>
                <Icon name="close-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.cancelCountdownBtnText}>CANCEL (FALSE ALARM)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sendNowBtn}
                onPress={sendAlert}
                activeOpacity={0.8}>
                <Text style={styles.sendNowBtnText}>Don't wait, send SOS immediately</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ─── Category Selection & Panic Button View ─── */
            <View style={styles.content}>
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                Select crisis type to alert Main Gate Security Guard & Admins:
              </Text>

              {/* Crisis Type Grid */}
              <View style={styles.typesGrid}>
                {SOS_TYPES.map((t) => {
                  const isSelected = selectedType === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.typeCard,
                        { borderColor: colors.border, backgroundColor: colors.background },
                        isSelected && { borderColor: t.color, backgroundColor: t.color + '15' },
                      ]}
                      onPress={() => setSelectedType(t.id)}
                      activeOpacity={0.8}>
                      <View style={[styles.typeIconBox, { backgroundColor: t.color + '22' }]}>
                        <Icon name={t.icon} size={22} color={t.color} />
                      </View>
                      <Text style={[styles.typeLabel, { color: colors.text }, isSelected && { color: t.color, fontWeight: '800' }]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Optional Message */}
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Brief notes (e.g., Elder collapsed, need stretcher)..."
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setSelectedNotes}
                maxLength={100}
              />

              {/* Big Red SOS Button */}
              <View style={styles.buttonWrapper}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity
                    style={styles.sosButton}
                    onPress={handleStartCountdown}
                    activeOpacity={0.85}
                    disabled={submitting}>
                    <Icon name="alarm-light" size={32} color="#FFFFFF" style={{ marginBottom: 4 }} />
                    <Text style={styles.sosButtonText}>ACTIVATE SOS</Text>
                    <Text style={styles.sosButtonSub}>3-sec safety countdown</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Indian Emergency Helplines Quick Call Row */}
              <Text style={[styles.hotlinesLabel, { color: colors.textMuted }]}>Instant National Helplines:</Text>
              <View style={styles.hotlinesRow}>
                {EMERGENCY_CONTACTS.map((c) => (
                  <TouchableOpacity
                    key={c.number}
                    style={[styles.hotlineChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => handleCall(c.number)}>
                    <Icon name={c.icon} size={14} color={c.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.hotlineChipText, { color: colors.text }]}>{c.number}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: SPACING.md,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
    marginRight: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  content: {
    padding: SPACING.md,
  },
  sub: {
    fontSize: 12.5,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  typeCard: {
    flexBasis: '31%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  typeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    marginBottom: SPACING.md,
  },
  buttonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.xs,
  },
  sosButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    borderWidth: 4,
    borderColor: '#FCA5A5',
  },
  sosButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  sosButtonSub: {
    fontSize: 10,
    color: '#FEE2E2',
    fontWeight: '600',
    marginTop: 2,
  },
  hotlinesLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: SPACING.md,
    marginBottom: 6,
  },
  hotlinesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  hotlineChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  hotlineChipText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Countdown screen styles
  countdownContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownWarning: {
    fontSize: 13,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 1.2,
    marginBottom: SPACING.md,
  },
  countdownCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    elevation: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    borderWidth: 4,
    borderColor: '#FCA5A5',
  },
  countdownNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  countdownFlatText: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  countdownCategoryText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: SPACING.xl,
  },
  cancelCountdownBtn: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    marginBottom: SPACING.sm,
  },
  cancelCountdownBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sendNowBtn: {
    padding: 8,
  },
  sendNowBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default SosTriggerModal;
