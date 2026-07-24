import { useUser } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Card,
  MacroProgress,
  PrimaryButton,
  ProgressRing,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { colors, radius } from '@/constants/design';
import { timeLabel } from '@/lib/date';
import { useApp } from '@/providers/app-provider';
import { startNutritionLiveActivity } from '@/widgets/calorie-widget';

export default function TodayScreen() {
  const { user } = useUser();
  const { goals, totals, todayMeals } = useApp();
  const firstName = user?.firstName ?? 'there';
  const remaining = Math.max(goals.calories - totals.calories, 0);
  const progress = totals.calories / Math.max(goals.calories, 1);
  const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'long' })
    .format(new Date())
    .toUpperCase();

  const startLive = () => {
    startNutritionLiveActivity(totals, goals);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="caption" color={colors.inkMuted}>{todayLabel} · TODAY</AppText>
          <AppText variant="title">Hi, {firstName}</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Start Live Activity" onPress={startLive}>
          <View style={styles.liveButton}>
            <View style={styles.liveDot} />
            <AppText variant="caption">LIVE</AppText>
          </View>
        </Pressable>
      </View>

      <Card dark style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <AppText variant="eyebrow" color={colors.lime}>DAILY ENERGY</AppText>
            <AppText variant="caption" color="#A8B2AA">Keep the rhythm, not perfection.</AppText>
          </View>
          <SymbolView name="bolt.heart.fill" size={27} tintColor={colors.lime} />
        </View>
        <ProgressRing value={progress}>
          <AppText variant="hero" color={colors.white}>{remaining}</AppText>
          <AppText variant="caption" color="#A8B2AA">kcal left</AppText>
          <AppText variant="caption" color={colors.white}>{totals.calories} eaten</AppText>
        </ProgressRing>
        <View style={styles.macroRow}>
          <MacroProgress label="Protein" value={totals.protein} goal={goals.protein} color={colors.lime} />
          <MacroProgress label="Carbs" value={totals.carbs} goal={goals.carbs} color={colors.blue} />
          <MacroProgress label="Fat" value={totals.fat} goal={goals.fat} color={colors.orange} />
        </View>
      </Card>

      <PrimaryButton
        label="Scan a meal"
        icon="camera.fill"
        tone="lime"
        onPress={() => router.push('/camera')}
        testID="scan-meal"
      />

      <SectionHeader
        title="Today’s meals"
        action="Edit goals"
        onAction={() => router.push('/goals')}
      />
      {todayMeals.length ? (
        <View style={styles.meals}>
          {todayMeals.map((meal) => (
            <Card key={meal.id} style={styles.mealCard}>
              {meal.imageUri ? (
                <Image source={{ uri: meal.imageUri }} style={styles.mealImage} contentFit="cover" />
              ) : (
                <View style={styles.mealImageFallback}>
                  <SymbolView name="fork.knife" size={23} tintColor={colors.ink} />
                </View>
              )}
              <View style={styles.mealBody}>
                <View style={styles.mealTitle}>
                  <AppText variant="label" numberOfLines={1}>{meal.name}</AppText>
                  <AppText variant="caption" color={colors.inkMuted}>{timeLabel(meal.eatenAt)}</AppText>
                </View>
                <AppText variant="caption" color={colors.inkMuted} numberOfLines={1}>
                  {meal.protein}g P · {meal.carbs}g C · {meal.fat}g F
                </AppText>
              </View>
              <AppText variant="heading">{meal.calories}</AppText>
            </Card>
          ))}
        </View>
      ) : (
        <Card style={styles.empty}>
          <View style={styles.emptyIcon}>
            <SymbolView name="camera.macro" size={27} tintColor={colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label">Your first meal starts here</AppText>
            <AppText variant="caption" color={colors.inkMuted}>
              Take a photo and review the estimate in seconds.
            </AppText>
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  hero: { alignItems: 'center', gap: 21, padding: 22 },
  heroTop: { width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
  macroRow: { width: '100%', flexDirection: 'row', gap: 12 },
  meals: { gap: 10 },
  mealCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  mealImage: { width: 56, height: 56, borderRadius: 17, backgroundColor: colors.surfaceSoft },
  mealImageFallback: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F8D9',
  },
  mealBody: { flex: 1, gap: 5 },
  mealTitle: { gap: 2 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lime,
  },
});
