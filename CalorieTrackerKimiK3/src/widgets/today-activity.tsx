import { HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  lineLimit,
  padding,
  progressViewStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type TodayActivityProps = {
  calories: number;
  calorieGoal: number;
  protein: number;
  carbs: number;
  fat: number;
  lastMealName: string;
};

const TodayActivity = (props: TodayActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  // NOTE: the widget bundle evaluates this component in isolation — every
  // helper and constant must live INSIDE the component body.
  const ACCENT = '#B6F04A';
  const SECONDARY = '#8B94A1';
  const PROTEIN = '#FF8A75';
  const CARBS = '#FFCE54';
  const FAT = '#6EC1FF';
  const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

  const remaining = Math.max(0, props.calorieGoal - props.calories);
  const progress = props.calorieGoal > 0 ? Math.min(1, props.calories / props.calorieGoal) : 0;
  const overGoal = props.calorieGoal > 0 && props.calories > props.calorieGoal;
  void environment;

  return {
    banner: (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 14 })]}>
        <HStack alignment="center">
          <VStack alignment="leading" spacing={0}>
            <Text
              modifiers={[
                font({ size: 30, weight: 'bold', design: 'rounded' }),
                foregroundStyle(ACCENT),
              ]}>
              {fmt(remaining)}
            </Text>
            <Text modifiers={[font({ size: 12 }), foregroundStyle(SECONDARY)]}>
              {overGoal ? 'kcal over goal' : 'kcal left today'}
            </Text>
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={2}>
            <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>
              {`${fmt(props.calories)} / ${fmt(props.calorieGoal)} kcal`}
            </Text>
            <Text
              modifiers={[
                font({ size: 11 }),
                foregroundStyle(SECONDARY),
                lineLimit(1),
              ]}>
              {props.lastMealName ? `Last: ${props.lastMealName}` : 'No meals logged yet'}
            </Text>
          </VStack>
        </HStack>
        <ProgressView value={progress} modifiers={[progressViewStyle('linear'), tint(ACCENT)]} />
        <HStack spacing={12}>
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(PROTEIN)]}>
            {`P ${Math.round(props.protein)}g`}
          </Text>
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(CARBS)]}>
            {`C ${Math.round(props.carbs)}g`}
          </Text>
          <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(FAT)]}>
            {`F ${Math.round(props.fat)}g`}
          </Text>
        </HStack>
      </VStack>
    ),
    compactLeading: (
      <Text modifiers={[font({ weight: 'bold', design: 'rounded' }), foregroundStyle(ACCENT)]}>
        {fmt(remaining)}
      </Text>
    ),
    compactTrailing: (
      <Text modifiers={[font({ size: 11 }), foregroundStyle(SECONDARY)]}>kcal left</Text>
    ),
    minimal: (
      <Text modifiers={[font({ weight: 'bold', design: 'rounded' }), foregroundStyle(ACCENT)]}>
        {fmt(remaining)}
      </Text>
    ),
    expandedLeading: (
      <VStack alignment="leading" spacing={0} modifiers={[padding({ leading: 12 })]}>
        <Text
          modifiers={[
            font({ size: 22, weight: 'bold', design: 'rounded' }),
            foregroundStyle(ACCENT),
          ]}>
          {fmt(remaining)}
        </Text>
        <Text modifiers={[font({ size: 10 }), foregroundStyle(SECONDARY)]}>kcal left</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={0} modifiers={[padding({ trailing: 12 })]}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>
          {`${fmt(props.calories)} / ${fmt(props.calorieGoal)}`}
        </Text>
        <Text modifiers={[font({ size: 10 }), foregroundStyle(SECONDARY)]}>kcal</Text>
      </VStack>
    ),
    expandedBottom: (
      <HStack alignment="center" modifiers={[padding({ horizontal: 12, bottom: 8 })]}>
        <Text
          modifiers={[font({ size: 11 }), foregroundStyle(SECONDARY), lineLimit(1)]}>
          {props.lastMealName || 'No meals logged yet'}
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(PROTEIN)]}>
          {`P ${Math.round(props.protein)}`}
        </Text>
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(CARBS)]}>
          {` C ${Math.round(props.carbs)}`}
        </Text>
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(FAT)]}>
          {` F ${Math.round(props.fat)}`}
        </Text>
      </HStack>
    ),
  };
};

export default createLiveActivity('TodayActivity', TodayActivity);
