import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { Colors, Radius } from '@/lib/theme';

type NutrientFieldProps = {
  label: string;
  value: number;
  unit: string;
  step: number;
  color?: string;
  onChange: (value: number) => void;
};

/** Numeric field with +/- steppers and direct text entry. */
export function NutrientField({ label, value, unit, step, color = Colors.ink, onChange }: NutrientFieldProps) {
  const bump = (delta: number) => {
    haptic.select();
    onChange(Math.max(0, Math.round(value + delta)));
  };

  return (
    <View style={styles.row}>
      <View style={styles.labelWrap}>
        <View style={[styles.chip, { backgroundColor: color }]} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.controls}>
        <StepperButton symbol="minus" onPress={() => bump(-step)} />
        <View style={styles.valueWrap}>
          <TextInput
            style={styles.input}
            value={String(Math.round(value))}
            keyboardType="number-pad"
            selectTextOnFocus
            onChangeText={(text) => {
              const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
              onChange(Number.isFinite(parsed) ? parsed : 0);
            }}
          />
          <Text style={styles.unit}>{unit}</Text>
        </View>
        <StepperButton symbol="plus" onPress={() => bump(step)} />
      </View>
    </View>
  );
}

function StepperButton({ symbol, onPress }: { symbol: 'plus' | 'minus'; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.stepper, pressed && { backgroundColor: Colors.cardPressed }]}>
      <SymbolView name={symbol} size={14} tintColor={Colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.ink,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 74,
    justifyContent: 'center',
  },
  input: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
    padding: 0,
    textAlign: 'right',
    minWidth: 40,
  },
  unit: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.inkMuted,
    marginLeft: 3,
  },
});
