import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { usePurchases } from '@/lib/purchases';
import { useApp } from '@/lib/store';
import { useColors } from '@/lib/theme';

/**
 * Entry gate. Routes to the right surface based on auth, onboarding and
 * subscription state:
 *   signed out → onboarding funnel (welcome)
 *   signed in, no Pro → paywall
 *   signed in + Pro → the app
 */
export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isReady, isPro } = usePurchases();
  const { isOnboarded } = useApp();
  const colors = useColors();

  if (!isLoaded || !isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href={isOnboarded ? '/(auth)/sign-in' : '/(onboarding)/welcome'} />;
  }

  if (!isPro) {
    return <Redirect href="/paywall" />;
  }

  return <Redirect href="/(tabs)" />;
}
