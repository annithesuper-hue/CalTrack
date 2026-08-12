import { router, Stack, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { Radius, Spacing, useTheme, type Theme } from '@/lib/theme';

const STEPS = ['goal', 'about', 'activity', 'plan'];

/** Onboarding stack with a shared back button + progress bar header. */
export default function OnboardingLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const step = STEPS.findIndex((s) => pathname.includes(s));
  const showHeader = step >= 0;
  const theme = useTheme();
  const { colors } = theme;
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {showHeader && (
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={() => {
              haptic.tap();
              router.back();
            }}
            hitSlop={12}
            style={styles.backButton}>
            <SymbolView name="chevron.left" size={17} tintColor={colors.ink} weight="semibold" />
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
          </View>
          <View style={{ width: 36 }} />
        </View>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: theme.colors.bg },
        }}
      />
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.sm,
    gap: Spacing.lg,
    backgroundColor: theme.colors.bg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: theme.colors.ringTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: theme.colors.ink,
  },
});
}
