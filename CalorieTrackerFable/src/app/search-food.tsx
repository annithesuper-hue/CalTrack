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

import { NutrientField } from '@/components/nutrient-field';
import { Button } from '@/components/ui';
import { friendlyErrorMessage } from '@/lib/api-client';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/lib/store';
import { Colors, MacroMeta, Radius, Shadow, Spacing, Type } from '@/lib/theme';
import type { AnalysisResult } from '@/lib/types';
import { searchFoods, usdaFoodToAnalysis, type UsdaNormalizedFood } from '@/lib/usda';

type Phase = 'idle' | 'searching' | 'results' | 'empty' | 'error' | 'review';

const DEBOUNCE_MS = 450;

export default function SearchFood() {
  const insets = useSafeAreaInsets();
  const { logMeal } = useApp();

  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<UsdaNormalizedFood[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const [selected, setSelected] = useState<UsdaNormalizedFood | null>(null);
  const [servings, setServings] = useState(1);
  const [result, setResult] = useState<AnalysisResult | null>(null);

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
    searchFoods(text, controller.signal)
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

  const selectFood = (food: UsdaNormalizedFood) => {
    haptic.tap();
    setSelected(food);
    setServings(1);
    setResult(usdaFoodToAnalysis(food, 1));
    setPhase('review');
  };

  const changeServings = (delta: number) => {
    if (!selected) return;
    const next = Math.max(0.25, Math.round((servings + delta) * 4) / 4);
    setServings(next);
    setResult(usdaFoodToAnalysis(selected, next));
    haptic.select();
  };

  const backToResults = () => {
    haptic.tap();
    setSelected(null);
    setResult(null);
    setPhase(results.length > 0 ? 'results' : 'idle');
  };

  const save = () => {
    if (!result) return;
    logMeal(result, null);
    router.back();
  };

  const close = () => {
    haptic.tap();
    router.back();
  };

  // --- Review / edit sheet ---
  if (phase === 'review' && result && selected) {
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
              <Text style={styles.resultEmoji}>🍽️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>{selected.name}</Text>
                {selected.brand ? <Text style={styles.foodBrand}>{selected.brand}</Text> : null}
              </View>
            </View>

            <View style={styles.servingsRow}>
              <Text style={styles.servingsLabel}>
                Servings{selected.servingDescription ? ` · ${selected.servingDescription}` : ''}
              </Text>
              <View style={styles.servingsControls}>
                <StepperButton symbol="minus" onPress={() => changeServings(-0.25)} />
                <Text style={styles.servingsValue}>{servings}</Text>
                <StepperButton symbol="plus" onPress={() => changeServings(0.25)} />
              </View>
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
            <Text style={styles.editHint}>From USDA FoodData Central — tweak anything that looks off.</Text>
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
        <View style={styles.centerWrap}>
          <SymbolView name="magnifyingglass" size={34} tintColor={Colors.inkMuted} />
          <Text style={styles.centerTitle}>Search USDA FoodData Central</Text>
          <Text style={styles.centerText}>Find packaged and whole foods by name and log them in seconds.</Text>
        </View>
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
          keyExtractor={(item, i) => `${item.fdcId || i}`}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeIn.duration(220).delay(Math.min(index, 8) * 25)}>
              <Pressable
                onPress={() => selectFood(item)}
                style={({ pressed }) => [styles.resultRow, pressed && { backgroundColor: Colors.cardPressed }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName} numberOfLines={1}>
                    {item.name}
                    {item.brand ? ` (${item.brand})` : ''}
                  </Text>
                  <Text style={styles.resultMeta}>
                    {item.servingDescription ?? 'Per serving'} · {Math.round(item.perServing.calories)} kcal
                  </Text>
                </View>
                <SymbolView name="chevron.right" size={14} tintColor={Colors.inkMuted} />
              </Pressable>
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

function StepperButton({ symbol, onPress }: { symbol: 'plus' | 'minus'; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.stepper, pressed && { backgroundColor: Colors.cardPressed }]}>
      <SymbolView name={symbol} size={14} tintColor={Colors.ink} />
    </Pressable>
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
