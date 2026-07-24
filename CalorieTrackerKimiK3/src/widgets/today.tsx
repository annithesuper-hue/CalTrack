import { Gauge, HStack, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  padding,
  progressViewStyle,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type TodayWidgetProps = {
  calories: number;
  calorieGoal: number;
  protein: number;
  proteinGoal: number;
  carbs: number;
  carbsGoal: number;
  fat: number;
  fatGoal: number;
};

export const DEFAULT_TODAY_WIDGET_PROPS: TodayWidgetProps = {
  calories: 0,
  calorieGoal: 2200,
  protein: 0,
  proteinGoal: 140,
  carbs: 0,
  carbsGoal: 220,
  fat: 0,
  fatGoal: 73,
};

const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  // NOTE: the widget bundle evaluates this component in isolation — every
  // helper and constant must live INSIDE the component body.
  const ACCENT = '#B6F04A';
  const SECONDARY = '#8B94A1';
  const PROTEIN = '#FF8A75';
  const CARBS = '#FFCE54';
  const FAT = '#6EC1FF';
  const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

  const MacroLine = (lineProps: { label: string; color: string; value: number; goal: number }) => (
    <HStack spacing={6} alignment="center">
      <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(lineProps.color)]}>
        {lineProps.label}
      </Text>
      <Text
        modifiers={[
          font({ size: 11 }),
          foregroundStyle({ type: 'hierarchical', style: 'primary' }),
        ]}>
        {`${Math.round(lineProps.value)} / ${Math.round(lineProps.goal)}g`}
      </Text>
      <ProgressView
        value={lineProps.goal > 0 ? Math.min(1, lineProps.value / lineProps.goal) : 0}
        modifiers={[progressViewStyle('linear'), tint(lineProps.color)]}
      />
    </HStack>
  );

  const remaining = Math.max(0, props.calorieGoal - props.calories);
  const progress = props.calorieGoal > 0 ? Math.min(1, props.calories / props.calorieGoal) : 0;

  if (environment.widgetFamily === 'accessoryCircular') {
    return (
      <Gauge
        value={props.calories}
        min={0}
        max={Math.max(1, props.calorieGoal)}
        modifiers={[gaugeStyle('circular'), tint(ACCENT)]}
        currentValueLabel={
          <Text modifiers={[font({ size: 14, weight: 'bold' })]}>{fmt(remaining)}</Text>
        }
      />
    );
  }

  if (environment.widgetFamily === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 14, weight: 'bold' })]}>
          {`${fmt(props.calories)} / ${fmt(props.calorieGoal)} kcal`}
        </Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
          {`P ${Math.round(props.protein)}g · C ${Math.round(props.carbs)}g · F ${Math.round(props.fat)}g`}
        </Text>
      </VStack>
    );
  }

  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={2} modifiers={[widgetURL('calorietracker://')]}>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(SECONDARY)]}>
          CalTrack
        </Text>
        <Text modifiers={[font({ size: 34, weight: 'bold', design: 'rounded' }), foregroundStyle(ACCENT)]}>
          {fmt(remaining)}
        </Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(SECONDARY)]}>kcal left</Text>
        <Spacer />
        <ProgressView value={progress} modifiers={[progressViewStyle('linear'), tint(ACCENT)]} />
        <Text modifiers={[font({ size: 10 }), foregroundStyle(SECONDARY)]}>
          {`${fmt(props.calories)} / ${fmt(props.calorieGoal)} kcal`}
        </Text>
      </VStack>
    );
  }

  // systemMedium (default) — ring-style gauge + macro breakdown.
  return (
    <HStack spacing={16} alignment="center" modifiers={[widgetURL('calorietracker://')]}>
      <Gauge
        value={props.calories}
        min={0}
        max={Math.max(1, props.calorieGoal)}
        modifiers={[gaugeStyle('circular'), tint(ACCENT), frame({ width: 84, height: 84 })]}
        currentValueLabel={
          <VStack spacing={0}>
            <Text modifiers={[font({ size: 16, weight: 'bold', design: 'rounded' }), foregroundStyle(ACCENT)]}>
              {fmt(remaining)}
            </Text>
            <Text modifiers={[font({ size: 8 }), foregroundStyle(SECONDARY)]}>kcal left</Text>
          </VStack>
        }
      />
      <VStack alignment="leading" spacing={6}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>
          {`${fmt(props.calories)} / ${fmt(props.calorieGoal)} kcal`}
        </Text>
        <MacroLine label="P" color={PROTEIN} value={props.protein} goal={props.proteinGoal} />
        <MacroLine label="C" color={CARBS} value={props.carbs} goal={props.carbsGoal} />
        <MacroLine label="F" color={FAT} value={props.fat} goal={props.fatGoal} />
      </VStack>
    </HStack>
  );
};

export default createWidget('TodayWidget', TodayWidget);
