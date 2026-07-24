import { useAuth } from '@clerk/expo';
import * as SplashScreen from 'expo-splash-screen';
import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { usePro } from '@/lib/revenuecat';
import { useApp } from '@/lib/store';

/**
 * Root gate: decides where a cold start lands.
 * onboarding → sign-in → paywall → app
 */
export default function Index() {
  const { ready, onboarded } = useApp();
  const { isLoaded, isSignedIn } = useAuth();
  const { ready: proReady, isPro } = usePro();

  const settled = ready && isLoaded && proReady;

  useEffect(() => {
    if (settled) void SplashScreen.hideAsync().catch(() => {});
  }, [settled]);

  if (!settled) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.dark.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={Colors.dark.accent} />
      </View>
    );
  }

  if (!onboarded) return <Redirect href={'/(onboarding)' as never} />;
  if (!isSignedIn) return <Redirect href={'/(auth)/sign-in' as never} />;
  if (!isPro) return <Redirect href={'/paywall' as never} />;
  return <Redirect href={'/(app)' as never} />;
}
