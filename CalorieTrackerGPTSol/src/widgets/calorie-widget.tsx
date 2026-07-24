import { HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  padding,
  progressViewStyle,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import {
  createLiveActivity,
  createWidget,
  type LiveActivityEnvironment,
  type WidgetEnvironment,
} from 'expo-widgets';
import { Platform } from 'react-native';

import type { Goals } from '@/lib/types';

type CalorieWidgetProps = {
  consumed: number;
  goal: number;
  protein: number;
  carbs: number;
  fat: number;
};

const CalorieProgressView = (
  props: CalorieWidgetProps,
  environment: WidgetEnvironment
) => {
  'widget';
  const remaining = Math.max(props.goal - props.consumed, 0);
  const progress = Math.min(props.consumed / Math.max(props.goal, 1), 1);
  const compact = environment.widgetFamily === 'systemSmall';
  return (
    <VStack
      alignment="leading"
      spacing={compact ? 6 : 10}
      modifiers={[
        padding({ all: compact ? 14 : 18 }),
        background('#18251D'),
        widgetURL('calorietracker://'),
      ]}>
      <HStack>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle('#A7E86B')]}>
          CALTRACK
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle('#A9B2AA')]}>
          TODAY
        </Text>
      </HStack>
      <Text modifiers={[font({ size: compact ? 28 : 34, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>
        {remaining}
      </Text>
      <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle('#A9B2AA')]}>
        calories left
      </Text>
      <ProgressView
        value={progress}
        modifiers={[progressViewStyle('linear'), foregroundStyle('#A7E86B')]}
      />
      {!compact && (
        <HStack spacing={14}>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>
            P {props.protein}g
          </Text>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>
            C {props.carbs}g
          </Text>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#FFFFFF')]}>
            F {props.fat}g
          </Text>
        </HStack>
      )}
    </VStack>
  );
};

export const CalorieProgressWidget = createWidget('CalorieProgress', CalorieProgressView);

const NutritionLiveView = (
  props: CalorieWidgetProps,
  _environment: LiveActivityEnvironment
) => {
  'widget';
  const remaining = Math.max(props.goal - props.consumed, 0);
  const compactText = (
    <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle('#A7E86B')]}>
      {remaining}
    </Text>
  );
  return {
    banner: (
      <HStack
        spacing={12}
        modifiers={[padding({ all: 16 }), background('#18251D'), cornerRadius(18)]}>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle('#A7E86B')]}>
            CalTrack today
          </Text>
          <Text modifiers={[font({ size: 24, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>
            {remaining} kcal left
          </Text>
        </VStack>
        <Spacer />
        <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle('#A9B2AA')]}>
          P {props.protein} · C {props.carbs} · F {props.fat}
        </Text>
      </HStack>
    ),
    compactLeading: (
      <Text modifiers={[font({ size: 12, weight: 'bold' }), foregroundStyle('#A7E86B')]}>
        CT
      </Text>
    ),
    compactTrailing: compactText,
    minimal: compactText,
    expandedLeading: (
      <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle('#A7E86B')]}>
        CALTRACK
      </Text>
    ),
    expandedTrailing: compactText,
    expandedBottom: (
      <Text modifiers={[font({ size: 13, weight: 'medium' }), foregroundStyle('#FFFFFF')]}>
        {props.consumed} of {props.goal} calories
      </Text>
    ),
  };
};

export const NutritionLiveActivity = createLiveActivity('CalorieProgress', NutritionLiveView);

export function updateCalorieWidget(totals: Goals, goals: Goals) {
  if (Platform.OS !== 'ios') return;
  const props = {
    consumed: totals.calories,
    goal: goals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
  };
  CalorieProgressWidget.updateSnapshot(props);
  for (const instance of NutritionLiveActivity.getInstances()) {
    instance.update(props).catch(console.error);
  }
}

export function startNutritionLiveActivity(totals: Goals, goals: Goals) {
  if (Platform.OS !== 'ios') return null;
  return NutritionLiveActivity.start(
    {
      consumed: totals.calories,
      goal: goals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
    },
    'calorietracker://'
  );
}

