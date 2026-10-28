/**
 * src/components/PdfReceiptModal.js
 *
 * High-fidelity, official A5-style PDF Payment Receipt View Modal.
 * Displays all voucher details (Society branding, Receipt No, Resident details,
 * Amount in figures & words, Mode, Transaction ID, Digital Seal)
 * and provides immediate "Download PDF" to mobile storage, "Share", and "Open PDF Viewer" actions.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, ActivityIndicator, Linking, Share, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { contributionsAPI } from '../services/api';
import { COLORS, SPACING } from '../constants';
import Icon from './Icon';

// ─── Indian Currency Number-to-Words Helper ─────────────────────────────────
function numberToWordsINR(num) {
  const n = Math.floor(Number(num) || 0);
  if (n === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanOneThousand(val) {
    let str = '';
    if (val >= 100) {
      str += singleDigits[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 10 && val <= 19) {
      str += twoDigits[val - 10] + ' ';
    } else if (val >= 20) {
      str += tens[Math.floor(val / 10)] + ' ';
      val %= 10;
      if (val > 0) str += singleDigits[val] + ' ';
    } else if (val > 0) {
      str += singleDigits[val] + ' ';
    }
    return str.trim();
  }

  let words = '';
  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  const hundredAndBelow = rem;

  if (crore > 0) words += convertLessThanOneThousand(crore) + ' Crore ';
  if (lakh > 0) words += convertLessThanOneThousand(lakh) + ' Lakh ';
  if (thousand > 0) words += convertLessThanOneThousand(thousand) + ' Thousand ';
  if (hundredAndBelow > 0) words += convertLessThanOneThousand(hundredAndBelow) + ' ';

  return words.trim() + ' Rupees Only';
}

const PdfReceiptModal = ({ visible, item, onClose }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const [downloading, setDownloading] = useState(false);

  if (!item) return null;

  const societyName = (
    item.societyName ||
    user?.societyId?.name ||
    'FALO RESIDENTIAL COMMUNITY'
  ).toUpperCase();

  const receiptShort = (item._id || '').slice(-8).toUpperCase();
  const dateObj = item.date ? new Date(item.date) : new Date();
  const yearStr = dateObj.getFullYear();
  const receiptNo = `REC-${yearStr}-${receiptShort}`;

  const dateFormatted =
    dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' +
    dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const isAnnual = item.contributionType === 'Annual';
  const eventName = isAnnual
    ? `Annual Society Maintenance Fund (${item.annualYear || ''})`
    : (item.eventId?.title || 'Society Event Collection');

  const category = isAnnual ? 'Annual Fund' : 'Event Collection';
  const residentName = item.residentId?.name || 'Resident';
  const flatNo = item.residentId?.houseOrFlatNo ? `Flat ${item.residentId.houseOrFlatNo}` : 'N/A';
  const phone = item.residentId?.phone || 'N/A';
  const amount = Number(item.amount) || 0;
  const amountInWords = numberToWordsINR(amount);
  const paymentMode = item.paymentMode || 'Cash';
  const paymentStatus = item.paymentStatus || 'Paid';
  const transactionId = item.transactionId || null;
  const recordedBy = item.recordedBy?.name || 'Society Admin';
  const notes = item.notes ? String(item.notes).trim() : '';

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const downloadUrl = await contributionsAPI.getReceiptDownloadUrl(item._id, false);
      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
        showSuccess(
          'Downloading Receipt',
          'PDF receipt is downloading to your device storage (Downloads folder).'
        );
      } else {
        showError('Download Failed', 'Could not open browser to download receipt.');
      }
    } catch (err) {
      showError('Download Failed', err.message || 'Could not download receipt.');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenViewer = async () => {
    try {
      const viewUrl = await contributionsAPI.getReceiptDownloadUrl(item._id, true);
      const supported = await Linking.canOpenURL(viewUrl);
      if (supported) {
        await Linking.openURL(viewUrl);
      } else {
        showError('Error', 'Unable to open PDF viewer.');
      }
    } catch (err) {
      showError('Error', err.message || 'Could not open receipt.');
    }
  };

  const handleShare = async () => {
    try {
      const downloadUrl = await contributionsAPI.getReceiptDownloadUrl(item._id, true);
      await Share.share({
        title: `Payment Receipt ${receiptNo}`,
        message: `Official Payment Receipt Voucher\nSociety: ${societyName}\nReceipt No: ${receiptNo}\nAmount: ₹${amount.toLocaleString('en-IN')}\nResident: ${residentName} (${flatNo})\nView Receipt: ${downloadUrl}`,
        url: downloadUrl,
      });
    } catch (_) {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, paddingTop: Math.max(insets.top > 0 ? 16 : 24, 16) }]}>

          {/* Modal Header */}
          <View style={[styles.topHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View style={[styles.pdfIconBadge, { backgroundColor: colors.primary + '18' }]}>
                <Icon name="file-pdf-box" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Receipt</Text>
                <Text style={[styles.headerSub, { color: colors.textMuted }]}>{receiptNo}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.background }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Printable Voucher Paper Preview */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.voucherContainer}>
              <View style={styles.paper}>

                {/* Society Header */}
                <View style={styles.paperHeader}>
                  <View style={styles.stampIconContainer}>
                    <Icon name="shield-check" size={28} color="#FFFFFF" />
                  </View>
                  <Text style={styles.societyTitle}>{societyName}</Text>
                  <Text style={styles.societySub}>REGISTERED RESIDENTIAL WELFARE ASSOCIATION</Text>
                  <View style={styles.voucherBadge}>
                    <Text style={styles.voucherBadgeText}>OFFICIAL PAYMENT RECEIPT VOUCHER</Text>
                  </View>
                </View>

                {/* Receipt Details Strip */}
                <View style={styles.metaRow}>
                  <View>
                    <Text style={styles.metaLabel}>RECEIPT NO.</Text>
                    <Text style={styles.metaValue}>{receiptNo}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.metaLabel}>DATE & TIME</Text>
                    <Text style={styles.metaValue}>{dateFormatted}</Text>
                  </View>
                </View>

                {/* Status Bar */}
                <View style={styles.statusRow}>
                  <View style={styles.statusPill}>
                    <Icon name="check-circle" size={13} color="#16A34A" />
                    <Text style={styles.statusPillText}>{paymentStatus.toUpperCase()} & SETTLED</Text>
                  </View>
                  <View style={styles.modePill}>
                    <Icon name={paymentMode === 'UPI' ? 'cellphone' : 'cash-multiple'} size={13} color="#2563EB" />
                    <Text style={styles.modePillText}>{paymentMode === 'UPI' ? 'UPI ONLINE' : 'CASH PAYMENT'}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Details Table */}
                <View style={styles.detailsGrid}>
                  <View style={styles.gridRow}>
                    <View style={styles.gridCol}>
                      <Text style={styles.gridLabel}>RECEIVED FROM</Text>
                      <Text style={styles.gridValue}>{residentName}</Text>
                    </View>
                    <View style={styles.gridCol}>
                      <Text style={styles.gridLabel}>HOUSE / FLAT NO.</Text>
                      <Text style={styles.gridValue}>{flatNo}</Text>
                    </View>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridCol}>
                      <Text style={styles.gridLabel}>MOBILE NUMBER</Text>
                      <Text style={styles.gridValue}>{phone}</Text>
                    </View>
                    <View style={styles.gridCol}>
                      <Text style={styles.gridLabel}>FUND CATEGORY</Text>
                      <Text style={styles.gridValue}>{category}</Text>
                    </View>
                  </View>

                  <View style={styles.gridFullRow}>
                    <Text style={styles.gridLabel}>PAYMENT FOR / EVENT</Text>
                    <Text style={styles.gridValueHighlight}>{eventName}</Text>
                  </View>

                  {transactionId ? (
                    <View style={styles.gridFullRow}>
                      <Text style={styles.gridLabel}>TRANSACTION REFERENCE ID</Text>
                      <Text style={styles.gridMonoValue}>{transactionId}</Text>
                    </View>
                  ) : null}

                  {notes ? (
                    <View style={styles.gridFullRow}>
                      <Text style={styles.gridLabel}>REMARKS / NOTES</Text>
                      <Text style={styles.gridNotesValue}>{notes}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Amount Hero Section */}
                <View style={styles.amountBox}>
                  <Text style={styles.amountBoxLabel}>TOTAL AMOUNT RECEIVED</Text>
                  <Text style={styles.amountBoxFigure}>₹ {amount.toLocaleString('en-IN')}</Text>
                  <Text style={styles.amountBoxWords}>({amountInWords})</Text>
                </View>

                {/* Footer Seal & Sign */}
                <View style={styles.signatureRow}>
                  <View style={styles.sealBox}>
                    <Icon name="certificate-outline" size={16} color="#059669" />
                    <Text style={styles.sealText}>DIGITALLY VERIFIED</Text>
                  </View>
                  <View style={styles.signBox}>
                    <View style={styles.signLine} />
                    <Text style={styles.signName}>{recordedBy}</Text>
                    <Text style={styles.signRole}>Authorized Society Admin</Text>
                  </View>
                </View>

                {/* Disclaimer */}
                <Text style={styles.disclaimerText}>
                  This is a computer-generated official receipt issued by DigiVahivat and requires no physical signature.
                </Text>

              </View>
            </View>
          </ScrollView>

          {/* Action Bar */}
          <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
              onPress={handleDownload}
              disabled={downloading}
              activeOpacity={0.8}>
              {downloading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Icon name="download" size={18} color="#FFFFFF" />
                  <Text style={styles.downloadBtnText}>Download PDF to Storage</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.subActionsRow}>
              <TouchableOpacity
                style={[styles.subBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={handleOpenViewer}>
                <Icon name="open-in-new" size={16} color={colors.text} />
                <Text style={[styles.subBtnText, { color: colors.text }]}>Open Viewer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={handleShare}>
                <Icon name="share-variant-outline" size={16} color={colors.text} />
                <Text style={[styles.subBtnText, { color: colors.text }]}>Share Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '75%',
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  pdfIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
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
    paddingBottom: SPACING.lg,
  },
  voucherContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  paper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  paperHeader: {
    backgroundColor: '#0A192F',
    margin: -SPACING.md,
    marginBottom: SPACING.md,
    paddingVertical: 18,
    paddingHorizontal: SPACING.md,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    alignItems: 'center',
  },
  stampIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  societyTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  societySub: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  voucherBadge: {
    backgroundColor: '#E85C0D',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 10,
  },
  voucherBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  modePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  detailsGrid: {
    paddingVertical: 4,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridCol: {
    flex: 1,
  },
  gridFullRow: {
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 1,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  gridValueHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0A192F',
  },
  gridMonoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gridNotesValue: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#475569',
  },
  amountBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.md,
    alignItems: 'center',
    marginVertical: 10,
  },
  amountBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  amountBoxFigure: {
    fontSize: 26,
    fontWeight: '900',
    color: '#16A34A',
  },
  amountBoxWords: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sealBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  sealText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  signBox: {
    alignItems: 'center',
  },
  signLine: {
    width: 100,
    height: 1,
    backgroundColor: '#94A3B8',
    marginBottom: 4,
  },
  signName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  signRole: {
    fontSize: 9,
    color: '#64748B',
  },
  disclaimerText: {
    fontSize: 9,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  bottomBar: {
    padding: SPACING.md,
    borderTopWidth: 1,
    gap: 8,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  subActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  subBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  subBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default PdfReceiptModal;
