/**
 * src/components/ProgressBar.js
 *
 * Budget collection progress bar with modern percentage badge pill.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING } from '../constants';
import { useTheme } from '../context/ThemeContext';

const ProgressBar = ({ progress = 0, label, isLight = false }) => {
  const { colors } = useTheme();
  const clamped = Math.min(Math.max(progress, 0), 100);
  const barColor =
    clamped >= 100 ? (isLight ? '#10B981' : colors.success) :
    clamped >= 60  ? (isLight ? '#00AFEF' : colors.primary) :
    (isLight ? '#F59E0B' : colors.warning);

  const trackBg = isLight ? '#E2E8F0' : colors.border;
  const labelColor = isLight ? '#64748B' : colors.textMuted;

  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.header}>
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
          <View style={[styles.pctBadge, { backgroundColor: `${barColor}18` }]}>
            <Text style={[styles.pct, { color: barColor }]}>{clamped}%</Text>
          </View>
        </View>
      ) : null}
      <View style={[styles.track, { backgroundColor: trackBg }]}>
        <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: SPACING.xs + 2 },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   6,
  },
  label: { fontSize: 12.5, fontWeight: '700' },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:      10,
  },
  pct:   { fontSize: 11.5, fontWeight: '800' },
  track: {
    height:       8,
    borderRadius: 8,
    overflow:     'hidden',
  },
  fill: {
    height:       8,
    borderRadius: 8,
  },
});

export default ProgressBar;
