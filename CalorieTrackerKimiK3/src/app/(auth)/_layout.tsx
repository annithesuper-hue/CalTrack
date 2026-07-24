import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  // Cast: expo-router typed routes (.expo/types) are not generated yet.
  if (isSignedIn) return <Redirect href={'/' as any} />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.dark.background },
      }}
    />
  );
}
