import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { ACTIVITY_LABELS, GOAL_LABELS } from '@/lib/nutrition';
import type { ActivityLevel, Profile, Sex, WeightGoal } from '@/lib/types';

const C = Colors.dark;

const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary: 'Desk job, little to no exercise',
  light: 'Walks or light exercise 1–3 days a week',
  moderate: 'Exercise 3–5 days a week',
  active: 'Hard exercise 6–7 days a week',
  very_active: 'Physical job plus daily training',
};

const RANGES = {
  age: { min: 13, max: 100, step: 1 },
  heightCm: { min: 120, max: 230, step: 1 },
  weightKg: { min: 35, max: 300, step: 1 },
} as const;

const ACTIVITIES = Object.keys(ACTIVITY_LABELS) as ActivityLevel[];
const GOALS = Object.keys(GOAL_LABELS) as WeightGoal[];

export default function StatsScreen() {
  const router = useRouter();

  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState(30);
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(75);
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<WeightGoal>('maintain');

  const valid =
    age >= RANGES.age.min &&
    age <= RANGES.age.max &&
    heightCm >= RANGES.heightCm.min &&
    heightCm <= RANGES.heightCm.max &&
    weightKg >= RANGES.weightKg.min &&
    weightKg <= RANGES.weightKg.max;

  const handleContinue = () => {
    if (!valid) return;
    const profile: Profile = { age, sex, heightCm, weightKg, activity, goal };
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      // Cast: expo-router typed routes (.expo/types) are not generated yet.
      pathname: '/plan' as any,
      params: { profile: JSON.stringify(profile) },
    });
  };

  const pick = (fn: () => void) => {
    void Haptics.selectionAsync();
    fn();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()}>
          <Text style={styles.headline}>About you</Text>
          <Text style={styles.subline}>
            We use this to calculate your daily calorie and macro targets.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={styles.sectionLabel}>Sex</Text>
          <View style={styles.segmented}>
            {(['male', 'female'] as Sex[]).map((s) => (
              <Pressable
                key={s}
                onPress={() => pick(() => setSex(s))}
                style={[styles.segment, sex === s && styles.segmentActive]}>
                <Text style={[styles.segmentText, sex === s && styles.segmentTextActive]}>
                  {s === 'male' ? 'Male' : 'Female'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.section}>
          <Stepper label="Age" unit="yrs" value={age} setValue={setAge} range={RANGES.age} />
          <View style={styles.stepperDivider} />
          <Stepper
            label="Height"
            unit="cm"
            value={heightCm}
            setValue={setHeightCm}
            range={RANGES.heightCm}
          />
          <View style={styles.stepperDivider} />
          <Stepper
            label="Weight"
            unit="kg"
            value={weightKg}
            setValue={setWeightKg}
            range={RANGES.weightKg}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).springify()} style={styles.section}>
          <Text style={styles.sectionLabel}>Activity level</Text>
          <View style={styles.cardList}>
            {ACTIVITIES.map((level) => {
              const selected = activity === level;
              return (
                <Pressable
                  key={level}
                  onPress={() => pick(() => setActivity(level))}
                  style={[styles.optionCard, selected && styles.optionCardActive]}>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, selected && styles.optionTitleActive]}>
                      {ACTIVITY_LABELS[level]}
                    </Text>
                    <Text style={styles.optionBody}>{ACTIVITY_DESCRIPTIONS[level]}</Text>
                  </View>
                  {selected ? (
                    <SymbolView name="checkmark.circle.fill" size={22} tintColor={C.tint} />
                  ) : (
                    <View style={styles.optionCircle} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(340).springify()} style={styles.section}>
          <Text style={styles.sectionLabel}>Goal</Text>
          <View style={styles.goalRow}>
            {GOALS.map((g) => {
              const selected = goal === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => pick(() => setGoal(g))}
                  style={[styles.goalCard, selected && styles.optionCardActive]}>
                  <Text style={[styles.goalText, selected && styles.optionTitleActive]}>
                    {GOAL_LABELS[g]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.ctaWrap}>
        <Pressable
          onPress={handleContinue}
          disabled={!valid}
          style={({ pressed }) => [
            styles.cta,
            (pressed || !valid) && styles.ctaPressed,
          ]}>
          <Text style={styles.ctaText}>Create my plan</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

interface StepperProps {
  label: string;
  unit: string;
  value: number;
  setValue: (v: number) => void;
  range: { min: number; max: number; step: number };
}

function Stepper({ label, unit, value, setValue, range }: StepperProps) {
  const adjust = (delta: number) => {
    const next = Math.min(range.max, Math.max(range.min, value + delta));
    if (next === value) return;
    void Haptics.selectionAsync();
    setValue(next);
  };

  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <StepperButton icon="minus" onPress={() => adjust(-range.step)} />
        <View style={styles.stepperValueWrap}>
          <Text style={styles.stepperValue}>{value}</Text>
          <Text style={styles.stepperUnit}>{unit}</Text>
        </View>
        <StepperButton icon="plus" onPress={() => adjust(range.step)} />
      </View>
    </View>
  );
}

function StepperButton({
  icon,
  onPress,
}: {
  icon: 'minus' | 'plus';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.stepperButton, pressed && { opacity: 0.6 }]}>
      <SymbolView name={icon} size={18} tintColor={C.text} weight="semibold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  headline: {
    fontSize: 36,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -1,
  },
  subline: {
    fontSize: 16,
    color: C.textSecondary,
    marginTop: Spacing.two,
    lineHeight: 22,
  },
  section: { gap: Spacing.two },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: Spacing.one,
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md - 4,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: C.backgroundSelected },
  segmentText: { fontSize: 16, fontWeight: '600', color: C.textSecondary },
  segmentTextActive: { color: C.tint },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.backgroundElement,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
  },
  stepperDivider: { height: 1, backgroundColor: C.border },
  stepperLabel: { fontSize: 17, fontWeight: '600', color: C.text },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: C.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueWrap: { flexDirection: 'row', alignItems: 'baseline', width: 84, justifyContent: 'center', gap: 3 },
  stepperValue: { fontSize: 26, fontWeight: '800', color: C.text },
  stepperUnit: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  cardList: { gap: Spacing.two },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  optionCardActive: { borderColor: C.tint, backgroundColor: C.backgroundSelected },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  optionTitleActive: { color: C.tint },
  optionBody: { fontSize: 13, color: C.textSecondary },
  optionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  goalRow: { flexDirection: 'row', gap: Spacing.two },
  goalCard: {
    flex: 1,
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingVertical: 16,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
  },
  goalText: { fontSize: 14, fontWeight: '700', color: C.text, textAlign: 'center' },
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
