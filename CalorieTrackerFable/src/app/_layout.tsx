import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { usePurchases, PurchasesProvider } from '@/lib/purchases';
import { AppProvider } from '@/lib/store';
import { Colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

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

export default function RootLayout() {
  useEffect(() => {
    // The index gate redirects immediately; a short delay avoids a white flash.
    const timer = setTimeout(() => SplashScreen.hideAsync(), 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <PurchasesProvider>
          <AppProvider>
            <IdentitySync />
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.bg },
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
                name="camera"
                options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="barcode"
                options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="manual-entry"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="meal/[id]" options={{ presentation: 'modal' }} />
              <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
            </Stack>
          </AppProvider>
        </PurchasesProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
