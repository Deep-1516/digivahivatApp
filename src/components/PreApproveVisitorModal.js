/**
 * src/components/PreApproveVisitorModal.js
 *
 * Resident form to pre-approve an upcoming visitor/guest.
 * Generates an instant Digital Gate Pass with QR Code and 6-digit Passcode
 * with 1-tap WhatsApp/SMS sharing.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, Image, Share, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { visitorsAPI } from '../services/api';
import Input from './Input';
import Button from './Button';
import Icon from './Icon';
import { COLORS, SPACING } from '../constants';

const VISITOR_TYPES = [
  { key: 'Guest',    label: 'Guest',    icon: 'account-heart-outline' },
  { key: 'Delivery', label: 'Delivery', icon: 'package-variant-closed' },
  { key: 'Cab',      label: 'Cab/Taxi', icon: 'car-outline' },
  { key: 'Service',  label: 'Service',  icon: 'tools' },
  { key: 'Other',    label: 'Other',    icon: 'dots-horizontal' },
];

const PreApproveVisitorModal = ({ visible, onClose, onSuccess }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showError, showSuccess } = useAlert();

  const [visitorName,     setVisitorName]     = useState('');
  const [visitorPhone,    setVisitorPhone]    = useState('');
  const [visitorType,     setVisitorType]     = useState('Guest');
  const [companyName,     setCompanyName]     = useState('');
  const [vehicleNumber,   setVehicleNumber]   = useState('');
  const [numberOfMembers, setNumberOfMembers] = useState(1);
  const [notes,           setNotes]           = useState('');

  const [submitting,      setSubmitting]      = useState(false);
  const [createdPass,     setCreatedPass]     = useState(null); // When generated

  const resetForm = () => {
    setVisitorName('');
    setVisitorPhone('');
    setVisitorType('Guest');
    setCompanyName('');
    setVehicleNumber('');
    setNumberOfMembers(1);
    setNotes('');
    setCreatedPass(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    if (!visitorName.trim()) {
      showError('Validation', 'Please enter visitor name.');
      return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        visitorName:     visitorName.trim(),
        visitorPhone:    visitorPhone.trim(),
        visitorType,
        companyName:     companyName.trim(),
        vehicleNumber:   vehicleNumber.trim(),
        numberOfMembers: Math.max(Number(numberOfMembers) || 1, 1),
        notes:           notes.trim(),
      };

      const res = await visitorsAPI.preApprove(payload);
      const pass = res.data?.data;
      setCreatedPass(pass);
      onSuccess?.(pass);
    } catch (err) {
      showError('Failed to Create Pass', err.message || 'Could not generate gate pass.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSharePass = async () => {
    if (!createdPass) return;
    try {
      const societyTitle = user?.societyId?.name || 'Society';
      const flat = createdPass.flatNo ? `Flat ${createdPass.flatNo}` : 'Resident Flat';
      const members = createdPass.numberOfMembers || 1;

      const message =
        `*DIGITAL GATE PASS — ${societyTitle.toUpperCase()}*\n\n` +
        `Hello ${createdPass.visitorName},\n` +
        `Your pre-approved gate pass for visiting *${flat}* (${user?.name || 'Host'}) has been generated.\n\n` +
        `*Passcode / OTP:* ${createdPass.passcode}\n` +
        `*Guests Allowed:* ${members} Person${members > 1 ? 's' : ''}\n` +
        `*Valid Until:* ${new Date(createdPass.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, 11:59 PM\n\n` +
        `_Show the QR code or tell the 6-digit passcode to the security guard at the gate for fast entry._`;

      await Share.share({
        title: `Gate Pass for ${createdPass.visitorName}`,
        message,
      });
    } catch (_) {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalCard, { backgroundColor: colors.surface, paddingTop: Math.max(insets.top > 0 ? 16 : 24, 16) }]}>

          {/* Modal Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View style={[styles.headerIconBadge, { backgroundColor: colors.primary + '18' }]}>
                <Icon name={createdPass ? 'shield-check-outline' : 'account-plus-outline'} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {createdPass ? 'Pre-Approved Gate Pass' : 'Pre-Approve Visitor'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {createdPass ? 'Ready to share with guest' : 'Fast-track gate entry with QR code'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.background }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ─── State 1: Gate Pass Created Screen ─── */}
            {createdPass ? (
              <View style={styles.passContainer}>

                {/* Voucher Card */}
                <View style={styles.voucherCard}>
                  {/* Voucher Header */}
                  <View style={styles.voucherHeader}>
                    <Text style={styles.voucherSocietyName}>
                      {(user?.societyId?.name || 'SOCIETY GATE PASS').toUpperCase()}
                    </Text>
                    <Text style={styles.voucherSub}>PRE-APPROVED VISITOR PASS</Text>
                  </View>

                  {/* QR Code Container */}
                  <View style={styles.qrContainer}>
                    {createdPass.qrCodeDataUrl ? (
                      <Image
                        source={{ uri: createdPass.qrCodeDataUrl }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={[styles.qrImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }]}>
                        <Icon name="qrcode" size={100} color={COLORS.navyDark} />
                      </View>
                    )}
                  </View>

                  {/* 6-Digit Passcode Strip */}
                  <View style={styles.passcodeBox}>
                    <Text style={styles.passcodeLabel}>SECURITY PASSCODE / OTP</Text>
                    <Text style={styles.passcodeDigits}>{createdPass.passcode}</Text>
                    <Text style={styles.passcodeHelp}>Guard can scan QR or type this 6-digit code</Text>
                  </View>

                  {/* Pass Details Table */}
                  <View style={styles.passDetailsGrid}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>VISITOR</Text>
                      <Text style={styles.detailValue}>{createdPass.visitorName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>DESTINATION</Text>
                      <Text style={styles.detailValue}>Flat {createdPass.flatNo} ({user?.name || 'Resident'})</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>MEMBERS</Text>
                      <Text style={styles.detailValue}>{createdPass.numberOfMembers || 1} Person(s)</Text>
                    </View>
                    {createdPass.vehicleNumber ? (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>VEHICLE NO.</Text>
                        <Text style={styles.detailValue}>{createdPass.vehicleNumber}</Text>
                      </View>
                    ) : null}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>VALID UNTIL</Text>
                      <Text style={styles.detailValue}>
                        {new Date(createdPass.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, 11:59 PM
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <TouchableOpacity
                  style={[styles.shareBtn, { backgroundColor: '#16A34A' }]}
                  onPress={handleSharePass}
                  activeOpacity={0.8}>
                  <Icon name="share-variant-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.shareBtnText}>Share Gate Pass to Guest</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.doneBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={handleClose}>
                  <Text style={[styles.doneBtnText, { color: colors.text }]}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (

              /* ─── State 2: Input Creation Form ─── */
              <View style={styles.formContainer}>

                {/* Visitor Type Selector */}
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Visitor Category</Text>
                <View style={styles.typeRow}>
                  {VISITOR_TYPES.map((t) => {
                    const isSelected = visitorType === t.key;
                    return (
                      <TouchableOpacity
                        key={t.key}
                        style={[
                          styles.typeChip,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => setVisitorType(t.key)}>
                        <Icon name={t.icon} size={15} color={isSelected ? '#FFFFFF' : colors.text} style={{ marginRight: 4 }} />
                        <Text style={[styles.typeChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Visitor Name & Mobile */}
                <Input
                  label="Visitor Full Name *"
                  placeholder="e.g. Rahul Mehta"
                  value={visitorName}
                  onChangeText={setVisitorName}
                />

                <Input
                  label="Visitor Mobile Number (Optional)"
                  placeholder="10-digit mobile number"
                  value={visitorPhone}
                  onChangeText={setVisitorPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                />

                {/* Number of Members Stepper */}
                <View style={styles.memberStepperContainer}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stepperLabel, { color: colors.text }]}>Total Number of Persons</Text>
                    <Text style={[styles.stepperSub, { color: colors.textMuted }]}>How many people arriving with this pass?</Text>
                  </View>
                  <View style={[styles.stepperBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setNumberOfMembers((prev) => Math.max(1, prev - 1))}>
                      <Icon name="minus" size={16} color={numberOfMembers > 1 ? colors.primary : colors.textMuted} />
                    </TouchableOpacity>
                    <Text style={[styles.stepperValue, { color: colors.text }]}>{numberOfMembers}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setNumberOfMembers((prev) => Math.min(20, prev + 1))}>
                      <Icon name="plus" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Delivery Company / Vehicle details */}
                {['Delivery', 'Cab'].includes(visitorType) && (
                  <Input
                    label="Company / Service Provider"
                    placeholder="e.g. Swiggy, Amazon, Uber, Zomato"
                    value={companyName}
                    onChangeText={setCompanyName}
                  />
                )}

                <Input
                  label="Vehicle Number (Optional)"
                  placeholder="e.g. MH-04-AB-1234"
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                  autoCapitalize="characters"
                />

                <Input
                  label="Purpose / Notes (Optional)"
                  placeholder="e.g. Birthday dinner, AC repair, courier delivery"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />

                <Button
                  title="Generate Gate Pass & QR Code"
                  onPress={handleGenerate}
                  loading={submitting}
                  style={{ marginTop: SPACING.md }}
                />
              </View>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '70%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  formContainer: {},
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  memberStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: SPACING.sm,
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepperSub: {
    fontSize: 11,
    marginTop: 2,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stepperBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 8,
    minWidth: 28,
    textAlign: 'center',
  },

  // ─── Generated Pass Voucher Styles ───
  passContainer: {
    alignItems: 'center',
  },
  voucherCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: SPACING.md,
  },
  voucherHeader: {
    backgroundColor: '#0A192F',
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  voucherSocietyName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  voucherSub: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.6,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  passcodeBox: {
    backgroundColor: '#FFF7ED',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FDBA74',
    paddingVertical: 10,
    alignItems: 'center',
  },
  passcodeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
    letterSpacing: 0.8,
  },
  passcodeDigits: {
    fontSize: 32,
    fontWeight: '900',
    color: '#C2410C',
    letterSpacing: 6,
    marginVertical: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  passcodeHelp: {
    fontSize: 10,
    color: '#9A3412',
    fontStyle: 'italic',
  },
  passDetailsGrid: {
    padding: SPACING.md,
    backgroundColor: '#FAFAFA',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  shareBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  doneBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default PreApproveVisitorModal;
