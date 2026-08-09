import { Platform } from 'react-native';

export const Colors = {
  bg: '#FAF8F4',
  card: '#FFFFFF',
  cardPressed: '#F4F1EA',
  ink: '#191712',
  inkSecondary: '#6E6857',
  inkMuted: '#A39C89',
  hairline: '#ECE8DF',
  accent: '#191712',
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
} as const;

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

export const Shadow = {
  card: {
    shadowColor: '#3E3005',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  float: {
    shadowColor: '#141105',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

export const Type = {
  display: {
    fontSize: 44,
    fontWeight: '800' as const,
    letterSpacing: -1.2,
    color: Colors.ink,
    fontVariant: ['tabular-nums'] as const,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
    color: Colors.ink,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    color: Colors.ink,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.ink,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.ink,
  },
  secondary: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.inkSecondary,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.inkSecondary,
  },
  micro: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    color: Colors.inkMuted,
  },
} as const;

export const MacroMeta = {
  protein: { label: 'Protein', color: Colors.protein, soft: Colors.proteinSoft, icon: 'fish.fill' },
  carbs: { label: 'Carbs', color: Colors.carbs, soft: Colors.carbsSoft, icon: 'leaf.fill' },
  fat: { label: 'Fat', color: Colors.fat, soft: Colors.fatSoft, icon: 'drop.fill' },
} as const;

export const isIOS = Platform.OS === 'ios';
