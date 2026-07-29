/**
 * Design tokens.
 *
 * Colours come in a light and a dark set behind one shared key list, so a
 * component reads `c.surface` and never knows which scheme is active. Layout
 * tokens (spacing/radius/typography) are scheme-independent and stay frozen at
 * module scope.
 */

export type ColorScheme = 'light' | 'dark';

export interface Colors {
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;

  accent: string;
  accentDim: string;

  healthy: string;
  degraded: string;
  failing: string;
  idle: string;

  text: string;
  textDim: string;
  textMuted: string;

  /** Opacity suffix for tinted chip/badge fills — needs more punch on dark. */
  tintAlpha: string;
  /** Elevation is drawn with borders on dark, soft shadows on light. */
  shadowOpacity: number;
}

const dark: Colors = {
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

  tintAlpha: '26',
  shadowOpacity: 0,
};

const light: Colors = {
  bg: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  border: '#E2E8F2',

  accent: '#2563EB',
  accentDim: '#1D4ED8',

  // Deepened one step from the dark set so they hold contrast on white.
  healthy: '#15803D',
  degraded: '#B45309',
  failing: '#DC2626',
  idle: '#64748B',

  text: '#0B1220',
  textDim: '#4A5768',
  textMuted: '#7A8699',

  tintAlpha: '1F',
  shadowOpacity: 0.06,
};

export const palettes = { light, dark } as const;

/** Dark palette as a static export, for the few module-scope constants. */
export const colors = dark;

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

/** Maps an agent health state to its indicator colour within a palette. */
export function healthColor(status: string, c: Colors = colors): string {
  switch (status) {
    case 'healthy':
      return c.healthy;
    case 'degraded':
      return c.degraded;
    case 'failing':
      return c.failing;
    default:
      return c.idle;
  }
}
