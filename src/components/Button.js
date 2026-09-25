/**
 * src/components/Button.js
 *
 * Reusable primary/secondary/danger button with loading state.
 * Supports auto Light & Dark theme modes.
 */
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants';

const Button = ({
  title,
  onPress,
  loading    = false,
  disabled   = false,
  variant    = 'primary',   // 'primary' | 'secondary' | 'danger' | 'outline'
  style,
  textStyle,
}) => {
  const { colors } = useTheme();

  const bgColor = {
    primary:   colors.primary,
    secondary: colors.secondary,
    danger:    colors.danger,
    outline:   'transparent',
  }[variant];

  const textColor = variant === 'outline' ? colors.primary : colors.white;
  const borderColor = variant === 'outline' ? colors.primary : 'transparent';

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: bgColor, borderColor, borderWidth: variant === 'outline' ? 1.5 : 0 },
        variant === 'primary' && { elevation: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}>
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <Text style={[styles.text, { color: textColor }, textStyle]}>{title}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    paddingVertical:   14,
    paddingHorizontal: SPACING.lg,
    borderRadius:      14,
    alignItems:        'center',
    justifyContent:    'center',
    minHeight:         50,
  },
  disabled: { opacity: 0.55 },
  text: {
    fontSize:   15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

export default Button;


