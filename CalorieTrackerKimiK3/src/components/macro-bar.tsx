import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

const C = Colors.dark;

interface MacroBarProps {
  label: string;
  /** Consumed grams. */
  value: number;
  /** Goal grams. */
  goal: number;
  color: string;
}

/** Rounded macro progress bar: label, "value / goal g" and a colored fill. */
export function MacroBar({ label, value, goal, color }: MacroBarProps) {
  const ratio = goal > 0 ? Math.min(value / goal, 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.values}>
          <Text style={[styles.value, { color }]}>{Math.round(value)}</Text>
          <Text style={styles.goal}> / {Math.round(goal)} g</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  values: {
    color: C.textSecondary,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
  },
  goal: {
    color: C.textSecondary,
    fontSize: 13,
  },
  track: {
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: C.backgroundSelected,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: Radius.full,
  },
});
