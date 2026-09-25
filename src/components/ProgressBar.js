/**
 * src/components/ProgressBar.js
 *
 * Budget collection progress bar with percentage label.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING } from '../constants';
import { useTheme } from '../context/ThemeContext';

const ProgressBar = ({ progress = 0, label }) => {
  const { colors } = useTheme();
  const clamped = Math.min(Math.max(progress, 0), 100);
  const barColor =
    clamped >= 100 ? colors.success :
    clamped >= 60  ? colors.primary :
    colors.warning;

  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.header}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
          <Text style={[styles.pct, { color: barColor }]}>{clamped}%</Text>
        </View>
      ) : null}
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: SPACING.sm },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:   SPACING.xs,
  },
  label: { fontSize: 13, fontWeight: '500' },
  pct:   { fontSize: 13, fontWeight: '700' },
  track: {
    height:       10,
    borderRadius: 10,
    overflow:     'hidden',
  },
  fill: {
    height:       10,
    borderRadius: 10,
  },
});

export default ProgressBar;
