/**
 * src/components/CustomAlertModal.js
 *
 * Custom popup dialog component for errors, warnings, success notifications, and confirms.
 * Provides a modern, premium popup design supporting Light and Dark modes.
 */
import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../constants';

const TYPE_CONFIG = {
  success: {
    icon: '🎉',
    badgeBg: 'rgba(16, 185, 129, 0.18)',
    iconBg: '#10B981',
    defaultTitle: 'Success',
  },
  error: {
    icon: '❌',
    badgeBg: 'rgba(239, 68, 68, 0.18)',
    iconBg: '#EF4444',
    defaultTitle: 'Error',
  },
  warning: {
    icon: '⚠️',
    badgeBg: 'rgba(245, 158, 11, 0.18)',
    iconBg: '#F59E0B',
    defaultTitle: 'Warning',
  },
  confirm: {
    icon: '❓',
    badgeBg: 'rgba(255, 87, 34, 0.18)',
    iconBg: '#FF5722',
    defaultTitle: 'Confirmation',
  },
  info: {
    icon: '💡',
    badgeBg: 'rgba(59, 130, 246, 0.18)',
    iconBg: '#3B82F6',
    defaultTitle: 'Notice',
  },
};

const CustomAlertModal = ({
  visible,
  title,
  message,
  type = 'info',
  buttons = [],
  onClose,
}) => {
  const { colors } = useTheme();
  if (!visible) return null;

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header Icon Badge */}
          <View style={[styles.iconContainer, { backgroundColor: config.badgeBg }]}>
            <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
              <Text style={styles.iconText}>{config.icon}</Text>
            </View>
          </View>

          {/* Title & Message */}
          <Text style={[styles.title, { color: colors.text }]}>{title || config.defaultTitle}</Text>
          {message ? <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text> : null}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {buttons.length > 0 ? (
              buttons.map((btn, index) => {
                const isPrimary = btn.style !== 'cancel' && (index === buttons.length - 1 || btn.primary);
                const isDestructive = btn.style === 'destructive';
                
                return (
                  <TouchableOpacity
                    key={btn.text || index}
                    activeOpacity={0.8}
                    style={[
                      styles.btn,
                      isPrimary && { backgroundColor: isDestructive ? colors.danger : colors.primary },
                      !isPrimary && [styles.btnOutline, { borderColor: colors.border }],
                      buttons.length > 1 && { flex: 1 },
                    ]}
                    onPress={() => {
                      onClose();
                      if (btn.onPress) {
                        setTimeout(() => {
                          btn.onPress();
                        }, 50);
                      }
                    }}>
                    <Text
                      style={[
                        styles.btnText,
                        isPrimary && styles.btnTextPrimary,
                        !isPrimary && { color: colors.textMuted },
                      ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={onClose}>
                <Text style={[styles.btnText, styles.btnTextPrimary]}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    borderRadius: 24,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  iconText: {
    fontSize: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: SPACING.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    width: '100%',
    justifyContent: 'center',
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnTextPrimary: {
    color: '#FFFFFF',
  },
});

export default CustomAlertModal;

