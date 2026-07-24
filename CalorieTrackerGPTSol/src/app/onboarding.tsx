import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Field, PrimaryButton, Screen } from '@/components/ui';
import { colors, radius } from '@/constants/design';
import { DEFAULT_GOALS, type Goals } from '@/lib/types';

const goalPresets: Array<{
  id: string;
  title: string;
  subtitle: string;
  icon: 'flame.fill' | 'equal.circle.fill' | 'dumbbell.fill';
  goals: Goals;
}> = [
  {
    id: 'lose',
    title: 'Lose weight',
    subtitle: 'A steady, sustainable deficit',
    icon: 'flame.fill',
    goals: { calories: 1850, protein: 145, carbs: 175, fat: 62 },
  },
  {
    id: 'maintain',
    title: 'Maintain',
    subtitle: 'Balanced energy and consistency',
    icon: 'equal.circle.fill',
    goals: DEFAULT_GOALS,
  },
  {
    id: 'build',
    title: 'Build muscle',
    subtitle: 'More fuel, protein and recovery',
    icon: 'dumbbell.fill',
    goals: { calories: 2550, protein: 180, carbs: 290, fat: 78 },
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState('maintain');
  const preset = useMemo(
    () => goalPresets.find((goal) => goal.id === selectedGoal) ?? goalPresets[1],
    [selectedGoal]
  );
  const [goals, setGoals] = useState(DEFAULT_GOALS);

  const advance = () => {
    Haptics.selectionAsync();
    if (step === 1) setGoals(preset.goals);
    if (step === 3) {
      router.push({ pathname: '/paywall', params: { onboarding: '1', goals: JSON.stringify(goals) } });
      return;
    }
    setStep((current) => current + 1);
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.top}>
        <View style={styles.logo}>
          <AppText variant="label" color={colors.lime}>C</AppText>
        </View>
        <View style={styles.dots}>
          {[0, 1, 2, 3].map((item) => (
            <View key={item} style={[styles.dot, item <= step && styles.dotActive]} />
          ))}
        </View>
        <AppText variant="caption" color={colors.inkMuted}>{step + 1}/4</AppText>
      </View>

      {step === 0 ? <Welcome /> : null}
      {step === 1 ? (
        <View style={styles.content}>
          <View style={styles.copy}>
            <AppText variant="eyebrow" color={colors.limeDark}>PERSONALIZE</AppText>
            <AppText variant="title">What are we working toward?</AppText>
            <AppText color={colors.inkMuted}>Your targets will adapt to the outcome you care about.</AppText>
          </View>
          <View style={styles.options}>
            {goalPresets.map((goal) => {
              const selected = selectedGoal === goal.id;
              return (
                <Pressable
                  key={goal.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={goal.title}
                  onPress={() => {
                    setSelectedGoal(goal.id);
                    Haptics.selectionAsync();
                  }}
                  style={[styles.goalOption, selected && styles.goalOptionSelected]}>
                  <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                    <SymbolView name={goal.icon} size={23} tintColor={colors.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="label">{goal.title}</AppText>
                    <AppText variant="caption" color={colors.inkMuted}>{goal.subtitle}</AppText>
                  </View>
                  <View style={[styles.radio, selected && styles.radioSelected]} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {step === 2 ? (
        <View style={styles.content}>
          <View style={styles.copy}>
            <AppText variant="eyebrow" color={colors.limeDark}>YOUR DAILY PLAN</AppText>
            <AppText variant="title">Targets built for real life.</AppText>
            <AppText color={colors.inkMuted}>You can change these anytime as your routine evolves.</AppText>
          </View>
          <Card style={styles.goalCard}>
            <Field
              label="Calories"
              value={String(goals.calories)}
              onChangeText={(value) => setGoals({ ...goals, calories: Number(value) || 0 })}
              keyboardType="number-pad"
              suffix="kcal"
            />
            <View style={styles.goalRow}>
              {(['protein', 'carbs', 'fat'] as const).map((macro) => (
                <View key={macro} style={{ flex: 1 }}>
                  <Field
                    label={macro[0].toUpperCase() + macro.slice(1)}
                    value={String(goals[macro])}
                    onChangeText={(value) => setGoals({ ...goals, [macro]: Number(value) || 0 })}
                    keyboardType="number-pad"
                    suffix="g"
                  />
                </View>
              ))}
            </View>
          </Card>
          <View style={styles.note}>
            <SymbolView name="sparkles" size={18} tintColor={colors.limeDark} />
            <AppText variant="caption" color={colors.inkMuted}>
              CalTrack focuses on consistency, not perfect numbers.
            </AppText>
          </View>
        </View>
      ) : null}
      {step === 3 ? <Proof /> : null}

      <View style={styles.bottom}>
        <PrimaryButton
          label={step === 0 ? 'Build my plan' : step === 3 ? 'See my plan' : 'Continue'}
          onPress={advance}
          tone={step === 0 || step === 3 ? 'lime' : 'dark'}
          testID="onboarding-continue"
        />
        <AppText variant="caption" color={colors.inkMuted} style={{ textAlign: 'center' }}>
          {step === 3 ? 'Personalized in under 2 minutes' : 'Your data stays on this device'}
        </AppText>
      </View>
    </Screen>
  );
}

function Welcome() {
  return (
    <View style={styles.content}>
      <LinearGradient colors={['#D9FFA8', '#A7E86B']} style={styles.heroVisual}>
        <View style={styles.scanFrame}>
          <View style={styles.plate}>
            <View style={[styles.food, { width: 75, backgroundColor: '#F5C55B' }]} />
            <View style={[styles.food, { width: 57, backgroundColor: '#65A66A' }]} />
            <View style={[styles.food, { width: 64, backgroundColor: '#FF855E' }]} />
          </View>
          <Card style={styles.floatingResult}>
            <View style={styles.resultTop}>
              <View>
                <AppText variant="caption" color={colors.inkMuted}>CHICKEN POWER BOWL</AppText>
                <AppText variant="number">684 kcal</AppText>
              </View>
              <SymbolView name="checkmark.seal.fill" size={26} tintColor={colors.limeDark} />
            </View>
            <AppText variant="caption" color={colors.inkMuted}>48g protein · 71g carbs · 23g fat</AppText>
          </Card>
        </View>
      </LinearGradient>
      <View style={styles.copy}>
        <AppText variant="eyebrow" color={colors.limeDark}>MEET CALTRACK</AppText>
        <AppText variant="hero">A photo is all it takes.</AppText>
        <AppText color={colors.inkMuted}>
          Point, snap, and get a calorie and macro estimate you can review before saving.
        </AppText>
      </View>
    </View>
  );
}

function Proof() {
  return (
    <View style={styles.content}>
      <View style={styles.copy}>
        <AppText variant="eyebrow" color={colors.limeDark}>BUILT TO STICK</AppText>
        <AppText variant="title">Less friction. More awareness.</AppText>
        <AppText color={colors.inkMuted}>
          The best nutrition plan is the one simple enough to use every day.
        </AppText>
      </View>
      <Card dark style={styles.proofCard}>
        <View style={styles.stars}>
          {[0, 1, 2, 3, 4].map((star) => (
            <SymbolView key={star} name="star.fill" size={18} tintColor={colors.lime} />
          ))}
        </View>
        <AppText variant="heading" color={colors.white}>
          “I finally stopped guessing what was on my plate.”
        </AppText>
        <AppText variant="caption" color="#AAB4AC">— Early CalTrack member</AppText>
      </Card>
      <View style={styles.features}>
        {[
          ['camera.metering.center.weighted', 'AI meal scans', 'Calories and macros from one photo'],
          ['chart.xyaxis.line', 'Readable trends', 'See progress without spreadsheet clutter'],
          ['heart.fill', 'Apple Health', 'Keep nutrition alongside the rest of your health'],
        ].map(([icon, title, detail]) => (
          <View key={title} style={styles.feature}>
            <View style={styles.featureIcon}>
              <SymbolView name={icon as 'heart.fill'} size={21} tintColor={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label">{title}</AppText>
              <AppText variant="caption" color={colors.inkMuted}>{detail}</AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 6, width: 18, borderRadius: 3, backgroundColor: colors.line },
  dotActive: { backgroundColor: colors.ink },
  content: { flex: 1, justifyContent: 'center', gap: 24 },
  copy: { gap: 10 },
  heroVisual: {
    height: 310,
    borderRadius: radius.xl,
    padding: 18,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scanFrame: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(24,37,29,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plate: {
    width: 178,
    height: 178,
    borderRadius: 89,
    backgroundColor: '#FFFDF2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    transform: [{ rotate: '-8deg' }],
  },
  food: { height: 34, borderRadius: 17 },
  floatingResult: { position: 'absolute', left: 12, right: 12, bottom: -10, padding: 15 },
  resultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  options: { gap: 12 },
  goalOption: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    padding: 15,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  goalOptionSelected: { borderColor: colors.ink, backgroundColor: '#F2FAE9' },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: { backgroundColor: colors.lime },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line },
  radioSelected: { borderWidth: 6, borderColor: colors.ink, backgroundColor: colors.lime },
  goalCard: { gap: 16 },
  goalRow: { flexDirection: 'row', gap: 9 },
  note: { flexDirection: 'row', gap: 9, alignItems: 'center', paddingHorizontal: 10 },
  proofCard: { gap: 18, padding: 24 },
  stars: { flexDirection: 'row', gap: 5 },
  features: { gap: 16 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { gap: 12 },
});

