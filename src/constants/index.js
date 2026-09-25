/**
 * src/constants/index.js
 *
 * App-wide constants: colours, API base URL, category labels, etc.
 * Designed for a high-end, modern mobile aesthetic.
 */

// ─── API ─────────────────────────────────────────────────────────────────────
export const API_BASE_URL = 'https://digivahivatbackend.onrender.com/api';

// ─── Colours ─────────────────────────────────────────────────────────────────
export const LIGHT_COLORS = {
  primary:       '#FF5722',   // Vibrant Saffron Orange
  primaryDark:   '#C23B00',
  primaryLight:  '#FFF3E0',
  secondary:     '#F59E0B',   // Warm Gold / Amber
  success:       '#10B981',   // Lush Emerald Green
  danger:        '#EF4444',   // Ruby Red
  warning:       '#F59E0B',   // Amber
  info:          '#3B82F6',   // Electric Blue
  background:    '#F8FAFC',   // Ultra-clean Slate Light Background
  surface:       '#FFFFFF',   // Pure White Surface
  surfaceCard:   '#FFFFFF',
  border:        '#E2E8F0',   // Subtle Card Border
  text:          '#0F172A',   // Deep Charcoal Slate Text
  textMuted:     '#64748B',   // Muted Slate Text
  white:         '#FFFFFF',
  modalOverlay:  'rgba(15, 23, 42, 0.65)',
  cardShadow:    '#0F172A',
};

export const DARK_COLORS = {
  primary:       '#FF6B35',   // Glowing Festive Saffron
  primaryDark:   '#E65100',
  primaryLight:  'rgba(255, 107, 53, 0.18)',
  secondary:     '#FBBF24',   // Bright Gold / Amber
  success:       '#34D399',   // Vivid Emerald Green
  danger:        '#F87171',   // Bright Coral Red
  warning:       '#FBBF24',   // Amber
  info:          '#60A5FA',   // Light Sky Blue
  background:    '#0F172A',   // Deep Slate Dark Background
  surface:       '#1E293B',   // Dark Slate Surface
  surfaceCard:   '#1E293B',
  border:        '#334155',   // Dark Border
  text:          '#F8FAFC',   // Crisp Light Slate Text
  textMuted:     '#94A3B8',   // Light Muted Text
  white:         '#FFFFFF',
  modalOverlay:  'rgba(0, 0, 0, 0.82)',
  cardShadow:    '#000000',
};

// Default export alias (falls back to light mode)
export const COLORS = LIGHT_COLORS;

// ─── Typography ───────────────────────────────────────────────────────────────
export const FONTS = {
  regular: 'System',
  bold:    'System',
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

