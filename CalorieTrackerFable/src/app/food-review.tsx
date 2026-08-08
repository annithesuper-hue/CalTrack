import { router, Stack, useLocalSearchParams } from 'expo-router';
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
import { Button, Card } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/lib/store';
import { Colors, MacroMeta, Radius, Spacing, Type } from '@/lib/theme';
import type { AnalysisResult, FoodItem } from '@/lib/types';

export default function FoodReviewScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useLocalSearchParams<{ data: string }>();
  const { logMeal } = useApp();

  const item: FoodItem | null = useMemo(() => {
    if (!data) return null;
    try {
      return JSON.parse(data) as FoodItem;
    } catch {
      return null;
    }
  }, [data]);

  const [name, setName] = useState(item?.name ?? '');
  const [servings, setServings] = useState(item?.servings ?? 1);
  const [calories, setCalories] = useState(item?.calories ?? 0);
  const [protein, setProtein] = useState(item?.protein ?? 0);
  const [carbs, setCarbs] = useState(item?.carbs ?? 0);
  const [fat, setFat] = useState(item?.fat ?? 0);

  if (!item) {
    return (
      <View style={styles.errorWrap}>
        <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
        <Text style={Type.secondary}>Could not load food data.</Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: Spacing.lg }} />
      </View>
    );
  }

  const save = () => {
    haptic.success();

    const analysis: AnalysisResult = {
      name: name.trim() || item.name,
      emoji: item.emoji,
      calories,
      protein,
      carbs,
      fat,
      confidence: 'high',
      items: [],
    };

    logMeal(analysis, null, item.servingSize, servings);
    router.dismissAll();
  };

  return (
    <>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={() => {
              haptic.tap();
              router.back();
            }}
            hitSlop={12}
            style={styles.closeButton}>
            <SymbolView name="xmark" size={16} tintColor={Colors.ink} weight="semibold" />
          </Pressable>
          <Text style={Type.heading}>Review Food</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Card style={styles.card}>
            <View style={styles.nameRow}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <View style={styles.nameWrap}>
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Food name"
                  placeholderTextColor={Colors.inkMuted}
                />
                {item.brand && <Text style={styles.brand}>{item.brand}</Text>}
              </View>
            </View>

            {item.source === 'usda' && (
              <View style={styles.sourceBadge}>
                <SymbolView name="checkmark.seal.fill" size={12} tintColor={Colors.green} />
                <Text style={styles.sourceText}>USDA FoodData Central</Text>
              </View>
            )}

            <View style={styles.divider} />

            <Text style={[Type.micro, styles.label]}>
              Serving: {item.servingSize}
            </Text>

            <View style={styles.servingsRow}>
              <Text style={styles.servingsLabel}>Servings</Text>
              <View style={styles.servingsControls}>
                <Pressable
                  onPress={() => {
                    haptic.select();
                    setServings((s) => Math.max(1, s - 1));
                  }}
                  style={({ pressed }) => [styles.servingsBtn, pressed && { opacity: 0.6 }]}>
                  <SymbolView name="minus" size={14} tintColor={Colors.ink} />
                </Pressable>
                <Text style={styles.servingsValue}>{servings}</Text>
                <Pressable
                  onPress={() => {
                    haptic.select();
                    setServings((s) => Math.min(20, s + 1));
                  }}
                  style={({ pressed }) => [styles.servingsBtn, pressed && { opacity: 0.6 }]}>
                  <SymbolView name="plus" size={14} tintColor={Colors.ink} />
                </Pressable>
              </View>
            </View>

            <View style={styles.divider} />

            <NutrientField
              label="Calories"
              value={calories}
              unit="kcal"
              step={10}
              color={Colors.ink}
              onChange={setCalories}
            />
            <NutrientField
              label="Protein"
              value={protein}
              unit="g"
              step={5}
              color={MacroMeta.protein.color}
              onChange={setProtein}
            />
            <NutrientField
              label="Carbs"
              value={carbs}
              unit="g"
              step={5}
              color={MacroMeta.carbs.color}
              onChange={setCarbs}
            />
            <NutrientField
              label="Fat"
              value={fat}
              unit="g"
              step={5}
              color={MacroMeta.fat.color}
              onChange={setFat}
            />

            {(item.fiber > 0 || item.sugar > 0 || item.sodium > 0) && (
              <>
                <View style={styles.divider} />
                <View style={styles.extraNutrients}>
                  {item.fiber > 0 && <ExtraNutrient label="Fiber" value={item.fiber} unit="g" />}
                  {item.sugar > 0 && <ExtraNutrient label="Sugar" value={item.sugar} unit="g" />}
                  {item.sodium > 0 && <ExtraNutrient label="Sodium" value={item.sodium} unit="mg" />}
                </View>
              </>
            )}

            <Text style={styles.editHint}>Adjust numbers if something looks off.</Text>
          </Card>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>
              {Math.round(calories * servings)} kcal · {Math.round(protein * servings)}p ·{' '}
              {Math.round(carbs * servings)}c · {Math.round(fat * servings)}f
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Button title="Log Food" onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function ExtraNutrient({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={styles.extraNutrient}>
      <Text style={styles.extraLabel}>{label}</Text>
      <Text style={styles.extraValue}>{value}{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  errorWrap: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.screen,
  },
  card: {
    gap: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 36,
  },
  nameWrap: {
    flex: 1,
    gap: 2,
  },
  nameInput: {
    ...Type.heading,
    padding: 0,
  },
  brand: {
    fontSize: 13,
    color: Colors.inkMuted,
    fontWeight: '500',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.greenSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  sourceText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.green,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.hairline,
    marginVertical: Spacing.sm,
  },
  label: {
    marginBottom: 4,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servingsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.ink,
  },
  servingsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  servingsBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
    minWidth: 28,
    textAlign: 'center',
  },
  extraNutrients: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  extraNutrient: {
    gap: 2,
  },
  extraLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.inkMuted,
  },
  extraValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
  },
  editHint: {
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: Spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.lg,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.inkMuted,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.bg,
  },
});
