/**
 * src/components/Input.js
 *
 * Labeled text input with error display and password visibility toggle (eye icon).
 * Supports auto Light & Dark theme modes.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants';

const Input = ({
  label,
  error,
  containerStyle,
  secureTextEntry,
  ...props
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordInput = secureTextEntry !== undefined;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}

      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            {
              borderColor:     isFocused ? colors.primary : colors.border,
              backgroundColor: colors.surface,
              color:           colors.text,
            },
            error && { borderColor: colors.danger },
            props.multiline && styles.multiline,
            isPasswordInput && styles.passwordInputPadding,
          ]}
          placeholderTextColor={colors.textMuted}
          selectTextOnFocus
          onFocus={(e) => {
            setIsFocused(true);
            if (props.onFocus) props.onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (props.onBlur) props.onBlur(e);
          }}
          secureTextEntry={isPasswordInput ? !showPassword : false}
          {...props}
        />

        {isPasswordInput && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}>
            <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { marginBottom: SPACING.md },
  label: {
    fontSize:     13,
    fontWeight:   '700',
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    position:     'relative',
    justifyContent: 'center',
  },
  input: {
    borderWidth:       1.2,
    borderRadius:      12,
    paddingHorizontal: SPACING.md,
    paddingVertical:   12,
    fontSize:          15,
    minHeight:         48,
  },
  passwordInputPadding: {
    paddingRight: 48,
  },
  eyeButton: {
    position:  'absolute',
    right:     12,
    height:    '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },
  multiline: {
    minHeight:         90,
    textAlignVertical: 'top',
  },
  error: { fontSize: 12, marginTop: 4, fontWeight: '500' },
});

export default Input;
