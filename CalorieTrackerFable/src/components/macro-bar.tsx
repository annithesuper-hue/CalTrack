import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Radius, useTheme, type Theme } from '@/lib/theme';

type MacroBarProps = {
  label: string;
  value: number;
  target: number;
  color: string;
  softColor: string;
};

/** Labeled horizontal progress bar for one macro. */
export function MacroBar({ label, value, target, color, softColor }: MacroBarProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const fraction = Math.min(1, target > 0 ? value / target : 0);
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withSpring(fraction, { damping: 20, stiffness: 90 });
  }, [fraction, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.labelText} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.valueText} numberOfLines={1}>
          <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>{Math.round(value)}</Text>
          <Text style={{ color: theme.colors.inkMuted }}>/{target}g</Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: softColor }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  const { colors } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      gap: 6,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 4,
    },
    labelText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.inkSecondary,
      flexShrink: 1,
    },
    valueText: {
      fontSize: 12,
      fontVariant: ['tabular-nums'],
    },
    track: {
      height: 8,
      borderRadius: Radius.full,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: Radius.full,
    },
  });
}
