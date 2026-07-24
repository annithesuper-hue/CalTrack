import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { Colors, Radius, Shadow, Spacing } from '@/lib/theme';

type SelectCardProps = {
  title: string;
  subtitle?: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
};

/** Tappable onboarding option with a selected state. */
export function SelectCard({ title, subtitle, emoji, selected, onPress }: SelectCardProps) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && { transform: [{ scale: 0.985 }] },
      ]}>
      {emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
      <View style={styles.textWrap}>
        <Text style={[styles.title, selected && { color: '#FFFFFF' }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, selected && { color: 'rgba(255,255,255,0.65)' }]}>{subtitle}</Text>
        ) : null}
      </View>
      {selected ? <SymbolView name="checkmark.circle.fill" size={22} tintColor="#FFFFFF" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Shadow.card,
  },
  cardSelected: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  emoji: {
    fontSize: 26,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.inkSecondary,
  },
});
