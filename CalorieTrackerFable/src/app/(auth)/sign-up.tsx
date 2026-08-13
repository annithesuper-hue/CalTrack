import { useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthInput, AuthScreen, ErrorText } from '@/components/auth-ui';
import { Button } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { Spacing, useTheme, type Theme } from '@/lib/theme';

export default function SignUp() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showCodeStep, setShowCodeStep] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const busy = fetchStatus === 'fetching';

  const handleSignUp = async () => {
    setFormError(null);
    const { error } = await signUp.password({ emailAddress, password });
    if (error) {
      setFormError(error.longMessage ?? error.message ?? 'Something went wrong');
      haptic.error();
      return;
    }
    if (signUp.status === 'missing_requirements' && signUp.unverifiedFields.includes('email_address')) {
      await signUp.verifications.sendEmailCode();
      setShowCodeStep(true);
      haptic.tap();
    } else if (signUp.status === 'complete') {
      await finish();
    }
  };

  const handleVerify = async () => {
    setFormError(null);
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) {
      setFormError(error.longMessage ?? 'Invalid code, try again');
      haptic.error();
      return;
    }
    if (signUp.status === 'complete') {
      await finish();
    }
  };

  const finish = async () => {
    // The store's own effect (in `store.tsx`) reacts to Clerk's userId
    // changing: it opens this brand-new account's own database and adopts
    // the profile/goals computed during onboarding into it. Nothing needs
    // to happen here beyond finishing the Clerk sign-up.
    await signUp.finalize();
    haptic.success();
    router.replace('/');
  };

  if (showCodeStep) {
    return (
      <AuthScreen
        title="Check your email"
        subtitle={`We sent a 6-digit code to ${emailAddress}. Enter it below to verify your account.`}>
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
        <Button title="Verify" onPress={handleVerify} loading={busy} disabled={code.length < 6} />
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Didn't get it?</Text>
          <Text
            style={styles.footerLink}
            onPress={() => {
              void signUp.verifications.sendEmailCode();
              haptic.tap();
            }}>
            Resend code
          </Text>
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Your plan is saved on this device. Create an account to unlock it.">
      <AuthInput
        label="Email"
        value={emailAddress}
        onChangeText={setEmailAddress}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <AuthInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        placeholder="8+ characters"
      />
      <ErrorText>{formError ?? errors.fields.emailAddress?.message ?? errors.fields.password?.message}</ErrorText>
      {/* Clerk bot protection mounts here */}
      <View nativeID="clerk-captcha" />
      <Button title="Continue" onPress={handleSignUp} loading={busy} disabled={!emailAddress || password.length < 8} />
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Text style={styles.footerLink} onPress={() => router.push('/(auth)/sign-in')}>
          Sign in
        </Text>
      </View>
    </AuthScreen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      marginTop: Spacing.sm,
    },
    footerText: {
      fontSize: 14,
      color: theme.colors.inkSecondary,
    },
    footerLink: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.ink,
    },
  });
}
