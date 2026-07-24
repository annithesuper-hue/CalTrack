import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { goalsFromProfile } from '@/lib/nutrition';
import { useApp } from '@/lib/store';
import type { Profile } from '@/lib/types';

const C = Colors.dark;

const DEFAULT_PROFILE: Profile = {
  age: 30,
  sex: 'male',
  heightCm: 175,
  weightKg: 75,
  activity: 'moderate',
  goal: 'maintain',
};

function parseProfile(raw: string | string[] | undefined): Profile {
  try {
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(value) as Partial<Profile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export default function PlanScreen() {
  const router = useRouter();
  const { completeOnboarding } = useApp();
  const params = useLocalSearchParams<{ profile?: string }>();
  const profile = useMemo(() => parseProfile(params.profile), [params.profile]);
  const goals = useMemo(() => goalsFromProfile(profile), [profile]);

  const [saving, setSaving] = useState(false);
  const calories = useCountUp(goals.calories);

  const handleContinue = async () => {
    if (saving) return;
    setSaving(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await completeOnboarding(profile);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Cast: expo-router typed routes (.expo/types) are not generated yet.
      router.replace('/(auth)/sign-up' as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <View style={styles.badge}>
            <SymbolView name="sparkles" size={18} tintColor={C.background} />
          </View>
          <Text style={styles.headline}>Your personalized plan is ready</Text>
          <Text style={styles.subline}>
            Built from your stats. Adjust it anytime in settings.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.calorieCard}>
          <Text style={styles.calorieValue}>{calories.toLocaleString()}</Text>
          <Text style={styles.calorieUnit}>kcal / day</Text>
          <Text style={styles.calorieCaption}>Your daily calorie target</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.macroRow}>
          <MacroCard label="Protein" grams={goals.protein} color={C.protein} />
          <MacroCard label="Carbs" grams={goals.carbs} color={C.carbs} />
          <MacroCard label="Fat" grams={goals.fat} color={C.fat} />
        </Animated.View>
      </ScrollView>

      <View style={styles.ctaWrap}>
        <Pressable
          onPress={() => void handleContinue()}
          disabled={saving}
          style={({ pressed }) => [styles.cta, (pressed || saving) && styles.ctaPressed]}>
          <Text style={styles.ctaText}>{saving ? 'Saving…' : 'Continue'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function MacroCard({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <View style={styles.macroCard}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={[styles.macroValue, { color }]}>{grams}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

/** Simple rAF count-up from 0 to target over ~900ms. */
function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 900;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target]);

  return value;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  header: { alignItems: 'center', gap: Spacing.two },
  badge: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  headline: {
    fontSize: 30,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subline: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  calorieCard: {
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: Spacing.five,
    alignItems: 'center',
    gap: Spacing.half,
  },
  calorieValue: {
    fontSize: 72,
    fontWeight: '900',
    color: C.tint,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  calorieUnit: { fontSize: 18, fontWeight: '700', color: C.text },
  calorieCaption: { fontSize: 14, color: C.textSecondary, marginTop: Spacing.two },
  macroRow: { flexDirection: 'row', gap: Spacing.two },
  macroCard: {
    flex: 1,
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginBottom: Spacing.one },
  macroValue: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  macroLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  ctaWrap: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    paddingTop: Spacing.two,
  },
  cta: {
    backgroundColor: C.tint,
    borderRadius: Radius.full,
    paddingVertical: 19,
    alignItems: 'center',
  },
  ctaPressed: { opacity: 0.7 },
  ctaText: { color: C.background, fontSize: 18, fontWeight: '800' },
});
