/**
 * VJC Overseas Unified Portal - Design System Tokens
 * Professional enterprise-grade design tokens for consistent UI across all modules
 */

// ============================================================
// COLOR PALETTE
// ============================================================

export const colors = {
  // Primary Colors
  primary: {
    blue: '#1769E0',
    dark: '#10264A',
    light: '#4A90E2',
  },

  // Semantic Colors
  success: '#159A63',
  warning: '#E99A17',
  danger: '#D9363E',
  info: '#3983E6',

  // Neutral Colors
  background: '#F5F8FC',
  surface: '#FFFFFF',
  border: '#DCE5F0',

  // Text Colors
  text: {
    primary: '#17243A',
    secondary: '#65748B',
    muted: '#8B95A5',
    inverse: '#FFFFFF',
  },

  // Status Colors
  status: {
    online: '#10B981',
    offline: '#6B7280',
    pending: '#F59E0B',
    approved: '#059669',
    rejected: '#DC2626',
  },

  // Chart Colors
  charts: {
    blue: '#1769E0',
    green: '#10B981',
    orange: '#F59E0B',
    red: '#EF4444',
    purple: '#8B5CF6',
    teal: '#14B8A6',
    pink: '#EC4899',
    indigo: '#6366F1',
  },
};

// ============================================================
// TYPOGRAPHY
// ============================================================

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",

  fontSizes: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '40px',
    '4xl': '48px',
  },

  fontWeights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  letterSpacing: {
    normal: '0',
    tight: '-0.025em',
    wide: '0.025em',
    wider: '0.05em',
  },
};

// ============================================================
// SPACING SYSTEM (8px base)
// ============================================================

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
};

// ============================================================
// BORDER RADIUS
// ============================================================

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
};

// ============================================================
// SHADOWS
// ============================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
  md: '0 4px 12px rgba(0, 0, 0, 0.12)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.16)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.20)',
};

// ============================================================
// Z-INDEX SCALE
// ============================================================

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

// ============================================================
// BREAKPOINTS
// ============================================================

export const breakpoints = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ============================================================
// TRANSITIONS
// ============================================================

export const transitions = {
  fast: '150ms ease-in-out',
  base: '200ms ease-in-out',
  slow: '300ms ease-in-out',
};

// ============================================================
// COMPONENT-SPECIFIC TOKENS
// ============================================================

export const components = {
  // Card
  card: {
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    shadow: shadows.sm,
  },

  // Button
  button: {
    padding: `${spacing[3]} ${spacing[5]}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    transition: transitions.base,
  },

  // Input
  input: {
    padding: `${spacing[3]} ${spacing[4]}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSizes.sm,
    border: `1px solid ${colors.border}`,
  },

  // Badge
  badge: {
    padding: '2px 8px',
    borderRadius: borderRadius.full,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },

  // KPI Card
  kpiCard: {
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    shadow: shadows.sm,
  },

  // Chart Container
  chart: {
    height: '300px',
    padding: spacing[4],
  },
};

// ============================================================
// THEME EXPORT
// ============================================================

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  zIndex,
  breakpoints,
  transitions,
  components,
};

export default theme;
