/**
 * src/components/ActiveSosBanner.js
 *
 * Prominent flashing emergency banner displayed when an active
 * SOS alert is triggered in the society.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Icon from './Icon';

const ActiveSosBanner = ({ alerts = [], onPress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (alerts.length > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.45,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [alerts.length, pulseAnim]);

  if (!alerts || alerts.length === 0) return null;

  const firstAlert = alerts[0];
  const isMultiple = alerts.length > 1;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.container}>
      <Animated.View style={[styles.iconBadge, { opacity: pulseAnim }]}>
        <Icon name="alarm-light" size={20} color="#FFFFFF" />
      </Animated.View>

      <View style={styles.textCol}>
        <View style={styles.topRow}>
          <Text style={styles.urgencyTag}>
            {firstAlert.status === 'Responding' ? 'HELP ON THE WAY' : 'CRITICAL EMERGENCY'}
          </Text>
          {isMultiple && (
            <View style={styles.multiBadge}>
              <Text style={styles.multiText}>+{alerts.length - 1} more</Text>
            </View>
          )}
        </View>
        <Text style={styles.headline} numberOfLines={1}>
          Flat {firstAlert.flatNo || '—'} · {firstAlert.type} Crisis
        </Text>
        <Text style={styles.subline} numberOfLines={1}>
          {firstAlert.residentId?.name || 'Resident'} needs immediate assistance
        </Text>
      </View>

      <View style={styles.actionBtn}>
        <Text style={styles.actionBtnText}>View</Text>
        <Icon name="chevron-right" size={14} color="#DC2626" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 14,
    elevation: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textCol: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  urgencyTag: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FEE2E2',
    letterSpacing: 0.6,
  },
  multiBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  multiText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headline: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  subline: {
    fontSize: 11,
    color: '#FEE2E2',
    marginTop: 1,
    fontWeight: '500',
  },
  actionBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#DC2626',
    marginRight: 2,
  },
});

export default ActiveSosBanner;
