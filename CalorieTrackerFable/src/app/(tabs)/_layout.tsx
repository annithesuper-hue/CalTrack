import { router, Tabs } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabBarProps = {
  state: { index: number };
  navigation: { navigate: (name: string) => void };
};

import { haptic } from '@/lib/haptics';
import { Colors, Radius, Shadow, Spacing } from '@/lib/theme';

const TAB_META: Record<string, { label: string; icon: SFSymbol; iconActive: SFSymbol }> = {
  index: { label: 'Today', icon: 'sun.max', iconActive: 'sun.max.fill' },
  history: { label: 'History', icon: 'chart.bar', iconActive: 'chart.bar.fill' },
};

function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

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
          tintColor={focused ? Colors.ink : Colors.inkMuted}
        />
        <Text style={[styles.tabLabel, { color: focused ? Colors.ink : Colors.inkMuted }]}>{meta.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {renderTab('index', 0)}
      <Pressable
        onPress={() => {
          haptic.medium();
          router.push('/camera');
        }}
        style={({ pressed }) => [styles.scanButton, pressed && { transform: [{ scale: 0.94 }] }]}>
        <SymbolView name="camera.fill" size={26} tintColor="#FFFFFF" />
      </Pressable>
      {renderTab('history', 1)}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.bg },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.card,
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
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    borderWidth: 4,
    borderColor: Colors.bg,
    ...Shadow.float,
  },
});
