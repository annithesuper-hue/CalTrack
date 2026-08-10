import { Stack } from 'expo-router';
import React from 'react';

import { useColors } from '@/lib/theme';

export default function AuthLayout() {
  const colors = useColors();
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
