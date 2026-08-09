import { router } from 'expo-router';
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
import { Button } from '@/components/ui';
import { HealthBadge } from '@/components/health-badge';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/lib/store';
import { Colors, MacroMeta, Radius, Shadow, Spacing, Type } from '@/lib/theme';

export default function ManualEntry() {
  const insets = useSafeAreaInsets();
  const { logMeal, editMeal } = useApp();

  const [name, setName] = useState('');
  const [servingNote, setServingNote] = useState('');
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);

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
        confidence: 'high',
        items: [],
      },
      null,
    );
    // Custom foods use the same meal/nutrition system as photo & barcode
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
            <SymbolView name="xmark" size={15} tintColor={Colors.ink} weight="semibold" />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Food name</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Homemade chili"
            placeholderTextColor={Colors.inkMuted}
            autoFocus
          />

          <Text style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>Serving size (optional)</Text>
          <TextInput
            style={styles.nameInput}
            value={servingNote}
            onChangeText={setServingNote}
            placeholder="e.g. 1 bowl, 250g"
            placeholderTextColor={Colors.inkMuted}
          />

          <View style={styles.fieldsDivider} />

          <NutrientField label="Calories" value={calories} unit="kcal" step={10} color={Colors.ink} onChange={setCalories} />
          <NutrientField label="Protein" value={protein} unit="g" step={5} color={MacroMeta.protein.color} onChange={setProtein} />
          <NutrientField label="Carbs" value={carbs} unit="g" step={5} color={MacroMeta.carbs.color} onChange={setCarbs} />
          <NutrientField label="Fat" value={fat} unit="g" step={5} color={MacroMeta.fat.color} onChange={setFat} />

          <View style={styles.badgeRow}>
            <HealthBadge macros={{ calories, protein, carbs, fat }} />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Button title="Log Food" onPress={save} disabled={!canSave} style={{ flex: 1 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
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
    ...Type.title,
    fontSize: 24,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadow.card,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  nameInput: {
    ...Type.bodyBold,
    fontSize: 17,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.hairline,
  },
  fieldsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.hairline,
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
    backgroundColor: Colors.bg,
    flexDirection: 'row',
  },
});
