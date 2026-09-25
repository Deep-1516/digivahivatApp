/**
 * src/components/StatCard.js
 *
 * Displays a single key metric in a card.
 * Supports auto Light & Dark theme modes.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants';

const StatCard = ({ label, value, color, style }) => {
  const { colors } = useTheme();
  const activeColor = color || colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <View style={[styles.colorPill, { backgroundColor: activeColor }]} />
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: activeColor }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex:             1,
    borderRadius:     16,
    padding:          SPACING.md,
    margin:           SPACING.xs,
    borderWidth:      1,
    alignItems:       'center',
    justifyContent:   'center',
    minHeight:        84,
    elevation:        3,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.04,
    shadowRadius:     10,
    overflow:         'hidden',
  },
  colorPill: {
    position:         'absolute',
    top:              0,
    left:             0,
    right:            0,
    height:           4,
  },
  label: {
    fontSize:   11,
    marginBottom: 4,
    textAlign:  'center',
    fontWeight: '600',
  },
  value: {
    fontSize:   18,
    fontWeight: '900',
    textAlign:  'center',
    letterSpacing: -0.2,
  },
});

export default StatCard;


