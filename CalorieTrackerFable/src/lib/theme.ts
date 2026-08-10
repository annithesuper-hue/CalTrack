import { Platform, useColorScheme } from 'react-native';

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------
// Light: original warm cream/ink palette.
// Dark: neon-green-on-black. Kept the same *keys* as light so every screen
// that already reads `colors.card`, `colors.ink`, etc. works unchanged —
// only the values differ per scheme.

export const LightColors = {
  bg: '#FAF8F4',
  card: '#FFFFFF',
  cardPressed: '#F4F1EA',
  ink: '#191712',
  inkSecondary: '#6E6857',
  inkMuted: '#A39C89',
  hairline: '#ECE8DF',
  accent: '#191712',
  onAccent: '#FFFFFF',
  green: '#3E9B5F',
  greenSoft: '#E4F2E9',
  yellow: '#C99A1E',
  yellowSoft: '#FBF1DA',
  orange: '#D9772E',
  orangeSoft: '#FBE9DA',
  danger: '#C4402E',
  protein: '#D2492F',
  proteinSoft: '#F9E7E2',
  carbs: '#DD9A26',
  carbsSoft: '#F9F0DC',
  fat: '#4E7DE0',
  fatSoft: '#E6EDFB',
  ring: '#3E9B5F',
  ringTrack: '#EDEAE2',
  overlay: 'rgba(20, 18, 12, 0.45)',
  statusBar: 'dark' as const,
} as const;

export const DarkColors = {
  bg: '#07090A',
  card: '#101413',
  cardPressed: '#171D1B',
  ink: '#F1FFF4',
  inkSecondary: '#93A69B',
  inkMuted: '#5A6B62',
  hairline: '#1E2624',
  accent: '#39FF88',
  onAccent: '#04150B',
  green: '#39FF88',
  greenSoft: 'rgba(57, 255, 136, 0.14)',
  yellow: '#F4D35E',
  yellowSoft: 'rgba(244, 211, 94, 0.12)',
  orange: '#FF9E5E',
  orangeSoft: 'rgba(255, 158, 94, 0.12)',
  danger: '#FF5C6C',
  protein: '#FF6E5C',
  proteinSoft: 'rgba(255, 110, 92, 0.14)',
  carbs: '#F4D35E',
  carbsSoft: 'rgba(244, 211, 94, 0.14)',
  fat: '#5CC2FF',
  fatSoft: 'rgba(92, 194, 255, 0.14)',
  ring: '#39FF88',
  ringTrack: '#1B2320',
  overlay: 'rgba(0, 0, 0, 0.65)',
  statusBar: 'light' as const,
} as const;

export type ThemeColors = { [K in keyof typeof LightColors]: (typeof LightColors)[K] | (typeof DarkColors)[K] };

/** Reactive theme hook — follows the device's system appearance live. */
export function useColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DarkColors : LightColors;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

// Non-reactive fallback for the rare spot outside React (e.g. module-level
// defaults). Prefer `useColors()` inside components.
export const Colors = LightColors;

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

export function createShadow(colors: ThemeColors) {
  const dark = colors === DarkColors;
  return {
    card: {
      shadowColor: dark ? '#000000' : '#3E3005',
      shadowOpacity: dark ? 0.5 : 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    float: {
      shadowColor: '#000000',
      shadowOpacity: dark ? 0.6 : 0.18,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  } as const;
}

export function useShadow() {
  return createShadow(useColors());
}

// Kept for any leftover static import — matches the light values.
export const Shadow = createShadow(LightColors);

export function createType(colors: ThemeColors) {
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

export type TypeStyles = ReturnType<typeof createType>;

/** Reactive text-style hook — colors follow the current theme. */
export function useTypeStyles(colors?: ThemeColors): TypeStyles {
  const c = colors ?? useColors();
  return createType(c);
}

// Kept for any leftover static import — matches the light values.
export const Type = createType(LightColors);

export function createMacroMeta(colors: ThemeColors) {
  return {
    protein: { label: 'Protein', color: colors.protein, soft: colors.proteinSoft, icon: 'fish.fill' },
    carbs: { label: 'Carbs', color: colors.carbs, soft: colors.carbsSoft, icon: 'leaf.fill' },
    fat: { label: 'Fat', color: colors.fat, soft: colors.fatSoft, icon: 'drop.fill' },
  } as const;
}

export type MacroMetaType = ReturnType<typeof createMacroMeta>;

export function useMacroMeta(colors?: ThemeColors): MacroMetaType {
  const c = colors ?? useColors();
  return createMacroMeta(c);
}

// Kept for any leftover static import — matches the light values.
export const MacroMeta = createMacroMeta(LightColors);

export const isIOS = Platform.OS === 'ios';
