import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { type ColorScheme, type Colors, palettes } from './index';

type Preference = ColorScheme | 'system';

interface ThemeValue {
  /** The palette in effect right now. */
  colors: Colors;
  /** Resolved scheme — 'system' has already been mapped to light or dark. */
  scheme: ColorScheme;
  /** What the user picked; 'system' means follow the OS. */
  preference: Preference;
  setPreference: (next: Preference) => void;
  /** Flips between light and dark, leaving 'system' behind. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<Preference>('system');

  const scheme: ColorScheme =
    preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;

  const toggle = useCallback(() => {
    setPreference(scheme === 'dark' ? 'light' : 'dark');
  }, [scheme]);

  const value = useMemo<ThemeValue>(
    () => ({ colors: palettes[scheme], scheme, preference, setPreference, toggle }),
    [scheme, preference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside a ThemeProvider');
  return value;
}

/**
 * Builds a StyleSheet from the active palette, recomputing only when the scheme
 * flips. Styles can no longer live at module scope — they depend on the palette
 * — so this keeps the per-render cost to a cache lookup instead.
 */
export function useThemedStyles<T extends object>(factory: (c: Colors) => T): T {
  const { colors, scheme } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- factory is a stable module-scope fn
  return useMemo(() => factory(colors), [scheme]);
}
