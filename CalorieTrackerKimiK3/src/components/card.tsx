import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

const C = Colors.dark;

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Inner padding, defaults to 16. Pass 0 for full-bleed content. */
  padding?: number;
}

/** Themed rounded container used across all screens. */
export function Card({ children, style, padding = Spacing.three }: CardProps) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
});
