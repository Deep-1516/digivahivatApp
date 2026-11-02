/**
 * src/components/StatCard.js
 *
 * Displays a single key metric in a card.
 * Supports auto Light & Dark theme modes with modern squircle icon and micro-card styling.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants';
import Icon from './Icon';

const getFallbackIcon = (label = '') => {
  const l = (label || '').toLowerCase();
  if (l.includes('collect')) return 'arrow-bottom-left';
  if (l.includes('spent') || l.includes('expense')) return 'arrow-top-right';
  if (l.includes('balance')) return 'wallet-outline';
  if (l.includes('paid')) return 'account-check-outline';
  if (l.includes('house')) return 'home-city-outline';
  if (l.includes('member') || l.includes('resident') || l.includes('population')) return 'account-group-outline';
  return 'chart-box-outline';
};

const StatCard = ({ label, value, color, icon, style, isLight = false }) => {
  const { colors } = useTheme();
  const activeColor = color || (isLight ? '#00AFEF' : colors.primary);
  const cardBg = isLight ? '#FFFFFF' : colors.surface;
  const cardBorder = isLight ? '#E2E8F0' : colors.border;
  const labelColor = isLight ? '#64748B' : colors.textMuted;
  const resolvedIcon = icon || getFallbackIcon(label);

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }, isLight && styles.cardLightShadow, style]}>
      {/* Top accent pill */}
      <View style={[styles.colorPill, { backgroundColor: activeColor }]} />

      {/* Top Row: Icon badge + subtle indicator dot */}
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: `${activeColor}18` }]}>
          <Icon name={resolvedIcon} size={16} color={activeColor} />
        </View>
        <View style={[styles.indicatorDot, { backgroundColor: activeColor }]} />
      </View>

      {/* Metric content */}
      <View style={styles.metricContainer}>
        <Text style={[styles.value, { color: activeColor }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex:              1,
    borderRadius:      20,
    paddingVertical:   14,
    paddingHorizontal: 14,
    margin:            SPACING.xs,
    borderWidth:       1.2,
    minHeight:         96,
    justifyContent:    'space-between',
    elevation:         3,
    shadowColor:       '#3E4095',
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.07,
    shadowRadius:      10,
    overflow:          'hidden',
    position:          'relative',
  },
  cardLightShadow: {
    shadowColor:   '#3E4095',
    shadowOffset:  { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius:  12,
    elevation:     3,
  },
  colorPill: {
    position: 'absolute',
    top:      0,
    left:     0,
    right:    0,
    height:   3.5,
  },
  topRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   8,
    marginTop:      2,
  },
  iconContainer: {
    width:          30,
    height:         30,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  indicatorDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
    opacity:      0.8,
  },
  metricContainer: {
    marginTop: 2,
  },
  value: {
    fontSize:      18,
    fontWeight:    '900',
    letterSpacing: -0.3,
    marginBottom:  2,
  },
  label: {
    fontSize:      10,
    fontWeight:    '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

export default StatCard;


