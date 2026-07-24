import { Gauge, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  lineLimit,
  padding,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type ProgressActivityProps = {
  mealEmoji: string;
  mealName: string;
  mealCalories: number;
  consumed: number;
  goal: number;
};

const ProgressActivityView = (props: ProgressActivityProps, _environment: LiveActivityEnvironment) => {
  'widget';
  const consumed = props.consumed ?? 0;
  const goal = props.goal || 2200;
  const fraction = Math.min(1, goal > 0 ? consumed / goal : 0);
  const left = Math.max(0, goal - consumed);

  const banner = (
    <VStack alignment="leading" spacing={10} modifiers={[activityBackgroundTint('#191712'), padding({ all: 16 })]}>
      <HStack spacing={8}>
        <Text modifiers={[font({ size: 22 })]}>{props.mealEmoji}</Text>
        <VStack alignment="leading" spacing={1}>
          <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle('#FFFFFF'), lineLimit(1)]}>
            {`Logged ${props.mealName}`}
          </Text>
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle('#A39C89')]}>
            {`+${props.mealCalories} kcal`}
          </Text>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={1}>
          <Text modifiers={[font({ size: 17, weight: 'heavy', design: 'rounded' }), foregroundStyle('#FFFFFF')]}>
            {`${left}`}
          </Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle('#A39C89')]}>kcal left</Text>
        </VStack>
      </HStack>
      <Gauge
        value={fraction}
        modifiers={[gaugeStyle('linearCapacity'), tint('#3E9B5F'), frame({ height: 8 })]}
      />
    </VStack>
  );

  return {
    banner,
    compactLeading: (
      <Image systemName="flame.fill" modifiers={[foregroundStyle('#3E9B5F'), frame({ width: 20, height: 20 })]} />
    ),
    compactTrailing: (
      <Text modifiers={[font({ size: 13, weight: 'bold', design: 'rounded' }), foregroundStyle('#FFFFFF')]}>
        {`${left}`}
      </Text>
    ),
    minimal: (
      <Image systemName="flame.fill" modifiers={[foregroundStyle('#3E9B5F'), frame({ width: 18, height: 18 })]} />
    ),
    expandedLeading: (
      <HStack spacing={6} modifiers={[padding({ leading: 8 })]}>
        <Text modifiers={[font({ size: 20 })]}>{props.mealEmoji}</Text>
        <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle('#FFFFFF'), lineLimit(2)]}>
          {props.mealName}
        </Text>
      </HStack>
    ),
    expandedTrailing: (
      <Text
        modifiers={[font({ size: 15, weight: 'heavy', design: 'rounded' }), foregroundStyle('#FFFFFF'), padding({ trailing: 8 })]}>
        {`${left} left`}
      </Text>
    ),
    expandedBottom: (
      <Gauge
        value={fraction}
        modifiers={[gaugeStyle('linearCapacity'), tint('#3E9B5F'), frame({ height: 8 }), padding({ horizontal: 8, bottom: 4 })]}
      />
    ),
  };
};

export const ProgressActivity = createLiveActivity<ProgressActivityProps>(
  'CalTrackActivity',
  ProgressActivityView,
);
