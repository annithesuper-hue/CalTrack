import React, { createContext, useContext, useMemo } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

/**
 * Theme system. The app follows the device's system appearance
 * automatically (light/dark) via `useColorScheme()` — there is no
 * hardcoded scheme anywhere. Every screen/component reads colors through
 * `useTheme()` so switching the OS appearance re-renders the whole tree
 * with the correct palette, with no flash (the root layout resolves the
 * scheme before first paint — see `_layout.tsx`).
 */

export type ColorScheme = 'light' | 'dark';

export type ColorPalette = {
  bg: string;
  bgElevated: string;
  card: string;
  cardPressed: string;
  ink: string;
  inkSecondary: string;
  inkMuted: string;
  hairline: string;
  accent: string;
  accentInk: string;
  green: string;
  greenSoft: string;
  yellow: string;
  yellowSoft: string;
  orange: string;
  orangeSoft: string;
  danger: string;
  dangerSoft: string;
  protein: string;
  proteinSoft: string;
  carbs: string;
  carbsSoft: string;
  fat: string;
  fatSoft: string;
  ring: string;
  ringTrack: string;
  overlay: string;
  skeleton: string;
};

// Warm, premium light palette — kept close to the app's original look.
const light: ColorPalette = {
  bg: '#FAF8F4',
  bgElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardPressed: '#F4F1EA',
  ink: '#191712',
  inkSecondary: '#6E6857',
  inkMuted: '#A39C89',
  hairline: '#ECE8DF',
  accent: '#191712',
  accentInk: '#FFFFFF',
  green: '#3E9B5F',
  greenSoft: '#E4F2E9',
  yellow: '#C99A1E',
  yellowSoft: '#FBF1DA',
  orange: '#D9772E',
  orangeSoft: '#FBE9DA',
  danger: '#C4402E',
  dangerSoft: '#FBE6E2',
  protein: '#D2492F',
  proteinSoft: '#F9E7E2',
  carbs: '#DD9A26',
  carbsSoft: '#F9F0DC',
  fat: '#4E7DE0',
  fatSoft: '#E6EDFB',
  ring: '#3E9B5F',
  ringTrack: '#EDEAE2',
  overlay: 'rgba(20, 18, 12, 0.45)',
  skeleton: '#EFEBE2',
};

// Deep charcoal + neon-green dark palette — premium, high contrast,
// fitness-app appropriate. Accent doubles as the primary ring/CTA color.
const dark: ColorPalette = {
  bg: '#0B0C0B',
  bgElevated: '#141513',
  card: '#171916',
  cardPressed: '#1F211D',
  ink: '#F5F7F3',
  inkSecondary: '#A6ACA2',
  inkMuted: '#6F756B',
  hairline: '#262922',
  accent: '#B4FF39',
  accentInk: '#0B0C0B',
  green: '#8CF25E',
  greenSoft: '#1C2A16',
  yellow: '#E8C34A',
  yellowSoft: '#2C2712',
  orange: '#F0975A',
  orangeSoft: '#2E2016',
  danger: '#FF6B5E',
  dangerSoft: '#2E1917',
  protein: '#FF8A65',
  proteinSoft: '#2A1D16',
  carbs: '#F3C05E',
  carbsSoft: '#2B2413',
  fat: '#6FA1FF',
  fatSoft: '#171F2E',
  ring: '#B4FF39',
  ringTrack: '#23251F',
  overlay: 'rgba(0, 0, 0, 0.6)',
  skeleton: '#1D1F1A',
};

export const Palettes: Record<ColorScheme, ColorPalette> = { light, dark };

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  screen: 20,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

function buildShadow(scheme: ColorScheme) {
  // Dark mode shadows read as mud on a near-black background, so they're
  // toned down considerably and rely more on the hairline border for
  // definition than elevation.
  const isDark = scheme === 'dark';
  return {
    card: {
      shadowColor: isDark ? '#000000' : '#3E3005',
      shadowOpacity: isDark ? 0.35 : 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: isDark ? 0 : 3,
    },
    float: {
      shadowColor: isDark ? '#000000' : '#141105',
      shadowOpacity: isDark ? 0.5 : 0.18,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: isDark ? 0 : 8,
    },
  } as const;
}

function buildType(colors: ColorPalette) {
  return {
    display: {
      fontSize: 44,
      fontWeight: '800' as const,
      letterSpacing: -1.2,
      color: colors.ink,
      fontVariant: ['tabular-nums'] as const,
    },
    title: {
      fontSize: 28,
      fontWeight: '800' as const,
      letterSpacing: -0.6,
      color: colors.ink,
    },
    heading: {
      fontSize: 20,
      fontWeight: '700' as const,
      letterSpacing: -0.4,
      color: colors.ink,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      color: colors.ink,
    },
    bodyBold: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.ink,
    },
    secondary: {
      fontSize: 15,
      fontWeight: '400' as const,
      color: colors.inkSecondary,
    },
    caption: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.inkSecondary,
    },
    micro: {
      fontSize: 11,
      fontWeight: '600' as const,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
      color: colors.inkMuted,
    },
  } as const;
}

function buildMacroMeta(colors: ColorPalette) {
  return {
    protein: { label: 'Protein', color: colors.protein, soft: colors.proteinSoft, icon: 'fish.fill' },
    carbs: { label: 'Carbs', color: colors.carbs, soft: colors.carbsSoft, icon: 'leaf.fill' },
    fat: { label: 'Fat', color: colors.fat, soft: colors.fatSoft, icon: 'drop.fill' },
  } as const;
}

export type Theme = {
  scheme: ColorScheme;
  colors: ColorPalette;
  type: ReturnType<typeof buildType>;
  shadow: ReturnType<typeof buildShadow>;
  macroMeta: ReturnType<typeof buildMacroMeta>;
};

function buildTheme(scheme: ColorScheme): Theme {
  const colors = Palettes[scheme];
  return {
    scheme,
    colors,
    type: buildType(colors),
    shadow: buildShadow(scheme),
    macroMeta: buildMacroMeta(colors),
  };
}

export const LightTheme = buildTheme('light');
export const DarkTheme = buildTheme('dark');

/** Synchronous best-effort read of the current device scheme, used to render the very first frame with the correct theme (avoids a flash). */
export function getInitialColorScheme(): ColorScheme {
  const scheme = Appearance.getColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

const ThemeContext = createContext<Theme>(buildTheme(getInitialColorScheme()));

/**
 * Provides the resolved theme (following the device appearance) to the
 * whole app. Wrap the root layout with this once — every screen then just
 * calls `useTheme()`. Uses RN's `useColorScheme`, which subscribes to
 * `Appearance` changes and re-renders automatically when the person
 * toggles system dark mode while the app is open or backgrounded.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const resolved: ColorScheme = scheme === 'dark' ? 'dark' : 'light';
  const theme = useMemo(() => buildTheme(resolved), [resolved]);
  return React.createElement(ThemeContext.Provider, { value: theme }, children);
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export const isIOS = Platform.OS === 'ios';

// ---------------------------------------------------------------------
// Backward-compatible static exports, for the rare call site that renders
// outside a component (e.g. a plain helper function). These track the
// current device scheme via an Appearance listener, but — unlike
// `useTheme()` — reading them does NOT subscribe your component to
// changes, so prefer the hook inside components/screens.
// ---------------------------------------------------------------------
export let Colors: ColorPalette = Palettes[getInitialColorScheme()];
export let Type: ReturnType<typeof buildType> = buildType(Colors);
export let Shadow: ReturnType<typeof buildShadow> = buildShadow(getInitialColorScheme());
export let MacroMeta: ReturnType<typeof buildMacroMeta> = buildMacroMeta(Colors);

Appearance.addChangeListener(({ colorScheme }) => {
  const scheme: ColorScheme = colorScheme === 'dark' ? 'dark' : 'light';
  Colors = Palettes[scheme];
  Type = buildType(Colors);
  Shadow = buildShadow(scheme);
  MacroMeta = buildMacroMeta(Colors);
});
