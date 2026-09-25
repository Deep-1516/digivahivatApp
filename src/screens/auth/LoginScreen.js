import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, Image,
} from 'react-native';
import { useAuth }      from '../../context/AuthContext';
import { useAlert }     from '../../context/AlertContext';
import { useTheme }     from '../../context/ThemeContext';
import { authAPI }      from '../../services/api';
import Input            from '../../components/Input';
import Button           from '../../components/Button';
import { COLORS, SPACING } from '../../constants';

const LoginScreen = ({ navigation }) => {
  const { login }     = useAuth();
  const { showError } = useAlert();
  const { colors }    = useTheme();
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!phone.trim())    e.phone    = 'Phone number is required.';
    else if (!/^\d{10}$/.test(phone.trim())) e.phone = 'Enter a valid 10-digit phone number.';
    if (!password.trim()) e.password = 'Password is required.';
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
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.appLogo}
            resizeMode="contain"
          />
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Digital Society Management</Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Welcome Back 👋</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>Sign in to manage contributions & expenses</Text>

          <Input
            label="Phone Number"
            placeholder="10-digit mobile number"
            value={phone}
            onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: '' })); }}
            keyboardType="phone-pad"
            maxLength={10}
            error={errors.phone}
          />

          <Input
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); }}
            secureTextEntry
            error={errors.password}
          />

          <Button title="Sign In 🚀" onPress={handleLogin} loading={loading} style={styles.btn} />

          <Text style={[styles.infoNote, { color: colors.textMuted }]}>
            Accounts are managed by society admins. Contact your Admin if you need login access.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex:      { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },
  header:    { alignItems: 'center', marginTop: SPACING.sm, marginBottom: SPACING.md },
  appLogo: {
    width: 140,
    height: 90,
    borderRadius: 14,
    marginBottom: SPACING.xs,
  },
  subtitle:  { fontSize: 13, marginTop: 2, textAlign: 'center', fontWeight: '500' },
  card: {
    borderRadius:    24,
    padding:         SPACING.lg,
    borderWidth:     1,
    elevation:       4,
  },
  cardTitle: { fontSize: 22, fontWeight: '800' },
  cardSub:   { fontSize: 13, marginTop: 2, marginBottom: SPACING.lg },
  btn:       { marginTop: SPACING.sm },
  infoNote:  { fontSize: 12, marginTop: SPACING.lg, textAlign: 'center', lineHeight: 18 },
});

export default LoginScreen;

