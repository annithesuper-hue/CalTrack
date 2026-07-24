import { useAuth, useSignIn, useSignUp } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Field, PrimaryButton, Screen } from '@/components/ui';
import { colors } from '@/constants/design';

type AuthStep = 'credentials' | 'verify-signup' | 'verify-signin';

function firstError(error: unknown) {
  const candidate = error as {
    errors?: Array<{ code?: string; longMessage?: string; message?: string }>;
  };
  return candidate.errors?.[0];
}

export default function AuthScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn, fetchStatus: signInStatus } = useSignIn();
  const { signUp, fetchStatus: signUpStatus } = useSignUp();
  const [step, setStep] = useState<AuthStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  if (isLoaded && isSignedIn) return <Redirect href="/" />;

  const finalizeSignIn = async () => {
    await signIn.finalize({
      navigate: () => router.replace('/'),
    });
  };

  const finalizeSignUp = async () => {
    await signUp.finalize({
      navigate: () => router.replace('/'),
    });
  };

  const submit = async () => {
    setMessage(null);
    const { error } = await signIn.password({ emailAddress: email.trim(), password });
    if (!error) {
      if (signIn.status === 'complete') {
        await finalizeSignIn();
        return;
      }
      if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (sendError) setMessage(firstError(sendError)?.longMessage ?? 'Could not send the code.');
        else setStep('verify-signin');
        return;
      }
      setMessage('One more verification step is required for this account.');
      return;
    }

    const detail = firstError(error);
    if (detail?.code !== 'form_identifier_not_found') {
      setMessage(detail?.longMessage ?? detail?.message ?? 'Sign in failed.');
      return;
    }

    const { error: signUpError } = await signUp.password({
      emailAddress: email.trim(),
      password,
    });
    if (signUpError) {
      const signUpDetail = firstError(signUpError);
      setMessage(signUpDetail?.longMessage ?? signUpDetail?.message ?? 'Sign up failed.');
      return;
    }
    const { error: codeError } = await signUp.verifications.sendEmailCode();
    if (codeError) {
      setMessage(firstError(codeError)?.longMessage ?? 'Could not send the verification code.');
      return;
    }
    setStep('verify-signup');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const verify = async () => {
    setMessage(null);
    if (step === 'verify-signup') {
      const { error } = await signUp.verifications.verifyEmailCode({ code });
      if (error) {
        setMessage(firstError(error)?.longMessage ?? 'That code is not valid.');
        return;
      }
      if (signUp.status === 'complete') await finalizeSignUp();
      return;
    }
    const { error } = await signIn.mfa.verifyEmailCode({ code });
    if (error) {
      setMessage(firstError(error)?.longMessage ?? 'That code is not valid.');
      return;
    }
    if (signIn.status === 'complete') await finalizeSignIn();
  };

  const busy = signInStatus === 'fetching' || signUpStatus === 'fetching';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen style={styles.screen}>
        <View style={styles.brand}>
          <View style={styles.mark}>
            <AppText variant="heading" color={colors.lime}>C</AppText>
          </View>
          <AppText variant="eyebrow" color={colors.limeDark}>YOUR CALTRACK ACCOUNT</AppText>
        </View>

        <View style={styles.copy}>
          <AppText variant="hero">
            {step === 'credentials' ? 'Save your plan.' : 'Check your inbox.'}
          </AppText>
          <AppText color={colors.inkMuted}>
            {step === 'credentials'
              ? 'Enter your email and password. We’ll sign you in, or create an account if you’re new.'
              : `Enter the six-digit code sent for ${email}.`}
          </AppText>
        </View>

        <Card style={styles.form}>
          {step === 'credentials' ? (
            <>
              <Field
                label="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@example.com"
                testID="auth-email"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                placeholder="At least 8 characters"
                testID="auth-password"
              />
              <View nativeID="clerk-captcha" />
              <PrimaryButton
                label="Continue"
                onPress={submit}
                loading={busy}
                disabled={!email.trim() || password.length < 8}
                testID="auth-submit"
              />
            </>
          ) : (
            <>
              <View style={styles.mailIcon}>
                <SymbolView name="envelope.badge.fill" size={30} tintColor={colors.ink} />
              </View>
              <Field
                label="Verification code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                placeholder="000000"
                testID="auth-code"
              />
              <PrimaryButton
                label="Verify email"
                onPress={verify}
                loading={busy}
                disabled={code.length < 6}
                testID="auth-verify"
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  signIn.reset();
                  signUp.reset();
                  setCode('');
                  setStep('credentials');
                }}>
                <AppText variant="caption" color={colors.inkMuted} style={{ textAlign: 'center' }}>
                  Use a different email
                </AppText>
              </Pressable>
            </>
          )}
          {message ? <AppText variant="caption" color={colors.red}>{message}</AppText> : null}
        </Card>
        <AppText variant="caption" color={colors.inkMuted} style={{ textAlign: 'center' }}>
          By continuing, you agree to the Terms and Privacy Policy.
        </AppText>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center' },
  brand: { alignItems: 'center', gap: 12 },
  mark: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: 10 },
  form: { gap: 16, padding: 20 },
  mailIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: colors.lime,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

