import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
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
import { Colors, MacroMeta, Radius, Shadow, Spacing, Type } from '@/lib/theme';
import type { AnalysisResult, FoodItem } from '@/lib/types';

const EMOJI_CHOICES = ['🍽️', '🥗', '🍔', '🍕', '🥪', '🍣', '🍜', '🥣', '🍎', '🍌', '🥤', '☕'];

export default function ManualEntryScreen() {
  const insets = useSafeAreaInsets();
  const { logMeal } = useApp();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍽️');
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [servings, setServings] = useState(1);
  const [servingSize, setServingSize] = useState('');

  const canSave = name.trim().length > 0 && calories > 0;

  const save = () => {
    if (!canSave) {
      haptic.error();
      return;
    }
    haptic.success();

    const analysis: AnalysisResult = {
      name: name.trim(),
      emoji,
      calories,
      protein,
      carbs,
      fat,
      confidence: 'high',
      items: [],
    };

    logMeal(analysis, null, servingSize.trim() || null, servings);
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
          <Text style={Type.heading}>Add Manually</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Card style={styles.card}>
            <Text style={[Type.micro, styles.label]}>Food name</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Chicken Sandwich"
              placeholderTextColor={Colors.inkMuted}
              returnKeyType="done"
            />

            <View style={styles.divider} />

            <Text style={[Type.micro, styles.label]}>Icon</Text>
            <View style={styles.emojiRow}>
              {EMOJI_CHOICES.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => {
                    haptic.select();
                    setEmoji(e);
                  }}
                  style={({ pressed }) => [
                    styles.emojiChip,
                    emoji === e && styles.emojiChipSelected,
                    pressed && { opacity: 0.7 },
                  ]}>
                  <Text style={styles.emojiText}>{e}</Text>
                </Pressable>
              ))}
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

            <View style={styles.divider} />

            <Text style={[Type.micro, styles.label]}>Serving size (optional)</Text>
            <TextInput
              style={styles.servingInput}
              value={servingSize}
              onChangeText={setServingSize}
              placeholder="e.g. 1 cup, 200g"
              placeholderTextColor={Colors.inkMuted}
              returnKeyType="done"
            />

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
          <Button title="Log Food" onPress={save} disabled={!canSave} />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
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
  label: {
    marginBottom: 4,
  },
  nameInput: {
    ...Type.heading,
    padding: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.hairline,
    paddingBottom: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.hairline,
    marginVertical: Spacing.sm,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emojiChipSelected: {
    borderColor: Colors.ink,
    backgroundColor: Colors.card,
  },
  emojiText: {
    fontSize: 22,
  },
  servingInput: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ink,
    padding: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.hairline,
    paddingBottom: 8,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
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
