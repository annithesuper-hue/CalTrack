import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { MEAL_TYPES, MealTypeMeta } from '@/lib/meal-type';
import { Colors, Radius, Spacing } from '@/lib/theme';
import type { MealType } from '@/lib/types';

/** Horizontal Breakfast / Lunch / Dinner / Snack / Other segmented picker. */
export function MealTypePicker({ value, onChange }: { value: MealType; onChange: (type: MealType) => void }) {
  return (
    <View style={styles.row}>
      {MEAL_TYPES.map((type) => {
        const meta = MealTypeMeta[type];
        const active = value === type;
        return (
          <Pressable
            key={type}
            onPress={() => {
              haptic.tap();
              onChange(type);
            }}
            style={[styles.chip, active && { backgroundColor: meta.color, borderColor: meta.color }]}>
            <SymbolView name={meta.icon} size={13} tintColor={active ? '#FFFFFF' : Colors.inkSecondary} />
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.bg,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.inkSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
