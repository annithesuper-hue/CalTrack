import '@/global.css';

/**
 * CalTrack design system. The app ships dark-first ("premium dark" look);
 * a light palette is provided for completeness and used when the system is in light mode.
 */

export const Colors = {
  light: {
    text: '#101418',
    background: '#F6F7F4',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E7EAE2',
    textSecondary: '#5C6470',
    tint: '#4C7A12',
    accent: '#8FD43A',
    border: '#E0E4DA',
    danger: '#E5484D',
    protein: '#E86A5C',
    carbs: '#E9B44C',
    fat: '#5BA8E8',
  },
  dark: {
    text: '#F4F6F1',
    background: '#101418',
    backgroundElement: '#1A1F26',
    backgroundSelected: '#232A33',
    textSecondary: '#8B94A1',
    tint: '#B6F04A',
    accent: '#B6F04A',
    border: '#262E38',
    danger: '#F2555A',
    protein: '#FF8A75',
    carbs: '#FFCE54',
    fat: '#6EC1FF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Macros = {
  protein: { key: 'protein', label: 'Protein', unit: 'g' },
  carbs: { key: 'carbs', label: 'Carbs', unit: 'g' },
  fat: { key: 'fat', label: 'Fat', unit: 'g' },
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  full: 999,
} as const;

export const BottomTabInset = 50;
export const MaxContentWidth = 800;
