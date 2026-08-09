import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getHealthSignal, HealthLevelMeta } from '@/lib/health-signal';
import type { MacroSet } from '@/lib/types';

/**
 * Small colored dot + label ("Balanced" / "Moderate" / "High oil" / "High
 * fat"). Deliberately tiny — this is a glance-and-go indicator, not a
 * headline. Renders nothing if there isn't enough data to say anything
 * useful, so it never shows a misleading default.
 */
export function HealthBadge({ macros, size = 'sm' }: { macros: MacroSet; size?: 'sm' | 'md' }) {
  const signal = getHealthSignal(macros);
  if (!signal) return null;
  const meta = HealthLevelMeta[signal.level];
  const isMd = size === 'md';

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: meta.soft },
        isMd && styles.wrapMd,
      ]}>
      <View style={[styles.dot, { backgroundColor: meta.color }, isMd && styles.dotMd]} />
      <Text style={[styles.text, { color: meta.color }, isMd && styles.textMd]}>{signal.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  wrapMd: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotMd: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  textMd: {
    fontSize: 12.5,
  },
});
