import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { Radius, Spacing, useTheme, type Theme } from '@/lib/theme';

type Option = {
  icon: SFSymbol;
  title: string;
  subtitle: string;
  iconBg: string;
  onPress: () => void;
};

export default function AddFood() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { colors } = theme;
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const options: Option[] = [
    {
      icon: 'camera.viewfinder',
      title: 'Analyze Food',
      subtitle: 'Take a photo and let AI estimate the nutrition.',
      iconBg: colors.accent,
      onPress: () => router.replace('/camera'),
    },
    {
      icon: 'magnifyingglass',
      title: 'Search Food',
      subtitle: 'Search a huge library of Indian & global foods by name.',
      iconBg: colors.carbs,
      onPress: () => router.replace('/search-food'),
    },
    {
      icon: 'square.and.pencil',
      title: 'Add Manually',
      subtitle: 'Enter calories and macros yourself.',
      iconBg: colors.green,
      onPress: () => router.replace('/manual-entry'),
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Food</Text>
        <Pressable
          onPress={() => {
            haptic.tap();
            router.back();
          }}
          hitSlop={10}
          style={styles.closeButton}>
          <SymbolView name="xmark" size={15} tintColor={colors.ink} weight="semibold" />
        </Pressable>
      </View>

      <View style={styles.list}>
        {options.map((opt, i) => (
          <Animated.View key={opt.title} entering={FadeInDown.duration(350).delay(i * 60)}>
            <Pressable
              onPress={() => {
                haptic.medium();
                opt.onPress();
              }}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
              <View style={[styles.iconWrap, { backgroundColor: opt.iconBg }]}>
                <SymbolView name={opt.icon} size={22} tintColor={opt.iconBg === colors.accent ? colors.accentInk : "#FFFFFF"} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.optionTitle}>{opt.title}</Text>
                <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
              </View>
              <SymbolView name="chevron.right" size={16} tintColor={colors.inkMuted} />
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: Spacing.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  title: {
    ...theme.type.title,
    fontSize: 24,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: theme.colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...theme.shadow.card,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
    letterSpacing: -0.2,
  },
  optionSubtitle: {
    fontSize: 12.5,
    color: theme.colors.inkSecondary,
    lineHeight: 17,
  },
});
}
