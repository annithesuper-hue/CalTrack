import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';

const C = Colors.dark;

const VALUE_PROPS = [
  {
    icon: 'camera.fill' as const,
    title: 'AI food scanning',
    body: 'Point your camera at any meal and get instant nutrition estimates.',
  },
  {
    icon: 'chart.bar.fill' as const,
    title: 'Calories & macros, tracked',
    body: 'Protein, carbs and fat — automatically tallied against your targets.',
  },
  {
    icon: 'flame.fill' as const,
    title: 'Hit your daily goals',
    body: 'A plan built around your body, your activity and your goal.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.logoMark}>
            <SymbolView name="flame.fill" size={44} tintColor={C.background} />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(200).springify()} style={styles.appName}>
            CalTrack
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(300).springify()} style={styles.tagline}>
            Snap a photo. Know your calories.
          </Animated.Text>
        </View>

        <View style={styles.props}>
          {VALUE_PROPS.map((prop, i) => (
            <Animated.View
              key={prop.icon}
              entering={FadeInDown.delay(450 + i * 120).springify()}
              style={styles.propRow}>
              <View style={styles.propIcon}>
                <SymbolView name={prop.icon} size={22} tintColor={C.tint} />
              </View>
              <View style={styles.propText}>
                <Text style={styles.propTitle}>{prop.title}</Text>
                <Text style={styles.propBody}>{prop.body}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(850).springify()}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // Cast: expo-router typed routes (.expo/types) are not generated yet.
              router.push('/stats' as any);
            }}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
            <Text style={styles.ctaText}>Get Started</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    justifyContent: 'space-between',
  },
  hero: { alignItems: 'center', marginTop: Spacing.six },
  logoMark: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  appName: {
    fontSize: 52,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 19,
    color: C.textSecondary,
    marginTop: Spacing.two,
    textAlign: 'center',
  },
  props: { gap: Spacing.three },
  propRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  propIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: C.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propText: { flex: 1, gap: 2 },
  propTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  propBody: { fontSize: 14, color: C.textSecondary, lineHeight: 20 },
  cta: {
    backgroundColor: C.tint,
    borderRadius: Radius.full,
    paddingVertical: 19,
    alignItems: 'center',
  },
  ctaPressed: { opacity: 0.75 },
  ctaText: { color: C.background, fontSize: 18, fontWeight: '800' },
});
