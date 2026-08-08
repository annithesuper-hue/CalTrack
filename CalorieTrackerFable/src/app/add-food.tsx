import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/lib/haptics';
import { Colors, Radius, Shadow, Spacing, Type } from '@/lib/theme';

type OptionProps = {
  emoji: string;
  title: string;
  subtitle: string;
  symbol: React.ComponentProps<typeof SymbolView>['name'];
  onPress: () => void;
  delay: number;
};

function Option({ emoji, title, subtitle, symbol, onPress, delay }: OptionProps) {
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(delay)}>
      <Pressable
        onPress={() => {
          haptic.medium();
          onPress();
        }}
        style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconEmoji}>{emoji}</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <SymbolView name="chevron.right" size={18} tintColor={Colors.inkMuted} />
      </Pressable>
    </Animated.View>
  );
}

export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={() => {
              haptic.tap();
              router.back();
            }}
            hitSlop={12}
            style={styles.closeButton}>
            <SymbolView name="xmark" size={16} tintColor={Colors.ink} weight="semibold" />
          </Pressable>
          <Text style={Type.heading}>Add Food</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
          showsVerticalScrollIndicator={false}>
          <Option
            emoji="📷"
            symbol="camera.fill"
            title="Analyze Food"
            subtitle="Take a photo and let AI estimate the nutrition"
            onPress={() => router.push('/camera')}
            delay={0}
          />
          <Option
            emoji="▣"
            symbol="barcode.viewfinder"
            title="Scan Barcode"
            subtitle="Scan a packaged food barcode and search USDA"
            onPress={() => router.push('/barcode')}
            delay={80}
          />
          <Option
            emoji="✎"
            symbol="square.and.pencil"
            title="Add Manually"
            subtitle="Enter nutrition information yourself"
            onPress={() => router.push('/manual-entry')}
            delay={160}
          />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.screen,
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    ...Shadow.card,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.inkSecondary,
    lineHeight: 18,
  },
});
