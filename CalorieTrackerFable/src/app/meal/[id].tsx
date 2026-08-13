import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NutrientField } from '@/components/nutrient-field';
import { Button } from '@/components/ui';
import { HealthBadge } from '@/components/health-badge';
import { MealTypePicker } from '@/components/meal-type-picker';
import { getMeal } from '@/lib/db';
import { formatFriendlyDate, formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/lib/store';
import { Radius, Spacing, useTheme, type Theme } from '@/lib/theme';

export default function MealDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { editMeal, removeMeal } = useApp();
  const original = useMemo(() => getMeal(id), [id]);
  const [meal, setMeal] = useState(original);
  const theme = useTheme();
  const { colors, macroMeta } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!meal || !original) {
    return (
      <View style={styles.missingWrap}>
        <Text style={theme.type.secondary}>This meal is gone.</Text>
      </View>
    );
  }

  const dirty =
    meal.name !== original.name ||
    meal.calories !== original.calories ||
    meal.protein !== original.protein ||
    meal.carbs !== original.carbs ||
    meal.fat !== original.fat ||
    meal.fiber !== original.fiber ||
    meal.mealType !== original.mealType ||
    meal.note !== original.note;

  const save = () => {
    editMeal(meal);
    haptic.success();
    router.back();
  };

  const confirmDelete = () => {
    haptic.warning();
    Alert.alert('Delete this meal?', 'This removes it from your log.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeMeal(meal.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.grabber} />
        {meal.photoUri ? (
          <Image source={{ uri: meal.photoUri }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={styles.emojiHero}>
            <Text style={{ fontSize: 64 }}>{meal.emoji}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.nameRow}>
            <Text style={styles.emoji}>{meal.emoji}</Text>
            <TextInput
              style={styles.nameInput}
              value={meal.name}
              onChangeText={(name) => setMeal({ ...meal, name })}
            />
            <SymbolView name="pencil" size={16} tintColor={colors.inkMuted} />
          </View>
          <Text style={styles.timestamp}>
            {formatFriendlyDate(new Date(meal.createdAt))} · {formatTime(meal.createdAt)}
            {meal.note ? ` · ${meal.note}` : ''}
          </Text>
          <View style={styles.badgeRow}>
            <HealthBadge macros={meal} size="md" />
          </View>

          <View style={styles.mealTypeWrap}>
            <MealTypePicker value={meal.mealType} onChange={(mealType) => setMeal({ ...meal, mealType })} />
          </View>

          <View style={styles.divider} />
          <NutrientField
            label="Calories"
            value={meal.calories}
            unit="kcal"
            step={10}
            color={colors.ink}
            onChange={(calories) => setMeal({ ...meal, calories })}
          />
          <NutrientField
            label="Protein"
            value={meal.protein}
            unit="g"
            step={5}
            color={macroMeta.protein.color}
            onChange={(protein) => setMeal({ ...meal, protein })}
          />
          <NutrientField
            label="Carbs"
            value={meal.carbs}
            unit="g"
            step={5}
            color={macroMeta.carbs.color}
            onChange={(carbs) => setMeal({ ...meal, carbs })}
          />
          <NutrientField
            label="Fat"
            value={meal.fat}
            unit="g"
            step={5}
            color={macroMeta.fat.color}
            onChange={(fat) => setMeal({ ...meal, fat })}
          />
          <NutrientField
            label="Fiber"
            value={meal.fiber ?? 0}
            unit="g"
            step={1}
            color={colors.green}
            onChange={(fiber) => setMeal({ ...meal, fiber })}
          />
        </View>

        <Pressable onPress={confirmDelete} style={styles.deleteRow}>
          <SymbolView name="trash" size={16} tintColor={colors.danger} />
          <Text style={styles.deleteText}>Delete meal</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Button title={dirty ? 'Save Changes' : 'Done'} onPress={dirty ? save : () => router.back()} />
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  missingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg,
  },
  content: {
    paddingHorizontal: Spacing.screen,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.ringTrack,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: Radius.xl,
  },
  emojiHero: {
    width: '100%',
    height: 160,
    borderRadius: Radius.xl,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.lg,
    ...theme.shadow.card,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 28,
  },
  nameInput: {
    flex: 1,
    ...theme.type.heading,
    padding: 0,
  },
  timestamp: {
    fontSize: 13,
    color: theme.colors.inkMuted,
    marginTop: 6,
  },
  badgeRow: {
    marginTop: Spacing.sm,
  },
  mealTypeWrap: {
    marginTop: Spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.hairline,
    marginVertical: Spacing.md,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    backgroundColor: theme.colors.bg,
  },
});
}
