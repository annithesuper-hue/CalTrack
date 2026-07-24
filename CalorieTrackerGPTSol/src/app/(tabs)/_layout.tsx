import { Redirect, Tabs, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@clerk/expo';

import { colors } from '@/constants/design';
import { usePurchases } from '@/providers/purchases-provider';

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const purchases = usePurchases();
  if (!isLoaded || !purchases.ready) return null;
  if (!isSignedIn || !purchases.isPro) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: '#909990',
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name={focused ? 'house.fill' : 'house'}
              size={23}
              tintColor={focused ? colors.ink : '#909990'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Trends',
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name={focused ? 'chart.bar.fill' : 'chart.bar'}
              size={23}
              tintColor={focused ? colors.ink : '#909990'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push('/camera');
          },
        }}
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.scan}>
              <SymbolView name="camera.fill" size={25} tintColor={colors.ink} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name={focused ? 'gearshape.fill' : 'gearshape'}
              size={23}
              tintColor={focused ? colors.ink : '#909990'}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 88,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#FFFFFFF5',
    borderTopColor: colors.line,
  },
  item: { paddingTop: 2 },
  label: { fontSize: 11, fontWeight: '700' },
  scan: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -21,
    borderWidth: 5,
    borderColor: colors.canvas,
  },
});

