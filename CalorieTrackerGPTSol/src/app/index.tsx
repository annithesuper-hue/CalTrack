import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors } from '@/constants/design';
import { useApp } from '@/providers/app-provider';
import { usePurchases } from '@/providers/purchases-provider';

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const app = useApp();
  const purchases = usePurchases();

  if (!app.ready || !isLoaded || !purchases.ready) {
    return (
      <View style={styles.loading}>
        <View style={styles.mark}>
          <AppText variant="heading" color={colors.lime}>C</AppText>
        </View>
        <ActivityIndicator color={colors.limeDark} />
      </View>
    );
  }
  if (!app.onboardingComplete) return <Redirect href="/onboarding" />;
  if (!isSignedIn) return <Redirect href="/auth" />;
  if (!purchases.isPro) return <Redirect href="/paywall" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: colors.canvas,
  },
  mark: {
    width: 68,
    height: 68,
    borderRadius: 23,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
