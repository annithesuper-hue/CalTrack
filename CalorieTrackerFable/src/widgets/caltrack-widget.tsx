import { Gauge, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  padding,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type CalTrackWidgetProps = {
  consumed: number;
  goal: number;
  protein: number;
  proteinGoal: number;
  carbs: number;
  carbsGoal: number;
  fat: number;
  fatGoal: number;
};

const CalTrackWidgetView = (props: CalTrackWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const consumed = props.consumed ?? 0;
  const goal = props.goal || 2200;
  const left = Math.max(0, goal - consumed);
  const fraction = Math.min(1, goal > 0 ? consumed / goal : 0);
  const dark = environment.colorScheme === 'dark';
  const ink = dark ? '#F5F2EA' : '#191712';
  const muted = dark ? '#A39C89' : '#6E6857';

  const ring = (
    <Gauge
      value={fraction}
      modifiers={[gaugeStyle('circularCapacity'), tint('#3E9B5F'), frame({ width: 56, height: 56 })]}
      currentValueLabel={
        <Text modifiers={[font({ size: 13, weight: 'bold', design: 'rounded' }), foregroundStyle(ink)]}>
          {`${Math.round(fraction * 100)}%`}
        </Text>
      }
    />
  );

  const kcalBlock = (
    <VStack alignment="leading" spacing={2}>
      <Text modifiers={[font({ size: 22, weight: 'heavy', design: 'rounded' }), foregroundStyle(ink)]}>
        {`${left}`}
      </Text>
      <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(muted)]}>kcal left</Text>
    </VStack>
  );

  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack
        alignment="leading"
        spacing={8}
        modifiers={[containerBackground(dark ? '#1E1C16' : '#FFFFFF', 'widget'), padding({ all: 14 })]}>
        <HStack>
          {ring}
          <Spacer />
        </HStack>
        <Spacer />
        {kcalBlock}
      </VStack>
    );
  }

  const macro = (label: string, value: number, target: number, color: string) => (
    <VStack alignment="leading" spacing={3}>
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(muted)]}>{label}</Text>
      <Gauge
        value={Math.min(1, target > 0 ? value / target : 0)}
        modifiers={[gaugeStyle('linearCapacity'), tint(color), frame({ height: 6 })]}
      />
      <Text modifiers={[font({ size: 12, weight: 'bold', design: 'rounded' }), foregroundStyle(ink)]}>
        {`${Math.round(value)}g`}
      </Text>
    </VStack>
  );

  return (
    <HStack
      spacing={16}
      modifiers={[containerBackground(dark ? '#1E1C16' : '#FFFFFF', 'widget'), padding({ all: 16 })]}>
      <VStack alignment="leading" spacing={6}>
        {ring}
        {kcalBlock}
      </VStack>
      <VStack spacing={10}>
        {macro('Protein', props.protein ?? 0, props.proteinGoal || 1, '#D2492F')}
        {macro('Carbs', props.carbs ?? 0, props.carbsGoal || 1, '#DD9A26')}
        {macro('Fat', props.fat ?? 0, props.fatGoal || 1, '#4E7DE0')}
      </VStack>
    </HStack>
  );
};

export const CalTrackWidget = createWidget<CalTrackWidgetProps>('CalTrackWidget', CalTrackWidgetView);
