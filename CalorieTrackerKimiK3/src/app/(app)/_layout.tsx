import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

const C = Colors.dark;

/**
 * App tabs. Uses the SDK 57 native tab bar (expo-router/unstable-native-tabs):
 * real UITabBar on iOS with built-in selection feedback.
 * Header is rendered in-screen by the shared <Screen> wrapper because native
 * tabs provide no JS header slot.
 */
export default function AppTabsLayout() {
  return (
    <NativeTabs
      tintColor={C.tint}
      backgroundColor={C.backgroundElement}
      blurEffect="systemChromeMaterialDark"
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'flame', selected: 'flame.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
