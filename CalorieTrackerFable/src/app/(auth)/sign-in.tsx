import { useSignIn } from '@clerk/expo';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthInput, AuthScreen, ErrorText } from '@/components/auth-ui';
import { Button } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/lib/store';
import { Colors, Spacing } from '@/lib/theme';

export default function SignIn() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const { completeOnboarding } = useApp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const busy = fetchStatus === 'fetching';

  const handleSignIn = async () => {
    setFormError(null);
    const { error } = await signIn.password({ emailAddress, password });
    if (error) {
      setFormError(error.longMessage ?? error.message ?? 'Something went wrong');
      haptic.error();
      return;
    }
    if (signIn.status === 'complete') {
      await signIn.finalize();
      completeOnboarding();
      haptic.success();
      router.replace('/');
    } else {
      setFormError('Additional verification is required for this account.');
    }
  };

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
      <AuthInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        placeholder="Your password"
      />
      <ErrorText>{formError ?? errors.fields.identifier?.message ?? errors.fields.password?.message}</ErrorText>
      <Button title="Sign In" onPress={handleSignIn} loading={busy} disabled={!emailAddress || !password} />
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>New to CalTrack?</Text>
        <Text style={styles.footerLink} onPress={() => router.push('/(onboarding)/goal')}>
          Get started
        </Text>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.sm,
  },
  footerText: {
    fontSize: 14,
    color: Colors.inkSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
});
