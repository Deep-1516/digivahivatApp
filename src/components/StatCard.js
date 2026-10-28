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
    borderRadius:     18,
    paddingVertical:  SPACING.md,
    paddingHorizontal: SPACING.sm,
    margin:           SPACING.xs,
    borderWidth:      1,
    alignItems:       'center',
    justifyContent:   'center',
    minHeight:        88,
    elevation:        2.5,
    shadowColor:      '#4F46E5',
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.06,
    shadowRadius:     12,
    overflow:         'hidden',
  },
  colorPill: {
    position:         'absolute',
    top:              0,
    left:             16,
    right:            16,
    height:           3.5,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  label: {
    fontSize:       10,
    marginBottom:   6,
    textAlign:      'center',
    fontWeight:     '700',
    letterSpacing:  0.8,
    textTransform:  'uppercase',
  },
  value: {
    fontSize:       19,
    fontWeight:     '900',
    textAlign:      'center',
    letterSpacing:  -0.3,
  },
});

export default StatCard;


