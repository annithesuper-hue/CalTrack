import { useSignIn } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import { Link, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';

const C = Colors.dark;

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');

  const fetching = fetchStatus === 'fetching';

  const handleSubmit = async () => {
    if (fetching) return;
    const { error } = await signIn.password({ emailAddress, password });
    if (error) return; // surfaced via errors.fields / errors.global

    if (signIn.status === 'complete') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Cast: expo-router typed routes (.expo/types) are not generated yet.
      await signIn.finalize({ navigate: () => router.replace('/' as any) });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.logoMark}>
            <SymbolView name="flame.fill" size={34} tintColor={C.background} />
          </View>

          <Text style={styles.headline}>Welcome back</Text>
          <Text style={styles.subline}>Sign in to keep tracking your calories.</Text>

          <View style={styles.form}>
            <Field
              label="Email"
              value={emailAddress}
              onChangeText={setEmailAddress}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.fields.identifier?.message}
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              error={errors.fields.password?.message}
            />

            {errors.global?.[0] ? (
              <Text style={styles.globalError}>{errors.global[0].message}</Text>
            ) : null}

            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                void handleSubmit();
              }}
              disabled={fetching}
              style={({ pressed }) => [
                styles.cta,
                (pressed || fetching) && styles.ctaPressed,
              ]}>
              <Text style={styles.ctaText}>{fetching ? 'Signing in…' : 'Sign In'}</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to CalTrack? </Text>
            {/* Cast: typed routes not generated yet. */}
            <Link href={'/sign-up' as any} style={styles.footerLink}>
              Create an account
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface FieldProps extends React.ComponentProps<typeof TextInput> {
  label: string;
  error?: string;
}

function Field({ label, error, ...inputProps }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={C.textSecondary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.inputFocused, !!error && styles.inputError]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.five,
  },
  logoMark: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  headline: {
    fontSize: 34,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  subline: {
    fontSize: 16,
    color: C.textSecondary,
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
  },
  form: { gap: Spacing.three },
  field: { gap: Spacing.two },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 17,
    color: C.text,
  },
  inputFocused: { borderColor: C.tint },
  inputError: { borderColor: C.danger },
  fieldError: { color: C.danger, fontSize: 13 },
  globalError: { color: C.danger, fontSize: 14, textAlign: 'center' },
  cta: {
    backgroundColor: C.tint,
    borderRadius: Radius.full,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  ctaPressed: { opacity: 0.7 },
  ctaText: { color: C.background, fontSize: 17, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.five,
  },
  footerText: { color: C.textSecondary, fontSize: 15 },
  footerLink: { color: C.tint, fontSize: 15, fontWeight: '700' },
});
