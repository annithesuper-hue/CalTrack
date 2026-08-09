import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HealthBadge } from '@/components/health-badge';
import { haptic } from '@/lib/haptics';
import { MealTypeMeta } from '@/lib/meal-type';
import { Colors, MacroMeta, Radius, Shadow, Spacing } from '@/lib/theme';
import type { Meal } from '@/lib/types';
import { formatTime } from '@/lib/dates';

export function MealCard({ meal, onPress }: { meal: Meal; onPress?: () => void }) {
  const mealTypeMeta = MealTypeMeta[meal.mealType];
  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          haptic.select();
          onPress();
        }
      }}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: Colors.cardPressed }]}>
      {meal.photoUri ? (
        <Image source={{ uri: meal.photoUri }} style={styles.photo} contentFit="cover" transition={150} />
      ) : (
        <View style={styles.emojiWrap}>
          <Text style={styles.emoji}>{meal.emoji}</Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.nameLine}>
          <Text style={styles.name} numberOfLines={1}>
            {meal.name}
          </Text>
          <HealthBadge macros={meal} />
        </View>
        <View style={styles.macroRow}>
          <View style={styles.mealTypeTag}>
            <SymbolView name={mealTypeMeta.icon} size={10} tintColor={mealTypeMeta.color} />
            <Text style={[styles.mealTypeText, { color: mealTypeMeta.color }]}>{mealTypeMeta.label}</Text>
          </View>
          <Text style={styles.time}>{formatTime(meal.createdAt)}</Text>
          <MacroDot color={MacroMeta.protein.color} value={meal.protein} />
          <MacroDot color={MacroMeta.carbs.color} value={meal.carbs} />
          <MacroDot color={MacroMeta.fat.color} value={meal.fat} />
        </View>
      </View>
      <View style={styles.kcalWrap}>
        <Text style={styles.kcal}>{meal.calories}</Text>
        <Text style={styles.kcalUnit}>kcal</Text>
      </View>
    </Pressable>
  );
}

function MacroDot({ color, value }: { color: string; value: number }) {
  return (
    <View style={styles.dotGroup}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.dotText}>{Math.round(value)}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.card,
  },
  photo: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
  },
  emojiWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 26,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.ink,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mealTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  mealTypeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    color: Colors.inkMuted,
    fontVariant: ['tabular-nums'],
  },
  dotGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotText: {
    fontSize: 12,
    color: Colors.inkSecondary,
    fontVariant: ['tabular-nums'],
  },
  kcalWrap: {
    alignItems: 'flex-end',
  },
  kcal: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  kcalUnit: {
    fontSize: 11,
    color: Colors.inkMuted,
    fontWeight: '500',
  },
});
