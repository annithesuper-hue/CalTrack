import { useSignIn } from '@clerk/expo';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthInput, AuthScreen, ErrorText } from '@/components/auth-ui';
import { Button } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { Spacing, useTheme, type Theme } from '@/lib/theme';

export default function SignIn() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
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
      // Don't touch local onboarding/profile state here — the store's own
      // effect (in `store.tsx`) reacts to Clerk's userId changing, switches
      // to this account's own database, and loads its real saved data. That
      // keeps this screen from racing the auth-state update or writing to
      // whatever database happens to still be active at this exact instant.
      await signIn.finalize();
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
