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

const RegisterScreen = ({ navigation }) => {
  const { login }     = useAuth();
  const { showError } = useAlert();
  const { colors }    = useTheme();
  const [form,    setForm]    = useState({ name: '', phone: '', password: '', houseOrFlatNo: '', totalMembers: '1' });
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name     = 'Name is required.';
    if (!form.phone.trim())   e.phone    = 'Phone is required.';
    else if (!/^\d{10}$/.test(form.phone.trim())) e.phone = 'Enter a valid 10-digit number.';
    if (!form.password.trim()) e.password = 'Password is required.';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters.';
    const members = parseInt(form.totalMembers, 10);
    if (isNaN(members) || members < 1) e.totalMembers = 'Enter a valid member count (≥ 1).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name:          form.name.trim(),
        phone:         form.phone.trim(),
        password:      form.password,
        houseOrFlatNo: form.houseOrFlatNo.trim() || null,
        totalMembers:  parseInt(form.totalMembers, 10),
      };
      const { data } = await authAPI.register(payload);
      await login(data.data, data.data.token);
    } catch (err) {
      showError('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.appLogo}
            resizeMode="contain"
          />
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Create Resident Account</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Input label="Full Name *"          placeholder="e.g. Ramesh Patel"        value={form.name}         onChangeText={set('name')}         error={errors.name} />
          <Input label="Phone Number *"       placeholder="10-digit mobile"           value={form.phone}        onChangeText={set('phone')}        keyboardType="phone-pad" maxLength={10} error={errors.phone} />
          <Input label="Password *"           placeholder="Min 6 characters"          value={form.password}     onChangeText={set('password')}     secureTextEntry error={errors.password} />
          <Input label="Flat / House No"      placeholder="e.g. A-204 (optional)"     value={form.houseOrFlatNo} onChangeText={set('houseOrFlatNo')} error={errors.houseOrFlatNo} />
          <Input label="Total Family Members *" placeholder="e.g. 4"                value={form.totalMembers} onChangeText={set('totalMembers')} keyboardType="number-pad" error={errors.totalMembers} />

          <Button title="Create Resident Account ✨" onPress={handleRegister} loading={loading} style={styles.btn} />

          <TouchableOpacity style={styles.link} onPress={() => navigation.goBack()}>
            <Text style={[styles.linkText, { color: colors.textMuted }]}>
              Already registered? <Text style={[styles.linkBold, { color: colors.primary }]}>Login here</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex:      { flex: 1 },
  container: { flexGrow: 1, padding: SPACING.lg, paddingVertical: SPACING.xl },
  header:    { alignItems: 'center', marginBottom: SPACING.lg },
  appLogo: {
    width: 140,
    height: 100,
    borderRadius: 12,
    marginBottom: SPACING.xs,
  },
  subtitle:  { fontSize: 13, marginTop: 2, fontWeight: '500' },
  card: {
    borderRadius:    24,
    padding:         SPACING.lg,
    borderWidth:     1,
    elevation:       4,
  },
  btn:      { marginTop: SPACING.sm },
  link:     { marginTop: SPACING.md, alignItems: 'center' },
  linkText: { fontSize: 14 },
  linkBold: { fontWeight: '700' },
});

export default RegisterScreen;

