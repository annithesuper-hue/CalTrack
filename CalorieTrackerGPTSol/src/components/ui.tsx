import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  type KeyboardTypeOptions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadow } from '@/constants/design';

export function Screen({
  children,
  scroll = true,
  style,
}: PropsWithChildren<{ scroll?: boolean; style?: ViewStyle }>) {
  const insets = useSafeAreaInsets();
  const contentStyle = [
    styles.screen,
    { paddingTop: Math.max(insets.top, 18), paddingBottom: Math.max(insets.bottom, 24) },
    style,
  ];
  if (!scroll) return <View style={contentStyle}>{children}</View>;
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function AppText({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: 'eyebrow' | 'hero' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'number';
  color?: string;
  style?: object;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[styles.text, textVariants[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  dark = false,
}: PropsWithChildren<{ style?: ViewStyle | ViewStyle[]; dark?: boolean }>) {
  return <View style={[styles.card, dark && styles.cardDark, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  tone = 'dark',
  icon,
  testID,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  tone?: 'dark' | 'lime' | 'light';
  icon?: SymbolViewProps['name'];
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        tone === 'lime' && styles.buttonLime,
        tone === 'light' && styles.buttonLight,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={tone === 'dark' ? colors.white : colors.ink} />
      ) : (
        <>
          {icon ? (
            <SymbolView
              name={icon}
              size={19}
              tintColor={tone === 'dark' ? colors.white : colors.ink}
            />
          ) : null}
          <AppText
            variant="label"
            color={tone === 'dark' ? colors.white : colors.ink}
            style={styles.buttonLabel}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
      <AppText variant="label">{label}</AppText>
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  label,
  tone = 'soft',
}: {
  name: SymbolViewProps['name'];
  onPress: () => void;
  label: string;
  tone?: 'soft' | 'dark';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        tone === 'dark' && styles.iconButtonDark,
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={name}
        size={20}
        tintColor={tone === 'dark' ? colors.white : colors.ink}
      />
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  suffix,
  autoCapitalize,
  autoComplete,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  suffix?: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  testID?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <AppText variant="caption" color={colors.inkMuted}>
        {label}
      </AppText>
      <View style={styles.field}>
        <TextInput
          accessibilityLabel={label}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A6AEA6"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete={autoComplete}
          style={styles.input}
        />
        {suffix ? <AppText variant="label" color={colors.inkMuted}>{suffix}</AppText> : null}
      </View>
    </View>
  );
}

export function ProgressRing({
  value,
  size = 190,
  stroke = 16,
  children,
  color = colors.lime,
  trackColor = '#344139',
}: PropsWithChildren<{
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
}>) {
  const radiusValue = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const clamped = Math.max(0, Math.min(value, 1));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={color}
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function MacroProgress({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const ratio = Math.min(value / Math.max(goal, 1), 1);
  return (
    <View style={styles.macro}>
      <View style={styles.macroTop}>
        <View style={[styles.macroDot, { backgroundColor: color }]} />
        <AppText variant="caption">{label}</AppText>
        <View style={{ flex: 1 }} />
        <AppText variant="caption" color={colors.inkMuted}>
          {value}/{goal}g
        </AppText>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading">{title}</AppText>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <AppText variant="label" color={colors.limeDark}>{action}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.canvas },
  screen: { flexGrow: 1, backgroundColor: colors.canvas, paddingHorizontal: 20, gap: 18 },
  text: { color: colors.ink, fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }) },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  cardDark: { backgroundColor: colors.ink, borderColor: colors.ink },
  primaryButton: {
    minHeight: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  buttonLime: { backgroundColor: colors.lime },
  buttonLight: { backgroundColor: colors.surfaceSoft },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { textAlign: 'center' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  secondaryButton: {
    minHeight: 50,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDark: { backgroundColor: colors.ink },
  fieldWrap: { gap: 8 },
  field: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderColor: colors.line,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  input: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: '600', paddingVertical: 15 },
  macro: { flex: 1, gap: 8 },
  macroTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroTrack: {
    height: 7,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  macroFill: { height: '100%', borderRadius: radius.pill },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

const textVariants = StyleSheet.create({
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 1.6 },
  hero: { fontSize: 42, lineHeight: 45, fontWeight: '800', letterSpacing: -1.6 },
  title: { fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -1.2 },
  heading: { fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: -0.5 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  number: { fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8 },
});
