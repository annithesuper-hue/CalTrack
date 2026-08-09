import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { Colors, Radius, Spacing } from '@/lib/theme';

type PortionCorrectionProps = {
  estimatedGrams: number | null;
  countable: { estimatedCount: number; unitLabel: string } | null;
  /** Called with the new value relative to the AI's original estimate, e.g. 1.4 for "40% more than estimated". */
  onScale: (ratio: number) => void;
};

/**
 * Lets the person correct the AI's portion-size guess when they actually
 * know better than the photo does — either "I know this weighed X grams"
 * for normal dishes, or "there are actually N eggs/rotis/etc." for
 * naturally countable foods the AI flagged as genuinely hard to count from
 * the photo (a stack, a pile, partially hidden items). Renders nothing if
 * the AI didn't give either kind of baseline to correct against.
 */
export function PortionCorrection({ estimatedGrams, countable, onScale }: PortionCorrectionProps) {
  if (countable) return <CountCorrection countable={countable} onScale={onScale} />;
  if (estimatedGrams && estimatedGrams > 0) return <WeightCorrection estimatedGrams={estimatedGrams} onScale={onScale} />;
  return null;
}

function WeightCorrection({ estimatedGrams, onScale }: { estimatedGrams: number; onScale: (ratio: number) => void }) {
  const [text, setText] = useState(String(estimatedGrams));

  const commit = (raw: string) => {
    setText(raw);
    const parsed = parseFloat(raw.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) {
      onScale(parsed / estimatedGrams);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <SymbolView name="scalemass" size={13} tintColor={Colors.inkSecondary} />
        <Text style={styles.label}>Know the actual weight? AI guessed ~{estimatedGrams}g</Text>
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          keyboardType="decimal-pad"
          selectTextOnFocus
          onChangeText={(t) => commit(t.replace(/[^0-9.,]/g, ''))}
        />
        <Text style={styles.unit}>g</Text>
      </View>
    </View>
  );
}

function CountCorrection({
  countable,
  onScale,
}: {
  countable: { estimatedCount: number; unitLabel: string };
  onScale: (ratio: number) => void;
}) {
  const [count, setCount] = useState(countable.estimatedCount);

  const bump = (delta: number) => {
    haptic.select();
    const next = Math.max(1, count + delta);
    setCount(next);
    onScale(next / countable.estimatedCount);
  };

  const label = count === 1 ? countable.unitLabel : `${countable.unitLabel}s`;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <SymbolView name="number" size={13} tintColor={Colors.inkSecondary} />
        <Text style={styles.label}>
          Hard to tell from the photo — AI guessed {countable.estimatedCount} {countable.unitLabel}
          {countable.estimatedCount === 1 ? '' : 's'}
        </Text>
      </View>
      <View style={styles.countRow}>
        <Pressable onPress={() => bump(-1)} hitSlop={8} style={({ pressed }) => [styles.stepper, pressed && { backgroundColor: Colors.cardPressed }]}>
          <SymbolView name="minus" size={14} tintColor={Colors.ink} />
        </Pressable>
        <Text style={styles.countValue}>
          {count} {label}
        </Text>
        <Pressable onPress={() => bump(1)} hitSlop={8} style={({ pressed }) => [styles.stepper, pressed && { backgroundColor: Colors.cardPressed }]}>
          <SymbolView name="plus" size={14} tintColor={Colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.inkSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.hairline,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unit: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.inkMuted,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  stepper: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
    minWidth: 90,
    textAlign: 'center',
  },
});
