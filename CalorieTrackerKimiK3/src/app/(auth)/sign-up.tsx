import { useSignUp } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import { Link, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useRef, useState } from 'react';
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
const CODE_LENGTH = 6;

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();

  const [step, setStep] = useState<'form' | 'code'>('form');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const codeInputRef = useRef<TextInput>(null);

  const fetching = fetchStatus === 'fetching';

  const handleCreateAccount = async () => {
    if (fetching) return;
    const { error } = await signUp.password({ emailAddress, password });
    if (error) return; // surfaced via errors.fields / errors.global

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) return;
    setStep('code');
  };

  const handleVerify = async (value: string) => {
    if (fetching || value.length !== CODE_LENGTH) return;
    const { error } = await signUp.verifications.verifyEmailCode({ code: value });
    if (error) return;

    if (signUp.status === 'complete') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Cast: expo-router typed routes (.expo/types) are not generated yet.
      await signUp.finalize({ navigate: () => router.replace('/' as any) });
    }
  };

  const handleResend = async () => {
    if (fetching) return;
    await signUp.verifications.sendEmailCode();
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

          {step === 'form' ? (
            <>
              <Text style={styles.headline}>Create your account</Text>
              <Text style={styles.subline}>Your plan is ready — claim it.</Text>

              <View style={styles.form}>
                <Field
                  label="Email"
                  value={emailAddress}
                  onChangeText={setEmailAddress}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={errors.fields.emailAddress?.message}
                />
                <Field
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
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
                    void handleCreateAccount();
                  }}
                  disabled={fetching}
                  style={({ pressed }) => [
                    styles.cta,
                    (pressed || fetching) && styles.ctaPressed,
                  ]}>
                  <Text style={styles.ctaText}>
                    {fetching ? 'Creating…' : 'Create Account'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                {/* Cast: typed routes not generated yet. */}
                <Link href={'/sign-in' as any} style={styles.footerLink}>
                  Sign in
                </Link>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.headline}>Check your inbox</Text>
              <Text style={styles.subline}>
                We sent a 6-digit code to {emailAddress}.
              </Text>

              <Pressable
                style={styles.codeRow}
                onPress={() => codeInputRef.current?.focus()}>
                {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                  const digit = code[i] ?? '';
                  const active = i === code.length;
                  return (
                    <View
                      key={i}
                      style={[styles.codeCell, active && styles.codeCellActive]}>
                      <Text style={styles.codeDigit}>{digit}</Text>
                    </View>
                  );
                })}
              </Pressable>

              <TextInput
                ref={codeInputRef}
                value={code}
                onChangeText={(t) => {
                  const next = t.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
                  setCode(next);
                  if (next.length === CODE_LENGTH) void handleVerify(next);
                }}
                keyboardType="number-pad"
                autoFocus
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                style={styles.hiddenInput}
              />

              {errors.fields.code?.message ? (
                <Text style={styles.globalError}>{errors.fields.code.message}</Text>
              ) : null}
              {errors.global?.[0] ? (
                <Text style={styles.globalError}>{errors.global[0].message}</Text>
              ) : null}

              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  void handleVerify(code);
                }}
                disabled={fetching || code.length !== CODE_LENGTH}
                style={({ pressed }) => [
                  styles.cta,
                  (pressed || fetching || code.length !== CODE_LENGTH) && styles.ctaPressed,
                ]}>
                <Text style={styles.ctaText}>{fetching ? 'Verifying…' : 'Verify'}</Text>
              </Pressable>

              <Pressable onPress={() => void handleResend()} disabled={fetching}>
                <Text style={styles.resend}>Didn't get it? Resend code</Text>
              </Pressable>
            </>
          )}

          {/* Clerk bot protection mount point — required on sign-up screens. */}
          <View nativeID="clerk-captcha" />
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
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  codeCell: {
    width: 48,
    height: 60,
    borderRadius: Radius.md,
    backgroundColor: C.backgroundElement,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCellActive: { borderColor: C.tint },
  codeDigit: { fontSize: 28, fontWeight: '800', color: C.text },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0, width: 0 },
  cta: {
    backgroundColor: C.tint,
    borderRadius: Radius.full,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  ctaPressed: { opacity: 0.7 },
  ctaText: { color: C.background, fontSize: 17, fontWeight: '800' },
  resend: {
    color: C.tint,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.five,
  },
  footerText: { color: C.textSecondary, fontSize: 15 },
  footerLink: { color: C.tint, fontSize: 15, fontWeight: '700' },
});
