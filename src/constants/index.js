/**
 * src/constants/index.js
 *
 * App-wide constants: colours, API base URL, category labels, etc.
 * Designed for a high-end, modern mobile aesthetic.
 */

// ─── API ─────────────────────────────────────────────────────────────────────
export const API_BASE_URL = 'https://digivahivatbackend.onrender.com/api';

// Local development APIs (commented out):
// export const API_BASE_URL = 'http://10.0.2.2:5000/api';    // Android Emulator
// export const API_BASE_URL = 'http://localhost:5000/api';   // iOS Simulator / Web
// export const API_BASE_URL = 'http://192.168.x.x:5000/api'; // Physical Device (Local WiFi)

// ─── Colours ─────────────────────────────────────────────────────────────────
export const THEME_COLORS = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  text: '#1E1E1E',
  textSecondary: '#64748B',
  textMuted: '#64748B',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  primary: '#00AFEF',
  primaryDark: '#0090C8',
  primaryLight: 'rgba(0, 175, 239, 0.12)',
  danger: '#EF4444',
  dangerLight: 'rgba(239, 68, 68, 0.12)',
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  secondary: '#3E4095',
  secondaryLight: 'rgba(62, 64, 149, 0.12)',
  accent: '#3E4095',
  info: '#00AFEF',
  infoLight: 'rgba(0, 175, 239, 0.12)',
  white: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
  cardShadow: '#3E4095',
};

export const LIGHT_COLORS = THEME_COLORS;
export const DARK_COLORS  = THEME_COLORS;

// Default export alias
export const COLORS = THEME_COLORS;

// ─── Design Tokens (Soft & Elevated) ──────────────────────────────────────────
export const ROUNDED = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  full: 9999,
};

export const SHADOWS = {
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 3,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 6,
  },
};

// ─── Typography ───────────────────────────────────────────────────────────────
export const FONTS = {
  regular: 'System',
  bold: 'System',
};

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

// ─── Expense Categories ───────────────────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  'Decoration',
  'Panditji/Pooja',
  'Mahaprasad/Food',
  'Sound/Lighting',
  'Miscellaneous',
];

// ─── Payment Modes ────────────────────────────────────────────────────────────
export const PAYMENT_MODES = ['Cash', 'UPI'];

// ─── Payment Statuses ─────────────────────────────────────────────────────────
export const PAYMENT_STATUSES = ['Paid', 'Pending', 'Partial'];

/**
 * Determines whether an event is 'active', 'upcoming', or 'closed'.
 * Accurately takes into account the event's endDate (end of that calendar day)
 * and startDate so that passed events are never shown as active.
 */
export function getEventStatus(ev) {
  if (!ev) return 'closed';
  if (!ev.isActive) return 'closed';

  const now = Date.now();

  // If there is an end date and it has already passed
  if (ev.endDate) {
    const end = new Date(ev.endDate);
    if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0) {
      end.setHours(23, 59, 59, 999);
    }
    if (now > end.getTime()) {
      return 'closed';
    }
  }

  // If there is a start date in the future
  if (ev.startDate) {
    const start = new Date(ev.startDate);
    if (start.getTime() > now) {
      return 'upcoming';
    }
  }

  return 'active';
}

export const SOS_TYPES = [
  { id: 'Medical', label: 'Medical Crisis', icon: 'ambulance', color: '#EF4444', desc: 'Heart attack, elderly fall, severe injury' },
  { id: 'Fire', label: 'Fire / Gas Leak', icon: 'fire', color: '#F97316', desc: 'Smoke, cylinder leak, fire outbreak' },
  { id: 'LiftStuck', label: 'Lift Stuck', icon: 'elevator-passenger', color: '#EAB308', desc: 'Trapped inside elevator / power cut' },
  { id: 'Security', label: 'Threat / Theft', icon: 'shield-alert', color: '#8B5CF6', desc: 'Intruder, physical threat, robbery' },
  { id: 'General', label: 'General Danger', icon: 'alert-octagon', color: '#DC2626', desc: 'Urgent immediate help needed' },
];

export const EMERGENCY_CONTACTS = [
  { name: 'National Emergency', number: '112', icon: 'phone-alert', color: '#DC2626' },
  { name: 'Ambulance', number: '108', icon: 'ambulance', color: '#EF4444' },
  { name: 'Fire Brigade', number: '101', icon: 'fire', color: '#F97316' },
  { name: 'Police Control', number: '100', icon: 'shield-check', color: '#2563EB' },
];



