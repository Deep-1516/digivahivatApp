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
export const LIGHT_COLORS = {
  primary: '#4F46E5',         // Royal Indigo (Fintech Core)
  primaryDark: '#3730A3',     // Deep Indigo
  primaryLight: '#EEF2FF',    // Soft Indigo Tint
  secondary: '#0EA5E9',       // Electric Sky Cyan
  secondaryLight: '#E0F2FE',  // Soft Sky Tint
  accent: '#8B5CF6',          // Vivid Violet
  success: '#10B981',         // Modern Emerald
  successLight: '#ECFDF5',
  danger: '#F43F5E',          // Crimson Coral
  dangerLight: '#FFF1F2',
  warning: '#F59E0B',         // Sunset Amber
  warningLight: '#FEF3C7',
  info: '#3B82F6',            // Electric Blue
  infoLight: '#EFF6FF',
  background: '#F8FAFC',      // Slate Porcelain Background
  surface: '#FFFFFF',         // Crisp White Surface
  surfaceCard: '#FFFFFF',     // Elevated White Card
  surfaceSubtle: '#F1F5F9',   // Cool Tint Surface
  border: '#E2E8F0',          // Hairline Slate Border
  borderSubtle: '#F1F5F9',
  text: '#0F172A',            // Deep Slate-900 Primary Text
  textSecondary: '#334155',   // Slate-700
  textMuted: '#64748B',       // Slate-500 Muted Text
  white: '#FFFFFF',
  modalOverlay: 'rgba(15, 23, 42, 0.65)',
  cardShadow: '#4F46E5',
};

export const DARK_COLORS = {
  primary: '#6366F1',         // Luminous Indigo
  primaryDark: '#4F46E5',     // Royal Indigo
  primaryLight: 'rgba(99, 102, 241, 0.16)',
  secondary: '#38BDF8',       // Bright Cyan
  secondaryLight: 'rgba(56, 189, 248, 0.16)',
  accent: '#A78BFA',          // Light Violet
  success: '#34D399',         // Vibrant Mint
  successLight: 'rgba(52, 211, 153, 0.16)',
  danger: '#FB7185',          // Bright Rose Red
  dangerLight: 'rgba(251, 113, 133, 0.16)',
  warning: '#FBBF24',         // Bright Amber
  warningLight: 'rgba(251, 191, 36, 0.16)',
  info: '#60A5FA',            // Light Sky
  infoLight: 'rgba(96, 165, 250, 0.16)',
  background: '#0B0F19',      // Obsidian Slate Background
  surface: '#151D2C',         // Deep Slate Surface
  surfaceCard: '#1A2336',     // Elevated Card Surface
  surfaceSubtle: '#1E293B',   // Sub-container surface
  border: '#233044',          // Dark Border
  borderSubtle: '#1C2638',
  text: '#F8FAFC',            // Crisp White-Slate Text
  textSecondary: '#CBD5E1',   // Slate-300
  textMuted: '#94A3B8',       // Slate-400 Muted Text
  white: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.82)',
  cardShadow: '#000000',
};

// Default export alias (falls back to light mode)
export const COLORS = LIGHT_COLORS;

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
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  floating: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
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



