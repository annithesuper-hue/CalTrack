import { Stack } from 'expo-router';
import React from 'react';

import { Colors } from '@/lib/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.bg },
      }}
    />
  );
}
