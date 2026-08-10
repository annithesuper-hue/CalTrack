import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ring } from '@/components/ring';
import { Button, Card } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { computePlan } from '@/lib/nutrition';
import { draftProfile } from '@/lib/onboarding-draft';
import { useApp } from '@/lib/store';
import { Radius, Spacing, ThemeColors, useColors, useMacroMeta, useTypeStyles } from '@/lib/theme';

export default function Plan() {
  const insets = useSafeAreaInsets();
  const { saveProfile, saveGoals } = useApp();
  const colors = useColors();
  const Type = useTypeStyles(colors);
  const MacroMeta = useMacroMeta(colors);
  const styles = useMemo(() => createStyles(colors, Type), [colors, Type]);
  const [revealed, setRevealed] = useState(false);
  const profile = useMemo(() => draftProfile(), []);
  const plan = useMemo(() => computePlan(profile), [profile]);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveProfile(profile);
      saveGoals(plan);
      setRevealed(true);
      haptic.success();
    }, 1400);
    return () => clearTimeout(timer);
  }, [profile, plan, saveProfile, saveGoals]);

  if (!revealed) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.ink} />
        <Animated.Text entering={FadeIn} style={styles.loadingText}>
          Building your personal plan…
        </Animated.Text>
      </View>
    );
  }

  const goalLabel =
    profile.goalType === 'lose' ? 'lose weight' : profile.goalType === 'gain' ? 'build muscle' : 'maintain';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing.md }]}>
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.textBlock}>
          <Text style={Type.title}>Your daily plan is ready</Text>
          <Text style={styles.subtitle}>
            Calibrated for your body and your goal to {goalLabel}. You can fine-tune it anytime.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(450).delay(150)}>
          <Card style={styles.calorieCard}>
            <Ring size={140} strokeWidth={13} progress={1}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.calorieValue}>{plan.calories.toLocaleString()}</Text>
                <Text style={styles.calorieUnit}>kcal / day</Text>
              </View>
            </Ring>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(450).delay(300)} style={styles.macroRow}>
          {(['protein', 'carbs', 'fat'] as const).map((key) => (
            <Card key={key} style={styles.macroCard}>
              <View style={[styles.macroChip, { backgroundColor: MacroMeta[key].color }]} />
              <Text style={styles.macroValue}>{plan[key]}g</Text>
              <Text style={styles.macroLabel}>{MacroMeta[key].label}</Text>
            </Card>
          ))}
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.duration(450).delay(450)}>
        <Button title="Create my account" onPress={() => router.push('/(auth)/sign-up')} />
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ThemeColors, Type: ReturnType<typeof useTypeStyles>) =>
  StyleSheet.create({
    loadingWrap: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.lg,
    },
    loadingText: {
      ...Type.secondary,
      fontWeight: '500',
    },
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: Spacing.screen,
    },
    content: {
      flex: 1,
      paddingTop: Spacing.xl,
    },
    textBlock: {
      gap: Spacing.sm,
      marginBottom: Spacing.xl,
    },
    subtitle: {
      ...Type.secondary,
      lineHeight: 22,
    },
    calorieCard: {
      alignItems: 'center',
      paddingVertical: Spacing.xxl,
    },
    calorieValue: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.ink,
      fontVariant: ['tabular-nums'],
      letterSpacing: -1,
    },
    calorieUnit: {
      fontSize: 13,
      color: colors.inkSecondary,
      fontWeight: '500',
    },
    macroRow: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginTop: Spacing.md,
    },
    macroCard: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.lg,
    },
    macroChip: {
      width: 12,
      height: 12,
      borderRadius: 4,
      marginBottom: 2,
    },
    macroValue: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.ink,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.4,
    },
    macroLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.inkSecondary,
    },
  });
