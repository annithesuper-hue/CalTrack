import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useMemo, useState } from 'react';
import {
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
import { haptic } from '@/lib/haptics';
import { inferMealTypeFromHour } from '@/lib/meal-type';
import { useApp } from '@/lib/store';
import { Radius, Spacing, useTheme, type Theme } from '@/lib/theme';
import type { MealType } from '@/lib/types';

export default function ManualEntry() {
  const insets = useSafeAreaInsets();
  const { logMeal, editMeal } = useApp();
  const theme = useTheme();
  const { colors, macroMeta } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [name, setName] = useState('');
  const [servingNote, setServingNote] = useState('');
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [fiber, setFiber] = useState(0);
  const [mealType, setMealType] = useState<MealType>(() => inferMealTypeFromHour());

  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    haptic.tap();
    const meal = logMeal(
      {
        name: name.trim(),
        emoji: '🍽️',
        calories,
        protein,
        carbs,
        fat,
        fiber,
        confidence: 'high',
        items: [],
      },
      null,
      mealType,
    );
    // Custom foods use the same meal/nutrition system as photo scans & search
    // entries, so they show up in Today's meals and History immediately.
    if (servingNote.trim()) {
      editMeal({ ...meal, note: servingNote.trim() });
    }
    router.back();
  };

  const close = () => {
    haptic.tap();
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Manually</Text>
          <Pressable onPress={close} hitSlop={10} style={styles.closeButton}>
            <SymbolView name="xmark" size={15} tintColor={colors.ink} weight="semibold" />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Food name</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Homemade chili"
            placeholderTextColor={colors.inkMuted}
            autoFocus
          />

          <Text style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>Serving size (optional)</Text>
          <TextInput
            style={styles.nameInput}
            value={servingNote}
            onChangeText={setServingNote}
            placeholder="e.g. 1 bowl, 250g"
            placeholderTextColor={colors.inkMuted}
          />

          <View style={styles.fieldsDivider} />

          <NutrientField label="Calories" value={calories} unit="kcal" step={10} color={colors.ink} onChange={setCalories} />
          <NutrientField label="Protein" value={protein} unit="g" step={5} color={theme.macroMeta.protein.color} onChange={setProtein} />
          <NutrientField label="Carbs" value={carbs} unit="g" step={5} color={theme.macroMeta.carbs.color} onChange={setCarbs} />
          <NutrientField label="Fat" value={fat} unit="g" step={5} color={theme.macroMeta.fat.color} onChange={setFat} />
          <NutrientField label="Fiber" value={fiber} unit="g" step={1} color={colors.green} onChange={setFiber} />

          <View style={styles.badgeRow}>
            <HealthBadge macros={{ calories, protein, carbs, fat }} />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>Meal type</Text>
          <MealTypePicker value={mealType} onChange={setMealType} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Button title="Log Food" onPress={save} disabled={!canSave} style={{ flex: 1 }} />
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
  content: {
    paddingHorizontal: Spacing.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  title: {
    ...theme.type.title,
    fontSize: 24,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...theme.shadow.card,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  nameInput: {
    ...theme.type.bodyBold,
    fontSize: 17,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.hairline,
  },
  fieldsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.hairline,
    marginVertical: Spacing.lg,
  },
  badgeRow: {
    marginTop: Spacing.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    backgroundColor: theme.colors.bg,
    flexDirection: 'row',
  },
});
}
