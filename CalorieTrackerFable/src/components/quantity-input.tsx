import { SymbolView } from 'expo-symbols';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { Radius, Spacing, ThemeColors, useColors } from '@/lib/theme';

type AmountUnit = 'g' | 'kg' | 'ml' | 'l';

type QuantityInputProps = {
  /** Base unit of the food's per-gram data — 'g' for solids, 'ml' for liquids. */
  baseUnit: 'g' | 'ml';
  /** A sensible "1 serving" amount in the base unit (e.g. 100 for 100g). */
  defaultQuantity: number;
  /** Description of what one serving means, e.g. "1 bar (40g)". */
  servingDescription?: string | null;
  /** Called whenever the resolved quantity changes, always in the base unit (g or ml). */
  onChange: (quantityInBaseUnit: number) => void;
};

/**
 * Lets people log a food either as "servings" (the old behavior) or as a
 * direct amount in grams/kg (or ml/l for liquids) — e.g. "150g of rice"
 * instead of guessing how many "servings" that is.
 */
export function QuantityInput({ baseUnit, defaultQuantity, servingDescription, onChange }: QuantityInputProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<'servings' | 'amount'>('servings');
  const [servings, setServings] = useState(1);
  const [amountUnit, setAmountUnit] = useState<AmountUnit>(baseUnit === 'ml' ? 'ml' : 'g');
  const [amountText, setAmountText] = useState(String(Math.round(defaultQuantity)));

  const emitServings = (next: number) => {
    setServings(next);
    onChange(next * defaultQuantity);
  };

  const emitAmount = (text: string, unit: AmountUnit) => {
    setAmountText(text);
    const parsed = parseFloat(text.replace(',', '.'));
    const value = Number.isFinite(parsed) ? parsed : 0;
    const inBaseUnit = unit === 'kg' || unit === 'l' ? value * 1000 : value;
    onChange(inBaseUnit);
  };

  const switchMode = (next: 'servings' | 'amount') => {
    haptic.tap();
    setMode(next);
    if (next === 'servings') {
      onChange(servings * defaultQuantity);
    } else {
      emitAmount(amountText, amountUnit);
    }
  };

  const switchAmountUnit = (next: AmountUnit) => {
    haptic.tap();
    setAmountUnit(next);
    emitAmount(amountText, next);
  };

  const bumpServings = (delta: number) => {
    haptic.select();
    emitServings(Math.max(0.25, Math.round((servings + delta) * 4) / 4));
  };

  const unitChoices: AmountUnit[] = baseUnit === 'ml' ? ['ml', 'l'] : ['g', 'kg'];

  return (
    <View style={styles.wrap}>
      <View style={styles.modeRow}>
        <ModeTab label="Servings" active={mode === 'servings'} onPress={() => switchMode('servings')} />
        <ModeTab label="Amount" active={mode === 'amount'} onPress={() => switchMode('amount')} />
      </View>

      {mode === 'servings' ? (
        <View style={styles.row}>
          <Text style={styles.hint} numberOfLines={1}>
            {servingDescription ? servingDescription : `${Math.round(defaultQuantity)}${baseUnit}/serving`}
          </Text>
          <View style={styles.servingsControls}>
            <StepperButton symbol="minus" onPress={() => bumpServings(-0.25)} />
            <Text style={styles.servingsValue}>{servings}</Text>
            <StepperButton symbol="plus" onPress={() => bumpServings(0.25)} />
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.amountInputWrap}>
            <TextInput
              style={styles.amountInput}
              value={amountText}
              keyboardType="decimal-pad"
              selectTextOnFocus
              onChangeText={(text) => emitAmount(text.replace(/[^0-9.,]/g, ''), amountUnit)}
            />
          </View>
          <View style={styles.unitChoices}>
            {unitChoices.map((u) => (
              <Pressable
                key={u}
                onPress={() => switchAmountUnit(u)}
                style={[styles.unitChip, amountUnit === u && styles.unitChipActive]}>
                <Text style={[styles.unitChipText, amountUnit === u && styles.unitChipTextActive]}>{u}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} style={[styles.modeTab, active && styles.modeTabActive]}>
      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StepperButton({ symbol, onPress }: { symbol: 'plus' | 'minus'; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.stepper, pressed && { backgroundColor: colors.cardPressed }]}>
      <SymbolView name={symbol} size={14} tintColor={colors.ink} />
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      gap: Spacing.sm,
    },
    modeRow: {
      flexDirection: 'row',
      backgroundColor: colors.bg,
      borderRadius: Radius.full,
      padding: 3,
      alignSelf: 'flex-start',
    },
    modeTab: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: Radius.full,
    },
    modeTabActive: {
      backgroundColor: colors.card,
    },
    modeTabText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.inkMuted,
    },
    modeTabTextActive: {
      color: colors.ink,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
    },
    hint: {
      flex: 1,
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.inkSecondary,
    },
    servingsControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    servingsValue: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.ink,
      fontVariant: ['tabular-nums'],
      minWidth: 34,
      textAlign: 'center',
    },
    stepper: {
      width: 34,
      height: 34,
      borderRadius: Radius.full,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    amountInputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bg,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
    },
    amountInput: {
      flex: 1,
      fontSize: 17,
      fontWeight: '700',
      color: colors.ink,
      fontVariant: ['tabular-nums'],
      padding: 0,
    },
    unitChoices: {
      flexDirection: 'row',
      gap: 6,
    },
    unitChip: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      backgroundColor: colors.bg,
    },
    unitChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    unitChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.inkSecondary,
    },
    unitChipTextActive: {
      color: colors.onAccent,
    },
  });
