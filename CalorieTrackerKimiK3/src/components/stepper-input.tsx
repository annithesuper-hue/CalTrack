import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

const C = Colors.dark;

interface StepperInputProps {
  label: string;
  /** Current numeric value shown in the field. */
  value: string;
  unit: string;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
}

/** Labeled numeric input flanked by −/+ stepper buttons with haptics. */
export function StepperInput({ label, value, unit, onChange, step = 10, min = 0 }: StepperInputProps) {
  const bump = (delta: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = Math.max(min, (parseInt(value, 10) || 0) + delta * step);
    onChange(String(next));
  };

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable
          onPress={() => bump(-1)}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          hitSlop={6}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Text style={styles.buttonText}>−</Text>
        </Pressable>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            selectTextOnFocus
            accessibilityLabel={label}
          />
          <Text style={styles.unit}>{unit}</Text>
        </View>
        <Pressable
          onPress={() => bump(1)}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          hitSlop={6}
          accessibilityLabel={`Increase ${label}`}
        >
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    gap: Spacing.three,
  },
  label: {
    color: C.text,
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: C.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: C.accent,
  },
  buttonText: {
    color: C.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: -2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: C.background,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    paddingHorizontal: Spacing.two,
    minWidth: 88,
    justifyContent: 'flex-end',
  },
  input: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: Spacing.two,
    minWidth: 44,
    textAlign: 'right',
  },
  unit: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
