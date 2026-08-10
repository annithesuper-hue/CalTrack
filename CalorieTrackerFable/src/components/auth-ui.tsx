import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { Radius, Spacing, ThemeColors, useColors, useTypeStyles } from '@/lib/theme';

export function AuthScreen({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const Type = useTypeStyles(colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => {
            haptic.tap();
            router.back();
          }}
          hitSlop={12}
          style={styles.backButton}>
          <SymbolView name="chevron.left" size={17} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <View style={styles.textBlock}>
          <Text style={Type.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthInput(props: TextInputProps & { label: string }) {
  const { label, ...rest } = props;
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: Spacing.screen,
      gap: Spacing.lg,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: Radius.full,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textBlock: {
      gap: Spacing.sm,
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    subtitle: {
      fontSize: 15,
      fontWeight: '400',
      color: colors.inkSecondary,
      lineHeight: 22,
    },
    inputWrap: {
      gap: 6,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.inkSecondary,
      marginLeft: 4,
    },
    input: {
      height: 54,
      backgroundColor: colors.card,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      paddingHorizontal: Spacing.lg,
      fontSize: 16,
      color: colors.ink,
    },
    error: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '500',
      marginLeft: 4,
    },
  });
