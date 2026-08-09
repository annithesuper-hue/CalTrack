import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HealthBadge } from '@/components/health-badge';
import { MealTypePicker } from '@/components/meal-type-picker';
import { NutrientField } from '@/components/nutrient-field';
import { QuantityInput } from '@/components/quantity-input';
import { Button } from '@/components/ui';
import { friendlyErrorMessage } from '@/lib/api-client';
import { foodResultToAnalysis, searchAllFoods, type FoodResult } from '@/lib/food-search';
import { haptic } from '@/lib/haptics';
import { inferMealTypeFromHour, MealTypeMeta } from '@/lib/meal-type';
import { useApp } from '@/lib/store';
import { Colors, MacroMeta, Radius, Shadow, Spacing, Type } from '@/lib/theme';
import type { AnalysisResult, Meal, MealType } from '@/lib/types';

type Phase = 'idle' | 'searching' | 'results' | 'empty' | 'error' | 'review';

const DEBOUNCE_MS = 450;

export default function SearchFood() {
  const insets = useSafeAreaInsets();
  const { logMeal, getRecentMeals } = useApp();

  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [recentMeals] = useState<Meal[]>(() => getRecentMeals(8));

  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [mealType, setMealType] = useState<MealType>(() => inferMealTypeFromHour());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const runSearch = (text: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase('searching');
    searchAllFoods(text, controller.signal)
      .then((foods) => {
        if (controller.signal.aborted) return;
        setResults(foods);
        setPhase(foods.length > 0 ? 'results' : 'empty');
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setErrorMessage(friendlyErrorMessage(e, 'usda'));
        setPhase('error');
      });
  };

  const onChangeQuery = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = text.trim();
    if (!trimmed) {
      abortRef.current?.abort();
      setResults([]);
      setPhase('idle');
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(trimmed), DEBOUNCE_MS);
  };

  const selectFood = (food: FoodResult) => {
    haptic.tap();
    setSelected(food);
    setResult(foodResultToAnalysis(food, food.defaultQuantity));
    setPhase('review');
  };

  const selectRecentMeal = (meal: Meal) => {
    haptic.tap();
    setSelected(null);
    setMealType(meal.mealType);
    setResult({
      name: meal.name,
      emoji: meal.emoji,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      confidence: 'high',
      items: [],
    });
    setPhase('review');
  };

  const changeQuantity = (quantity: number) => {
    if (!selected) return;
    setResult(foodResultToAnalysis(selected, quantity));
  };

  const backToResults = () => {
    haptic.tap();
    setSelected(null);
    setResult(null);
    setPhase(results.length > 0 ? 'results' : 'idle');
  };

  const save = () => {
    if (!result) return;
    logMeal(result, null, mealType);
    router.back();
  };

  const close = () => {
    haptic.tap();
    router.back();
  };

  // --- Review / edit sheet ---
  if (phase === 'review' && result) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={backToResults} hitSlop={10} style={styles.headerButton}>
            <SymbolView name="chevron.left" size={16} tintColor={Colors.ink} weight="semibold" />
          </Pressable>
          <Text style={styles.headerTitle}>Review</Text>
          <Pressable onPress={close} hitSlop={10} style={styles.headerButton}>
            <SymbolView name="xmark" size={15} tintColor={Colors.ink} weight="semibold" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.resultContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(350)} style={styles.resultCard}>
            <View style={styles.nameRow}>
              <Text style={styles.resultEmoji}>{selected ? (selected.isGeneric ? '🥗' : '🍽️') : result.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>{selected ? selected.name : result.name}</Text>
                {selected?.brand ? <Text style={styles.foodBrand}>{selected.brand}</Text> : null}
              </View>
            </View>

            <View style={styles.badgeRow}>
              <HealthBadge macros={result} />
            </View>

            {selected ? (
              <View style={styles.quantityWrap}>
                <QuantityInput
                  baseUnit={selected.unit}
                  defaultQuantity={selected.defaultQuantity}
                  servingDescription={selected.servingDescription}
                  onChange={changeQuantity}
                />
              </View>
            ) : null}

            <View style={styles.mealTypeWrap}>
              <MealTypePicker value={mealType} onChange={setMealType} />
            </View>

            <View style={styles.fieldsDivider} />
            <NutrientField
              label="Calories"
              value={result.calories}
              unit="kcal"
              step={10}
              color={Colors.ink}
              onChange={(calories) => setResult({ ...result, calories })}
            />
            <NutrientField
              label="Protein"
              value={result.protein}
              unit="g"
              step={5}
              color={MacroMeta.protein.color}
              onChange={(protein) => setResult({ ...result, protein })}
            />
            <NutrientField
              label="Carbs"
              value={result.carbs}
              unit="g"
              step={5}
              color={MacroMeta.carbs.color}
              onChange={(carbs) => setResult({ ...result, carbs })}
            />
            <NutrientField
              label="Fat"
              value={result.fat}
              unit="g"
              step={5}
              color={MacroMeta.fat.color}
              onChange={(fat) => setResult({ ...result, fat })}
            />
            <Text style={styles.editHint}>
              {selected
                ? `From ${selected.source === 'off' ? 'Open Food Facts' : selected.source === 'usda' ? 'USDA FoodData Central' : 'built-in food data'} — tweak anything that looks off.`
                : 'From your recent history — tweak anything that looks off.'}
            </Text>
          </Animated.View>
        </ScrollView>

        <View style={[styles.resultFooter, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Button title="Log Food" onPress={save} style={{ flex: 1 }} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // --- Search + results ---
  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search Food</Text>
        <Pressable onPress={close} hitSlop={10} style={styles.headerButton}>
          <SymbolView name="xmark" size={15} tintColor={Colors.ink} weight="semibold" />
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <SymbolView name="magnifyingglass" size={16} tintColor={Colors.inkMuted} />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search foods, e.g. soya chunks"
          placeholderTextColor={Colors.inkMuted}
          style={styles.searchInput}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => query.trim() && runSearch(query.trim())}
        />
        {query.length > 0 && (
          <Pressable onPress={() => onChangeQuery('')} hitSlop={10}>
            <SymbolView name="xmark.circle.fill" size={16} tintColor={Colors.inkMuted} />
          </Pressable>
        )}
      </View>

      {phase === 'idle' && (
        recentMeals.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.sectionLabel}>Recently added</Text>
            <View style={{ gap: Spacing.sm, paddingBottom: Spacing.xxl }}>
              {recentMeals.map((meal, index) => {
                const meta = MealTypeMeta[meal.mealType];
                return (
                  <Animated.View key={meal.id} entering={FadeIn.duration(220).delay(Math.min(index, 8) * 25)}>
                    <Pressable
                      onPress={() => selectRecentMeal(meal)}
                      style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: Colors.cardPressed }]}>
                      <View style={[styles.resultTag, { backgroundColor: `${meta.color}22` }]}>
                        <Text style={styles.resultTagText}>{meal.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {meal.name}
                        </Text>
                        <Text style={styles.resultMeta}>
                          {meta.label} · {Math.round(meal.calories)} kcal
                        </Text>
                      </View>
                      <SymbolView name="arrow.clockwise" size={14} tintColor={Colors.inkMuted} />
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.centerWrap}>
            <SymbolView name="magnifyingglass" size={34} tintColor={Colors.inkMuted} />
            <Text style={styles.centerTitle}>Search your food library</Text>
            <Text style={styles.centerText}>Find Indian & global packaged and whole foods by name and log them in seconds.</Text>
          </View>
        )
      )}

      {phase === 'searching' && (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={Colors.ink} />
          <Text style={styles.centerText}>Searching…</Text>
        </View>
      )}

      {phase === 'empty' && (
        <View style={styles.centerWrap}>
          <SymbolView name="questionmark.circle.fill" size={34} tintColor={Colors.inkMuted} />
          <Text style={styles.centerTitle}>No results</Text>
          <Text style={styles.centerText}>Try a different search term, or add this food manually.</Text>
          <Button
            title="Add Manually"
            variant="secondary"
            onPress={() => router.replace('/manual-entry')}
            style={{ marginTop: Spacing.md, alignSelf: 'stretch' }}
          />
        </View>
      )}

      {phase === 'error' && (
        <View style={styles.centerWrap}>
          <SymbolView name="exclamationmark.triangle.fill" size={34} tintColor={Colors.carbs} />
          <Text style={styles.centerTitle}>Hmm, that didn't work</Text>
          <Text style={styles.centerText}>{errorMessage}</Text>
          <Button
            title="Try Again"
            onPress={() => query.trim() && runSearch(query.trim())}
            style={{ marginTop: Spacing.md, alignSelf: 'stretch' }}
          />
        </View>
      )}

      {phase === 'results' && (
        <FlatList
          data={results}
          keyExtractor={(item, i) => item.id || `${i}`}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const kcalAtDefault = Math.round(item.perGram.calories * item.defaultQuantity);
            return (
              <Animated.View entering={FadeIn.duration(220).delay(Math.min(index, 8) * 25)}>
                <Pressable
                  onPress={() => selectFood(item)}
                  style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: Colors.cardPressed }]}>
                  <View style={[styles.resultTag, item.isGeneric ? styles.resultTagGeneric : styles.resultTagBranded]}>
                    <Text style={styles.resultTagText}>{item.isGeneric ? '🥗' : '📦'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {item.name}
                      {item.brand ? ` (${item.brand})` : ''}
                    </Text>
                    <Text style={styles.resultMeta}>
                      {item.servingDescription ?? `${Math.round(item.defaultQuantity)}${item.unit}`} · {kcalAtDefault} kcal
                    </Text>
                  </View>
                  <SymbolView name="chevron.right" size={14} tintColor={Colors.inkMuted} />
                </Pressable>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Type.title,
    fontSize: 20,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.hairline,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.ink,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  centerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: Spacing.xs,
  },
  centerText: {
    fontSize: 13.5,
    color: Colors.inkSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  resultsList: {
    paddingBottom: Spacing.xxl,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.hairline,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resultTag: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTagGeneric: {
    backgroundColor: Colors.greenSoft,
  },
  resultTagBranded: {
    backgroundColor: Colors.fatSoft,
  },
  resultTagText: {
    fontSize: 15,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
  },
  resultMeta: {
    fontSize: 12.5,
    color: Colors.green,
    marginTop: 2,
    fontWeight: '600',
  },
  resultContent: {
    paddingHorizontal: 0,
  },
  resultCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.sm,
    ...Shadow.card,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  resultEmoji: {
    fontSize: 30,
  },
  foodName: {
    ...Type.heading,
  },
  foodBrand: {
    fontSize: 13,
    color: Colors.inkSecondary,
    marginTop: 2,
  },
  badgeRow: {
    marginTop: Spacing.md,
  },
  quantityWrap: {
    marginTop: Spacing.lg,
  },
  mealTypeWrap: {
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  servingsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.inkSecondary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  servingsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servingsValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
    minWidth: 34,
    textAlign: 'center',
  },
  stepper: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.hairline,
    marginVertical: Spacing.md,
  },
  editHint: {
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: Spacing.sm,
  },
  resultFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: Colors.bg,
  },
});
