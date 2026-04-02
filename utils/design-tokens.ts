/**
 * Professional Design System Tokens
 * Single source of truth for colors, spacing, typography
 */

export const colors = {
  // Primary - Professional Blue
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  
  // Neutral - Professional Gray
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  
  // Semantic Colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
}

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.5rem',     // 24px
  '2xl': '2rem',    // 32px
  '3xl': '3rem',    // 48px
}

export const typography = {
  display: {
    size: '2.25rem',    // 36px
    weight: '700',
    lineHeight: '1.2',
  },
  h1: {
    size: '1.875rem',   // 30px
    weight: '700',
    lineHeight: '1.3',
  },
  h2: {
    size: '1.5rem',     // 24px
    weight: '600',
    lineHeight: '1.4',
  },
  h3: {
    size: '1.25rem',    // 20px
    weight: '600',
    lineHeight: '1.4',
  },
  body: {
    size: '1rem',       // 16px
    weight: '400',
    lineHeight: '1.5',
  },
  caption: {
    size: '0.875rem',   // 14px
    weight: '400',
    lineHeight: '1.4',
  },
  small: {
    size: '0.75rem',    // 12px
    weight: '400',
    lineHeight: '1.3',
  },
}

export const borderRadius = {
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  full: '9999px',
}

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
}

export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
}
