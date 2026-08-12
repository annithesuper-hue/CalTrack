import { SymbolView } from 'expo-symbols';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import { Radius, Spacing, useTheme, type Theme } from '@/lib/theme';

type SelectCardProps = {
  title: string;
  subtitle?: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
};

/** Tappable onboarding option with a selected state. */
export function SelectCard({ title, subtitle, emoji, selected, onPress }: SelectCardProps) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

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
        <Text style={[styles.title, selected && { color: colors.accentInk }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, selected && { color: colors.accentInk, opacity: 0.65 }]}>{subtitle}</Text>
        ) : null}
      </View>
      {selected ? <SymbolView name="checkmark.circle.fill" size={22} tintColor={colors.accentInk} /> : null}
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  const { colors, shadow } = theme;
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: colors.card,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      borderWidth: 1.5,
      borderColor: 'transparent',
      ...shadow.card,
    },
    cardSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
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
      color: colors.ink,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 13,
      color: colors.inkSecondary,
    },
  });
}
