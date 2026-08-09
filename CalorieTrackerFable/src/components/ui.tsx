import React from 'react';
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
import { Colors, Radius, Shadow, Spacing, Type } from '@/lib/theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, disabled, loading, variant = 'primary', style }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const textStyle: TextStyle[] = [styles.buttonText];
  if (variant === 'secondary') textStyle.push({ color: Colors.ink });
  if (variant === 'ghost') textStyle.push({ color: Colors.inkSecondary, fontSize: 15 });
  if (variant === 'danger') textStyle.push({ color: Colors.danger });

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
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : Colors.ink} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={[Type.micro, styles.sectionLabel]}>{children}</Text>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  buttonPrimary: {
    backgroundColor: Colors.accent,
    ...Shadow.float,
  },
  buttonSecondary: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.hairline,
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
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadow.card,
  },
  sectionLabel: {
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.hairline,
    marginVertical: Spacing.md,
  },
});
