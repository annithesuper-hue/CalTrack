import { router, Tabs } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabBarProps = {
  state: { index: number };
  navigation: { navigate: (name: string) => void };
};

import { haptic } from '@/lib/haptics';
import { Radius, Spacing, ThemeColors, useColors, useShadow } from '@/lib/theme';

const TAB_META: Record<string, { label: string; icon: SFSymbol; iconActive: SFSymbol }> = {
  index: { label: 'Today', icon: 'sun.max', iconActive: 'sun.max.fill' },
  history: { label: 'History', icon: 'chart.bar', iconActive: 'chart.bar.fill' },
};

function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const shadow = useShadow();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);

  const renderTab = (routeName: string, index: number) => {
    const meta = TAB_META[routeName];
    const focused = state.index === index;
    return (
      <Pressable
        key={routeName}
        onPress={() => {
          if (!focused) {
            haptic.select();
            navigation.navigate(routeName);
          }
        }}
        style={styles.tabItem}>
        <SymbolView
          name={focused ? meta.iconActive : meta.icon}
          size={24}
          tintColor={focused ? colors.ink : colors.inkMuted}
        />
        <Text style={[styles.tabLabel, { color: focused ? colors.ink : colors.inkMuted }]}>{meta.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {renderTab('index', 0)}
      <Pressable
        onPress={() => {
          haptic.medium();
          router.push('/add-food');
        }}
        style={({ pressed }) => [styles.scanButton, pressed && { transform: [{ scale: 0.94 }] }]}>
        <SymbolView name="camera.fill" size={26} tintColor={colors.onAccent} />
      </Pressable>
      {renderTab('history', 1)}
    </View>
  );
}

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
    </Tabs>
  );
}

const createStyles = (colors: ThemeColors, Shadow: ReturnType<typeof useShadow>) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: colors.card,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      paddingTop: Spacing.md,
      paddingHorizontal: Spacing.xl,
      ...Shadow.float,
    },
    tabItem: {
      alignItems: 'center',
      gap: 3,
      width: 74,
      paddingVertical: 4,
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: '600',
    },
    scanButton: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -30,
      borderWidth: 4,
      borderColor: colors.bg,
      ...Shadow.float,
    },
  });
