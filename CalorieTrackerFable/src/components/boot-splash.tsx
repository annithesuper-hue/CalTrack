import { Image } from 'expo-image';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  type AnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { ViewProps } from 'react-native';

import { ThemeColors, useColors, useTypeStyles } from '@/lib/theme';

/**
 * Custom in-JS loading screen shown briefly on cold start, after the native
 * splash hands off. Keeps the same background/mark as the native splash so
 * the transition is seamless, with a small pulse animation so it doesn't
 * read as frozen while auth/purchases/db are getting ready.
 */
export function BootSplash({
  style,
  exiting,
}: {
  style?: React.ComponentProps<typeof Animated.View>['style'];
  exiting?: AnimatedProps<ViewProps>['exiting'];
}) {
  const pulse = useSharedValue(0.4);
  const colors = useColors();
  const Type = useTypeStyles(colors);
  const styles = useMemo(() => createStyles(colors, Type), [colors, Type]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 650, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View style={[styles.wrap, style]} exiting={exiting} pointerEvents="none">
      <Image source={require('../../assets/images/splash-icon.png')} style={styles.mark} contentFit="contain" />
      <Text style={styles.title}>CalTrack</Text>
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, dotStyle]} />
        <Animated.View style={[styles.dot, dotStyle]} />
        <Animated.View style={[styles.dot, dotStyle]} />
      </View>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors, Type: ReturnType<typeof useTypeStyles>) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
    },
    mark: {
      width: 96,
      height: 96,
    },
    title: {
      ...Type.title,
      fontSize: 22,
      color: colors.ink,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.ink,
    },
  });
