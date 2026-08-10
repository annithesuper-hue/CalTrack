import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Spacing, ThemeColors, useColors, useTypeStyles } from '@/lib/theme';

type OnboardingScreenProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  ctaTitle?: string;
  ctaDisabled?: boolean;
  onNext: () => void;
};

export function OnboardingScreen({ title, subtitle, children, ctaTitle = 'Continue', ctaDisabled, onNext }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const Type = useTypeStyles(colors);
  const styles = useMemo(() => createStyles(colors, Type), [colors, Type]);
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(400)} style={styles.textBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.body}>
          {children}
        </Animated.View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Button title={ctaTitle} onPress={onNext} disabled={ctaDisabled} />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors, Type: ReturnType<typeof useTypeStyles>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: Spacing.screen,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.xxl,
    },
    textBlock: {
      gap: Spacing.sm,
      marginBottom: Spacing.xxl,
    },
    title: {
      ...Type.title,
      lineHeight: 34,
    },
    subtitle: {
      ...Type.secondary,
      lineHeight: 22,
    },
    body: {
      gap: Spacing.md,
    },
    footer: {
      paddingHorizontal: Spacing.screen,
      paddingTop: Spacing.sm,
      backgroundColor: colors.bg,
    },
  });
