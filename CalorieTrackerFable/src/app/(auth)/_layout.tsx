import { Stack } from 'expo-router';
import React from 'react';

import { useTheme } from '@/lib/theme';

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
