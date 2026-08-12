import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ring } from '@/components/ring';
import { Button } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { Radius, Spacing, useTheme } from '@/lib/theme';

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { colors, macroMeta } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    haptic.tap();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.lg }]}>
      <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.heroCard}>
        <Ring size={150} strokeWidth={14} progress={0.72}>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.heroKcal}>1,586</Text>
            <Text style={styles.heroKcalLabel}>kcal today</Text>
          </View>
        </Ring>
        <View style={styles.heroMacros}>
          {(['protein', 'carbs', 'fat'] as const).map((key) => (
            <View key={key} style={styles.heroMacro}>
              <View style={[styles.heroChip, { backgroundColor: macroMeta[key].color }]} />
              <Text style={styles.heroMacroText}>{macroMeta[key].label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.scanBadge}>
          <SymbolView name="camera.fill" size={15} tintColor={colors.accentInk} />
          <Text style={styles.scanBadgeText}>Scanned in 3s</Text>
        </View>
      </Animated.View>

      <View style={styles.textBlock}>
        <Animated.Text entering={FadeInDown.duration(500).delay(250)} style={styles.title}>
          Calorie tracking,{'\n'}from a photo.
        </Animated.Text>
        <Animated.Text entering={FadeInDown.duration(500).delay(400)} style={styles.subtitle}>
          Point your camera at any meal and CalTrack logs the calories, protein, carbs and fat — instantly.
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.duration(500).delay(550)} style={styles.actions}>
        <Button title="Get Started" onPress={() => router.push('/(onboarding)/goal')} />
        <Button
          title="I already have an account"
          variant="ghost"
          onPress={() => router.push('/(auth)/sign-in')}
        />
      </Animated.View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: Spacing.screen,
  },
  heroCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: Radius.xl + 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    ...theme.shadow.card,
  },
  heroKcal: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
  },
  heroKcalLabel: {
    fontSize: 13,
    color: theme.colors.inkSecondary,
    fontWeight: '500',
  },
  heroMacros: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  heroMacro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroChip: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  heroMacroText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.inkSecondary,
  },
  scanBadge: {
    position: 'absolute',
    top: Spacing.xl,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accent,
    borderRadius: Radius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
    ...theme.shadow.float,
  },
  scanBadgeText: {
    color: theme.colors.accentInk,
    fontSize: 13,
    fontWeight: '600',
  },
  textBlock: {
    paddingTop: Spacing.xxl,
    gap: Spacing.md,
  },
  title: {
    ...theme.type.title,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
  },
  subtitle: {
    ...theme.type.secondary,
    fontSize: 16,
    lineHeight: 23,
  },
  actions: {
    paddingTop: Spacing.xl,
    gap: Spacing.xs,
  },
});
}
