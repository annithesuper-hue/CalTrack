import { useSignIn } from '@clerk/expo';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthInput, AuthScreen, ErrorText } from '@/components/auth-ui';
import { Button } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/lib/store';
import { Spacing, ThemeColors, useColors } from '@/lib/theme';

type Mode = 'password' | 'code';

export default function SignIn() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { completeOnboarding } = useApp();
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mode, setMode] = useState<Mode>('code');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const busy = fetchStatus === 'fetching';

  const finish = async () => {
    completeOnboarding();
    haptic.success();
    router.replace('/');
  };

  const handleSendCode = async () => {
    setFormError(null);
    const { error } = await signIn.emailCode.sendCode({ emailAddress });
    if (error) {
      setFormError(error.longMessage ?? error.message ?? 'Something went wrong');
      haptic.error();
      return;
    }
    setCodeSent(true);
    haptic.tap();
  };

  const handleVerifyCode = async () => {
    setFormError(null);
    const { error } = await signIn.emailCode.verifyCode({ code });
    if (error) {
      setFormError(error.longMessage ?? 'Invalid code, try again');
      haptic.error();
      return;
    }
    if (signIn.status === 'complete') {
      await signIn.finalize();
      await finish();
    } else {
      setFormError('Additional verification is required for this account.');
    }
  };

  const handlePasswordSignIn = async () => {
    setFormError(null);
    const { error } = await signIn.password({ emailAddress, password });
    if (error) {
      setFormError(error.longMessage ?? error.message ?? 'Something went wrong');
      haptic.error();
      return;
    }
    if (signIn.status === 'complete') {
      await signIn.finalize();
      await finish();
    } else {
      setFormError('Additional verification is required for this account.');
    }
  };

  if (mode === 'code' && codeSent) {
    return (
      <AuthScreen
        title="Enter the code"
        subtitle={`We sent a 6-digit code to ${emailAddress}. It only unlocks your own account — nobody else's login is affected.`}>
        <AuthInput
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoFocus
          maxLength={6}
          placeholder="123456"
        />
        <ErrorText>{formError}</ErrorText>
        <Button title="Verify & sign in" onPress={handleVerifyCode} loading={busy} disabled={code.length < 6} />
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Didn't get it?</Text>
          <Text
            style={styles.footerLink}
            onPress={() => {
              void signIn.emailCode.sendCode({ emailAddress });
              haptic.tap();
            }}>
            Resend code
          </Text>
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Welcome back" subtitle="Sign in to pick up right where you left off.">
      <AuthInput
        label="Email"
        value={emailAddress}
        onChangeText={setEmailAddress}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
      />

      {mode === 'password' && (
        <AuthInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          placeholder="Your password"
        />
      )}

      <ErrorText>{formError ?? errors.fields.identifier?.message ?? errors.fields.password?.message}</ErrorText>

      {mode === 'code' ? (
        <Button title="Send me a code" onPress={handleSendCode} loading={busy} disabled={!emailAddress} />
      ) : (
        <Button title="Sign In" onPress={handlePasswordSignIn} loading={busy} disabled={!emailAddress || !password} />
      )}

      <Text
        style={styles.switchModeLink}
        onPress={() => {
          haptic.tap();
          setFormError(null);
          setMode(mode === 'code' ? 'password' : 'code');
        }}>
        {mode === 'code' ? 'Use password instead' : 'Sign in with a one-time code instead'}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>New to CalTrack?</Text>
        <Text style={styles.footerLink} onPress={() => router.push('/(onboarding)/goal')}>
          Get started
        </Text>
      </View>
    </AuthScreen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      marginTop: Spacing.sm,
    },
    footerText: {
      fontSize: 14,
      color: colors.inkSecondary,
    },
    footerLink: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.ink,
    },
    switchModeLink: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
      textAlign: 'center',
      marginTop: Spacing.xs,
    },
  });
