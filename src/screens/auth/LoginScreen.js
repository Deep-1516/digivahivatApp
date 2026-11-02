import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, Image,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { useAuth }      from '../../context/AuthContext';
import { useAlert }     from '../../context/AlertContext';
import { authAPI }      from '../../services/api';
import Input            from '../../components/Input';
import Icon             from '../../components/Icon';
import { SPACING }      from '../../constants';

// ─── Custom Brand Theme (as requested) ──────────────────────────────────────
const THEME = {
  background: '#FFFFFF',
  surface:    '#FFFFFF',
  primary:    '#00AFEF',  // Sky Blue
  secondary:  '#3E4095',  // Society Deep Blue
  dark:       '#1E1E1E',  // Dark Text / Charcoal
  inputBg:    '#F8FAFC',
  inputBorder:'#E2E8F0',
  textMuted:  '#64748B',
  borderSubtle:'#EEF2F6',
};

const LoginScreen = ({ navigation }) => {
  const { login }     = useAuth();
  const { showError } = useAlert();
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!phone.trim()) {
      e.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(phone.trim())) {
      e.phone = 'Enter a valid 10-digit phone number.';
    }
    if (!password.trim()) {
      e.password = 'Password is required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await authAPI.login({ phone: phone.trim(), password });
      await login(data.data, data.data.token);
    } catch (err) {
      showError('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: THEME.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ─── Brand Header ─── */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.appLogo}
            resizeMode="contain"
          />
          <View style={styles.pillBadge}>
            <View style={[styles.pillDot, { backgroundColor: THEME.primary }]} />
            <Text style={styles.pillText}>DIGITAL RESIDENTIAL SOCIETY</Text>
            <View style={[styles.pillDot, { backgroundColor: THEME.secondary }]} />
          </View>
        </View>

        {/* ─── Form Card ─── */}
        <View style={styles.card}>
          {/* Dual-tone decorative accent stripe */}
          <View style={styles.accentStripe}>
            <View style={[styles.stripeHalf, { backgroundColor: THEME.primary }]} />
            <View style={[styles.stripeHalf, { backgroundColor: THEME.secondary }]} />
          </View>

          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSub}>Sign in to manage your flat, dues & services</Text>

          <Input
            label="Mobile Number"
            labelStyle={styles.inputLabel}
            inputStyle={styles.textInput}
            focusedBorderColor={THEME.primary}
            placeholder="10-digit mobile number"
            placeholderTextColor="#94A3B8"
            value={phone}
            onChangeText={(t) => {
              const cleaned = t.replace(/[^0-9]/g, '');
              setPhone(cleaned);
              setErrors((e) => ({ ...e, phone: '' }));
            }}
            keyboardType="phone-pad"
            maxLength={10}
            autoCorrect={false}
            autoCapitalize="none"
            selectTextOnFocus={false}
            error={errors.phone}
          />

          <Input
            label="Password"
            labelStyle={styles.inputLabel}
            inputStyle={styles.textInput}
            focusedBorderColor={THEME.primary}
            eyeColor={THEME.secondary}
            placeholder="Enter your password"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setErrors((e) => ({ ...e, password: '' }));
            }}
            secureTextEntry
            error={errors.password}
          />

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.signInBtnText}>Sign In</Text>
                <Icon name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </View>
            )}
          </TouchableOpacity>

          {/* Information Callout */}
          <View style={styles.infoCallout}>
            <Icon name="shield-check-outline" size={18} color={THEME.secondary} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.infoText}>
              Accounts are created and managed by society administration. Contact your Society Admin if you need login access.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          Protected & Secured by <Text style={{ color: THEME.secondary, fontWeight: '700' }}>Sky Society</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl * 1.5,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  appLogo: {
    width: 200,
    height: 120,
    marginBottom: SPACING.xs,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 6,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.secondary,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 22,
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    borderWidth: 1.2,
    borderColor: THEME.borderSubtle,
    overflow: 'hidden',
    position: 'relative',
    elevation: 4,
    shadowColor: THEME.secondary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  accentStripe: {
    flexDirection: 'row',
    height: 4,
    marginHorizontal: -SPACING.lg,
    marginTop: -SPACING.md,
    marginBottom: SPACING.md,
  },
  stripeHalf: {
    flex: 1,
    height: 4,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.dark,
    letterSpacing: -0.4,
  },
  cardSub: {
    fontSize: 13,
    color: THEME.textMuted,
    marginTop: 4,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  inputLabel: {
    color: THEME.dark,
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: THEME.inputBg,
    color: THEME.dark,
    borderColor: THEME.inputBorder,
    borderWidth: 1.2,
    borderRadius: 14,
    fontSize: 15,
  },
  signInBtn: {
    backgroundColor: THEME.secondary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    elevation: 3,
    shadowColor: THEME.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  infoCallout: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 175, 239, 0.06)',
    borderColor: 'rgba(0, 175, 239, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: SPACING.lg,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: THEME.dark,
    lineHeight: 17,
    fontWeight: '500',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: SPACING.lg,
  },
});

export default LoginScreen;
