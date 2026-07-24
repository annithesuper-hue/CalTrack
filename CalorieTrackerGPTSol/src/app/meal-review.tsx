import { Directory, File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Field, PrimaryButton, Screen } from '@/components/ui';
import { colors, radius } from '@/constants/design';
import type { MealEstimate } from '@/lib/types';
import { useApp } from '@/providers/app-provider';

function persistPhoto(uri: string) {
  const directory = new Directory(Paths.document, 'meal-photos');
  if (!directory.exists) directory.create();
  const source = new File(uri);
  const destination = new File(directory, `meal-${Date.now()}.jpg`);
  source.copy(destination);
  return destination.uri;
}

export default function MealReviewScreen() {
  const params = useLocalSearchParams<{ estimate?: string; imageUri?: string }>();
  const app = useApp();
  const estimate = useMemo<MealEstimate>(() => {
    try {
      return JSON.parse(params.estimate ?? '{}') as MealEstimate;
    } catch {
      return {
        name: 'Meal',
        description: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        confidence: 0,
        items: [],
      };
    }
  }, [params.estimate]);
  const [name, setName] = useState(estimate.name);
  const [calories, setCalories] = useState(String(estimate.calories));
  const [protein, setProtein] = useState(String(estimate.protein));
  const [carbs, setCarbs] = useState(String(estimate.carbs));
  const [fat, setFat] = useState(String(estimate.fat));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const imageUri = params.imageUri ? persistPhoto(params.imageUri) : null;
      await app.saveMeal({
        name: name.trim() || 'Meal',
        description: estimate.description,
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        confidence: estimate.confidence,
        items: estimate.items,
        imageUri,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close review" onPress={() => router.back()}>
          <View style={styles.close}>
            <SymbolView name="xmark" size={18} tintColor={colors.ink} />
          </View>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <AppText variant="caption" color={colors.inkMuted}>REVIEW ESTIMATE</AppText>
          <AppText variant="label">Make it yours</AppText>
        </View>
        <View style={styles.close} />
      </View>

      <View style={styles.photoWrap}>
        {params.imageUri ? (
          <Image source={{ uri: params.imageUri }} style={styles.photo} contentFit="cover" />
        ) : null}
        <View style={styles.confidence}>
          <SymbolView name="sparkles" size={16} tintColor={colors.ink} />
          <AppText variant="caption">
            {Math.round(estimate.confidence * 100)}% confident
          </AppText>
        </View>
      </View>

      <View style={styles.copy}>
        <AppText variant="eyebrow" color={colors.limeDark}>GEMINI FOUND</AppText>
        <Field label="Meal name" value={name} onChangeText={setName} testID="review-name" />
        <AppText variant="caption" color={colors.inkMuted}>{estimate.description}</AppText>
      </View>

      <Card style={styles.nutrition}>
        <View style={styles.calories}>
          <Field
            label="Calories"
            value={calories}
            onChangeText={setCalories}
            keyboardType="number-pad"
            suffix="kcal"
            testID="review-calories"
          />
        </View>
        <View style={styles.macroFields}>
          <View style={{ flex: 1 }}>
            <Field label="Protein" value={protein} onChangeText={setProtein} keyboardType="number-pad" suffix="g" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Carbs" value={carbs} onChangeText={setCarbs} keyboardType="number-pad" suffix="g" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Fat" value={fat} onChangeText={setFat} keyboardType="number-pad" suffix="g" />
          </View>
        </View>
      </Card>

      {estimate.items.length ? (
        <View style={styles.items}>
          <AppText variant="caption" color={colors.inkMuted}>VISIBLE INGREDIENTS</AppText>
          <View style={styles.chips}>
            {estimate.items.map((item) => (
              <View key={item} style={styles.chip}>
                <View style={styles.chipDot} />
                <AppText variant="caption">{item}</AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <PrimaryButton
        label="Save meal"
        icon="checkmark"
        onPress={save}
        loading={saving}
        disabled={!name.trim() || Number(calories) <= 0}
        tone="lime"
        testID="save-meal"
      />
      <AppText variant="caption" color={colors.inkMuted} style={{ textAlign: 'center' }}>
        Estimates can vary. Adjust any value before saving.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoWrap: { height: 260, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surfaceSoft },
  photo: { width: '100%', height: '100%' },
  confidence: {
    position: 'absolute',
    right: 13,
    bottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.lime,
  },
  copy: { gap: 9 },
  nutrition: { gap: 14 },
  calories: { width: '100%' },
  macroFields: { flexDirection: 'row', gap: 8 },
  items: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.limeDark },
});

