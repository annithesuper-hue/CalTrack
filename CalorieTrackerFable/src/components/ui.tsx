import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { haptic } from '@/lib/haptics';
import { Radius, Spacing, useTheme, type Theme } from '@/lib/theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, disabled, loading, variant = 'primary', style }: ButtonProps) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isPrimary = variant === 'primary';
  const textStyle: TextStyle[] = [styles.buttonText];
  if (variant === 'secondary') textStyle.push({ color: colors.ink });
  if (variant === 'ghost') textStyle.push({ color: colors.inkSecondary, fontSize: 15 });
  if (variant === 'danger') textStyle.push({ color: colors.danger });

  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isPrimary && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDangerOutline,
        (disabled || loading) && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.accentInk : colors.ink} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <Text style={[theme.type.micro, styles.sectionLabel]}>{children}</Text>;
}

export function Divider() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.divider} />;
}

function createStyles(theme: Theme) {
  const { colors, shadow } = theme;
  return StyleSheet.create({
    button: {
      height: 56,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xl,
    },
    buttonPrimary: {
      backgroundColor: colors.accent,
      ...shadow.float,
    },
    buttonSecondary: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    buttonGhost: {
      height: 44,
    },
    buttonDangerOutline: {
      backgroundColor: 'transparent',
      height: 48,
    },
    buttonText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.accentInk,
      letterSpacing: -0.2,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      ...shadow.card,
    },
    sectionLabel: {
      marginBottom: Spacing.md,
      marginLeft: Spacing.xs,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.hairline,
      marginVertical: Spacing.md,
    },
  });
}
