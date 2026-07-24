import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useCallback, useMemo, useState } from 'react';
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

import { Colors, Radius, Spacing } from '@/constants/theme';
import { todayKey } from '@/lib/dates';
import { useApp } from '@/lib/store';
import type { FoodEstimate, Macros, NewFoodEntry } from '@/lib/types';

const C = Colors.dark;

type MacroKey = keyof Macros;

const MACRO_ROWS: { key: MacroKey; label: string; unit: string; color: string; step: number }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: C.text, step: 10 },
  { key: 'protein', label: 'Protein', unit: 'g', color: C.protein, step: 1 },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: C.carbs, step: 1 },
  { key: 'fat', label: 'Fat', unit: 'g', color: C.fat, step: 1 },
];

function clampInt(value: string): number {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

export default function EditEntryScreen() {
  const insets = useSafeAreaInsets();
  const { addFood, editFood, removeFood, todayEntries } = useApp();
  const params = useLocalSearchParams<{ estimate?: string; imageUri?: string; entryId?: string }>();

  const existing = params.entryId ? todayEntries.find((e) => e.id === params.entryId) : undefined;

  const estimate: FoodEstimate | null = useMemo(() => {
    if (typeof params.estimate !== 'string' || params.estimate.length === 0) return null;
    try {
      return JSON.parse(params.estimate) as FoodEstimate;
    } catch {
      return null;
    }
  }, [params.estimate]);

  const initialImageUri = existing?.imageUri ?? (typeof params.imageUri === 'string' ? params.imageUri : null);

  const [name, setName] = useState(existing?.name ?? estimate?.name ?? '');
  const [macros, setMacros] = useState<Macros>({
    calories: existing?.calories ?? estimate?.calories ?? 0,
    protein: existing?.protein ?? estimate?.protein ?? 0,
    carbs: existing?.carbs ?? estimate?.carbs ?? 0,
    fat: existing?.fat ?? estimate?.fat ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const items = estimate?.items ?? [];
  const itemsTotals = useMemo(
    () =>
      items.reduce(
        (acc, it) => ({
          calories: acc.calories + it.calories,
          protein: acc.protein + it.protein,
          carbs: acc.carbs + it.carbs,
          fat: acc.fat + it.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [items]
  );
  const totalsEdited =
    items.length > 0 &&
    (macros.calories !== itemsTotals.calories ||
      macros.protein !== itemsTotals.protein ||
      macros.carbs !== itemsTotals.carbs ||
      macros.fat !== itemsTotals.fat);

  const setMacro = useCallback((key: MacroKey, value: number) => {
    setMacros((m) => ({ ...m, [key]: Math.max(0, Math.round(value)) }));
  }, []);

  const stepMacro = useCallback(
    (key: MacroKey, delta: number) => {
      void Haptics.selectionAsync();
      setMacros((m) => ({ ...m, [key]: Math.max(0, Math.round(m[key] + delta)) }));
    },
    []
  );

  const closeToToday = useCallback(() => {
    // Typed-route defs may lag behind new routes.
    if (router.canDismiss()) {
      router.dismissAll();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/' as any);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    const trimmed = name.trim() || 'Meal';
    setSaving(true);
    try {
      if (existing) {
        await editFood(existing.id, { name: trimmed, ...macros });
      } else {
        const entry: NewFoodEntry = {
          date: todayKey(),
          name: trimmed,
          ...macros,
          imageUri: initialImageUri ?? null,
          source: estimate ? 'camera' : 'manual',
        };
        await addFood(entry);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeToToday();
    } finally {
      setSaving(false);
    }
  }, [saving, name, existing, editFood, macros, initialImageUri, estimate, addFood, closeToToday]);

  const handleDelete = useCallback(() => {
    if (!existing) return;
    Alert.alert('Delete entry?', `Remove “${existing.name}” from today?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await removeFood(existing.id);
            closeToToday();
          })();
        },
      },
    ]);
  }, [existing, removeFood, closeToToday]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.three }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={closeToToday} hitSlop={8} style={styles.headerButton}>
            <SymbolView name="xmark" size={18} tintColor={C.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>{existing ? 'Edit entry' : 'Review meal'}</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Photo */}
        {initialImageUri ? (
          <Image source={{ uri: initialImageUri }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <SymbolView name="camera.fill" size={44} tintColor={C.accent} />
          </View>
        )}

        {/* Name */}
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="Meal name"
          placeholderTextColor={C.textSecondary}
          returnKeyType="done"
        />

        {/* Macros */}
        <View style={styles.card}>
          {MACRO_ROWS.map((row, index) => (
            <View
              key={row.key}
              style={[styles.macroRow, index < MACRO_ROWS.length - 1 && styles.macroRowBorder]}
            >
              <View style={styles.macroLabelWrap}>
                <View style={[styles.macroDot, { backgroundColor: row.color }]} />
                <Text style={styles.macroLabel}>{row.label}</Text>
              </View>
              <View style={styles.macroControls}>
                <Pressable
                  style={styles.stepper}
                  onPress={() => stepMacro(row.key, -row.step)}
                  hitSlop={4}
                >
                  <SymbolView name="minus" size={16} tintColor={C.text} />
                </Pressable>
                <View style={styles.macroValueWrap}>
                  <TextInput
                    style={styles.macroInput}
                    value={String(macros[row.key])}
                    onChangeText={(text) => setMacro(row.key, clampInt(text))}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.macroUnit}>{row.unit}</Text>
                </View>
                <Pressable
                  style={styles.stepper}
                  onPress={() => stepMacro(row.key, row.step)}
                  hitSlop={4}
                >
                  <SymbolView name="plus" size={16} tintColor={C.text} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {totalsEdited && (
          <Text style={styles.hint}>
            Totals edited manually — items below add up to {itemsTotals.calories} kcal.
          </Text>
        )}

        {/* Items breakdown */}
        {items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.itemsTitle}>Breakdown</Text>
            {items.map((item, index) => (
              <View
                key={`${item.name}-${index}`}
                style={[styles.itemRow, index < items.length - 1 && styles.macroRowBorder]}
              >
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemKcal}>{item.calories} kcal</Text>
              </View>
            ))}
          </View>
        )}

        {/* Save */}
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={() => void handleSave()}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : existing ? 'Save changes' : 'Log meal'}</Text>
        </Pressable>

        {/* Delete (existing entries only) */}
        {existing && (
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete entry</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: C.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
  },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: Radius.md,
    backgroundColor: C.backgroundElement,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  nameInput: {
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  card: {
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: Spacing.three,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  macroRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  macroLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  macroLabel: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  macroControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepper: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: C.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.half,
    minWidth: 72,
    justifyContent: 'flex-end',
  },
  macroInput: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'right',
    minWidth: 44,
    padding: 0,
  },
  macroUnit: {
    color: C.textSecondary,
    fontSize: 13,
  },
  hint: {
    color: C.textSecondary,
    fontSize: 13,
  },
  itemsTitle: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two + Spacing.one,
    gap: Spacing.two,
  },
  itemName: {
    color: C.text,
    fontSize: 14,
    flex: 1,
  },
  itemKcal: {
    color: C.textSecondary,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  saveButton: {
    backgroundColor: C.accent,
    borderRadius: Radius.full,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: C.background,
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  deleteButtonText: {
    color: C.danger,
    fontSize: 15,
    fontWeight: '600',
  },
});
