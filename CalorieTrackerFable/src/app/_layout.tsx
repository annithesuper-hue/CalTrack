import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeOut } from 'react-native-reanimated';

import { BootSplash } from '@/components/boot-splash';
import { usePurchases, PurchasesProvider } from '@/lib/purchases';
import { AppProvider } from '@/lib/store';
import { ThemeProvider, useTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

const BOOT_SPLASH_MS = 2000;

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
if (!publishableKey) {
  throw new Error('Add your Clerk Publishable Key to the .env file');
}

/** Links the Clerk identity to RevenueCat so entitlements follow the account. */
function IdentitySync() {
  const { userId, isLoaded } = useAuth();
  const { syncClerkUser } = usePurchases();

  useEffect(() => {
    if (isLoaded) syncClerkUser(userId ?? null);
  }, [isLoaded, userId, syncClerkUser]);

  return null;
}

/**
 * Navigation stack + status bar, inside ThemeProvider so both follow the
 * device's system appearance with no hardcoded scheme and no flash (the
 * theme is resolved synchronously on first render — see theme.ts).
 */
function ThemedNavigation({ showBoot }: { showBoot: boolean }) {
  const { colors, scheme } = useTheme();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} animated />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="paywall" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="add-food"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="search-food"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="camera"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="manual-entry"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="meal/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
      </Stack>
      {showBoot && <BootSplash style={{ zIndex: 10 }} exiting={FadeOut.duration(280)} />}
    </>
  );
}

export default function RootLayout() {
  const [showBoot, setShowBoot] = useState(true);

  useEffect(() => {
    // Hand off from the native splash to our in-JS boot screen almost
    // immediately (avoids a white flash), then keep the boot screen up for
    // a fixed, brief window so the app doesn't feel like it "pops" straight
    // into content while auth/purchases/db are still settling.
    const hideNative = setTimeout(() => SplashScreen.hideAsync(), 80);
    const hideBoot = setTimeout(() => setShowBoot(false), BOOT_SPLASH_MS);
    return () => {
      clearTimeout(hideNative);
      clearTimeout(hideBoot);
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <PurchasesProvider>
            <AppProvider>
              <IdentitySync />
              <ThemedNavigation showBoot={showBoot} />
            </AppProvider>
          </PurchasesProvider>
        </ClerkProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
