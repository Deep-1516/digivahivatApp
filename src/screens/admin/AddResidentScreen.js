/**
 * src/screens/admin/AddResidentScreen.js
 *
 * Admin screen to create a new Resident or Admin account.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity,
} from 'react-native';
import { residentsAPI }   from '../../services/api';
import { useAlert }       from '../../context/AlertContext';
import { useTheme }       from '../../context/ThemeContext';
import Input              from '../../components/Input';
import Button             from '../../components/Button';
import { SPACING }        from '../../constants';

const AddResidentScreen = ({ navigation }) => {
  const { showError, showSuccess } = useAlert();
  const { colors }                 = useTheme();
  const [name,          setName]          = useState('');
  const [phone,         setPhone]         = useState('');
  const [password,      setPassword]      = useState('Member@123');
  const [houseOrFlatNo, setHouseOrFlatNo] = useState('');
  const [totalMembers,  setTotalMembers]  = useState('1');
  const [role,          setRole]          = useState('Resident');
  const [submitting,    setSubmitting]    = useState(false);
  const [errors,        setErrors]        = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Full name is required.';
    if (!phone.trim()) e.phone = 'Phone number is required.';
    else if (!/^\d{10}$/.test(phone.trim())) e.phone = 'Enter a valid 10-digit number.';
    if (!password.trim()) e.password = 'Password is required.';
    else if (password.length < 6) e.password = 'Min 6 characters required.';
    const m = parseInt(totalMembers, 10);
    if (isNaN(m) || m < 1) e.totalMembers = 'Enter valid member count (≥ 1).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await residentsAPI.add({
        name:          name.trim(),
        phone:         phone.trim(),
        password:      password.trim(),
        houseOrFlatNo: houseOrFlatNo.trim() || null,
        totalMembers:  parseInt(totalMembers, 10),
        role,
      });
      showSuccess('Success ✅', `${role} created successfully.`, () => navigation.goBack());
    } catch (err) {
      showError('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Input
          label="Full Name *"
          placeholder="e.g. Rajesh Sharma"
          value={name}
          onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: '' })); }}
          error={errors.name}
        />

        <Input
          label="Phone Number *"
          placeholder="10-digit mobile"
          value={phone}
          onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: '' })); }}
          keyboardType="phone-pad"
          maxLength={10}
          error={errors.phone}
        />

        <Input
          label="Password *"
          placeholder="Min 6 characters"
          value={password}
          onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); }}
          secureTextEntry
          error={errors.password}
        />

        <Input
          label="Flat / House Number"
          placeholder="e.g. B-102"
          value={houseOrFlatNo}
          onChangeText={setHouseOrFlatNo}
        />

        <Input
          label="Total Family Members *"
          placeholder="e.g. 4"
          value={totalMembers}
          onChangeText={(t) => { setTotalMembers(t); setErrors((e) => ({ ...e, totalMembers: '' })); }}
          keyboardType="number-pad"
          error={errors.totalMembers}
        />

        {/* Role toggle */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Role</Text>
        <View style={styles.roleRow}>
          {['Resident', 'Admin'].map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, { borderColor: colors.border, backgroundColor: colors.surface }, role === r && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setRole(r)}>
              <Text style={[styles.roleText, { color: colors.text }, role === r && { color: '#FFF' }]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Create Resident Account 👤"
          onPress={handleSubmit}
          loading={submitting}
          style={{ marginTop: SPACING.md }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex:    { flex: 1 },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  sectionLabel: { fontSize: 13, fontWeight: '700', marginBottom: SPACING.xs, marginTop: SPACING.sm },
  roleRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.md },
  roleBtn: {
    flex: 1, borderRadius: 8, borderWidth: 1,
    paddingVertical: 10, alignItems: 'center',
  },
  roleText: { fontSize: 14, fontWeight: '600' },
});

export default AddResidentScreen;
