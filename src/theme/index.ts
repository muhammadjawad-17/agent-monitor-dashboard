/**
 * Design tokens. Kept as a plain frozen object so styles can be built at module
 * scope with StyleSheet.create rather than recomputed per render.
 */
export const colors = {
  bg: '#0A0E17',
  surface: '#121826',
  surfaceRaised: '#1A2233',
  border: '#252F45',

  accent: '#4F8CFF',
  accentDim: '#2E5FCC',

  healthy: '#22C55E',
  degraded: '#F59E0B',
  failing: '#EF4444',
  idle: '#64748B',

  text: '#EEF2FF',
  textDim: '#94A3B8',
  textMuted: '#5A6784',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.2 },
  h3: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  tiny: { fontSize: 10.5, fontWeight: '500' as const },
  mono: { fontSize: 11.5, fontFamily: 'Menlo' },
} as const;

/** Maps an agent health state to its indicator colour. */
export function healthColor(status: string): string {
  switch (status) {
    case 'healthy':
      return colors.healthy;
    case 'degraded':
      return colors.degraded;
    case 'failing':
      return colors.failing;
    default:
      return colors.idle;
  }
}
