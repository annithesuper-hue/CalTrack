import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { FoodEntry } from '@/lib/types';

const C = Colors.dark;

interface EntryRowProps {
  entry: FoodEntry;
  onPress?: () => void;
  onLongPress?: () => void;
}

function timeLabel(createdAt: number): string {
  return new Date(createdAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Meal entry card: photo thumb (or glyph fallback), name, kcal, macros, time. */
export function EntryRow({ entry, onPress, onLongPress }: EntryRowProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {entry.imageUri ? (
        <Image source={{ uri: entry.imageUri }} style={styles.thumb} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <SymbolView name="fork.knife" size={20} tintColor={C.accent} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.name}
        </Text>
        <Text style={styles.macros} numberOfLines={1}>
          P {Math.round(entry.protein)} · C {Math.round(entry.carbs)} · F {Math.round(entry.fat)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.kcal}>{Math.round(entry.calories)}</Text>
        <Text style={styles.meta}>
          kcal · {timeLabel(entry.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: Spacing.two + 4,
  },
  pressed: {
    backgroundColor: C.backgroundSelected,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
  },
  thumbFallback: {
    backgroundColor: C.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: C.text,
    fontSize: 16,
    fontWeight: '600',
  },
  macros: {
    color: C.textSecondary,
    fontSize: 13,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  kcal: {
    color: C.text,
    fontSize: 17,
    fontWeight: '800',
  },
  meta: {
    color: C.textSecondary,
    fontSize: 12,
  },
});
