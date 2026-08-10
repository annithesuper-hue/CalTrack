import React, { useEffect } from 'react';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useColors } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RingProps = {
  size: number;
  strokeWidth: number;
  /** 0..1 */
  progress: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
};

/** Animated circular progress ring with content slot in the middle. */
export function Ring({ size, strokeWidth, progress, color, trackColor, children }: RingProps) {
  const colors = useColors();
  const ringColor = color ?? colors.ring;
  const ringTrackColor = trackColor ?? colors.ringTrack;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animated = useSharedValue(0);

  useEffect(() => {
    animated.value = withSpring(Math.min(1, Math.max(0, progress)), {
      damping: 20,
      stiffness: 90,
    });
  }, [progress, animated]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  return (
    <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringTrackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          fill="none"
        />
      </Svg>
      {children}
    </Animated.View>
  );
}
