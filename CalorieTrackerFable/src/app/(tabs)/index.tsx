import { useUser } from '@clerk/expo';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MacroBar } from '@/components/macro-bar';
import { MealCard } from '@/components/meal-card';
import { Ring } from '@/components/ring';
import { Card, SectionLabel } from '@/components/ui';
import { formatFriendlyDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { MEAL_TYPES, MealTypeMeta } from '@/lib/meal-type';
import { useApp } from '@/lib/store';
import { Colors, MacroMeta, Radius, Spacing, Type } from '@/lib/theme';
import type { Meal, MealType } from '@/lib/types';

export default function Today() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { goals, totals, todayMeals } = useApp();

  const left = Math.max(0, goals.calories - totals.calories);
  const over = Math.max(0, totals.calories - goals.calories);
  const firstName = user?.firstName ?? user?.emailAddresses[0]?.emailAddress.split('@')[0] ?? 'there';

  // Group today's meals by meal type (Breakfast/Lunch/Dinner/Snack/Other),
  // in a fixed, sensible order, skipping empty groups.
  const groups: { type: MealType; meals: Meal[] }[] = MEAL_TYPES.map((type) => ({
    type,
    meals: todayMeals.filter((m) => m.mealType === type),
  })).filter((g) => g.meals.length > 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.date}>{formatFriendlyDate(new Date())}</Text>
          <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
        </View>
        <Pressable
          onPress={() => {
            haptic.tap();
            router.push('/settings');
          }}
          hitSlop={8}
          style={styles.settingsButton}>
          <SymbolView name="gearshape.fill" size={19} tintColor={Colors.inkSecondary} />
        </Pressable>
      </View>

      <Animated.View entering={FadeInDown.duration(400)}>
        <Card style={styles.progressCard}>
          <View style={styles.ringRow}>
            <Ring size={132} strokeWidth={13} progress={goals.calories > 0 ? totals.calories / goals.calories : 0}>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.ringValue}>{Math.round(over > 0 ? over : left).toLocaleString()}</Text>
                <Text style={styles.ringLabel}>{over > 0 ? 'kcal over' : 'kcal left'}</Text>
              </View>
            </Ring>
            <View style={styles.ringStats}>
              <RingStat icon="fork.knife" label="Eaten" value={`${Math.round(totals.calories).toLocaleString()}`} />
              <View style={styles.ringStatDivider} />
              <RingStat icon="target" label="Goal" value={goals.calories.toLocaleString()} />
            </View>
          </View>
          <View style={styles.macros}>
            {(['protein', 'carbs', 'fat'] as const).map((key) => (
              <MacroBar
                key={key}
                label={MacroMeta[key].label}
                value={totals[key]}
                target={goals[key]}
                color={MacroMeta[key].color}
                softColor={MacroMeta[key].soft}
              />
            ))}
          </View>
        </Card>
      </Animated.View>

      <View style={styles.mealsSection}>
        <SectionLabel>Today's meals</SectionLabel>
        {todayMeals.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <Pressable
              onPress={() => {
                haptic.medium();
                router.push('/add-food');
              }}
              style={({ pressed }) => [styles.emptyCard, pressed && { opacity: 0.85 }]}>
              <View style={styles.emptyIcon}>
                <SymbolView name="camera.viewfinder" size={26} tintColor={Colors.ink} />
              </View>
              <Text style={styles.emptyTitle}>Nothing logged yet</Text>
              <Text style={styles.emptySubtitle}>Snap a photo of your next meal{'\n'}and we'll do the math.</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.mealsList}>
            {groups.map((group, gi) => {
              const meta = MealTypeMeta[group.type];
              const groupCalories = group.meals.reduce((sum, m) => sum + m.calories, 0);
              return (
                <View key={group.type} style={gi > 0 ? styles.mealGroup : undefined}>
                  <View style={styles.groupHeader}>
                    <View style={styles.groupHeaderLeft}>
                      <SymbolView name={meta.icon} size={13} tintColor={meta.color} />
                      <Text style={[styles.groupTitle, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <Text style={styles.groupKcal}>{Math.round(groupCalories)} kcal</Text>
                  </View>
                  <View style={styles.mealsList}>
                    {group.meals.map((meal, i) => (
                      <Animated.View key={meal.id} entering={FadeInDown.duration(350).delay(i * 60)}>
                        <MealCard meal={meal} onPress={() => router.push({ pathname: '/meal/[id]', params: { id: meal.id } })} />
                      </Animated.View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function RingStat({ icon, label, value }: { icon: React.ComponentProps<typeof SymbolView>['name']; label: string; value: string }) {
  return (
    <View style={styles.ringStat}>
      <View style={styles.ringStatHeader}>
        <SymbolView name={icon} size={13} tintColor={Colors.inkMuted} />
        <Text style={styles.ringStatLabel}>{label}</Text>
      </View>
      <Text style={styles.ringStatValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  date: {
    ...Type.micro,
    marginBottom: 2,
  },
  greeting: {
    ...Type.title,
    fontSize: 26,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    gap: Spacing.xl,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  ringValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
  },
  ringLabel: {
    fontSize: 12,
    color: Colors.inkSecondary,
    fontWeight: '500',
  },
  ringStats: {
    flex: 1,
    gap: Spacing.md,
  },
  ringStat: {
    gap: 2,
  },
  ringStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ringStatDivider: {
    height: 1,
    backgroundColor: Colors.hairline,
  },
  ringStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.inkMuted,
  },
  ringStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  macros: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  mealsSection: {
    marginTop: Spacing.xxl,
  },
  mealsList: {
    gap: Spacing.md,
  },
  mealGroup: {
    marginTop: Spacing.xl,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  groupKcal: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.inkMuted,
    fontVariant: ['tabular-nums'],
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingVertical: Spacing.xxl + 4,
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.inkSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
});
