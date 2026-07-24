import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Screen } from '@/components/ui';
import { colors, radius } from '@/constants/design';
import { shortDayLabel } from '@/lib/date';
import type { DailySummary } from '@/lib/types';
import { useApp } from '@/providers/app-provider';

export default function HistoryScreen() {
  const { history, goals } = useApp();
  const [range, setRange] = useState<7 | 14>(7);
  const data = history.slice(-range);
  const average = Math.round(data.reduce((sum, item) => sum + item.calories, 0) / data.length);
  const daysOnTarget = data.filter(
    (item) => item.calories >= goals.calories * 0.9 && item.calories <= goals.calories * 1.1
  ).length;
  const macroAverages = useMemo(
    () => ({
      protein: Math.round(data.reduce((sum, item) => sum + item.protein, 0) / data.length),
      carbs: Math.round(data.reduce((sum, item) => sum + item.carbs, 0) / data.length),
      fat: Math.round(data.reduce((sum, item) => sum + item.fat, 0) / data.length),
    }),
    [data]
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="eyebrow" color={colors.limeDark}>YOUR PATTERNS</AppText>
          <AppText variant="title">Trends</AppText>
        </View>
        <View style={styles.segment}>
          {[7, 14].map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: range === item }}
              onPress={() => setRange(item as 7 | 14)}
              style={[styles.segmentItem, range === item && styles.segmentSelected]}>
              <AppText variant="caption" color={range === item ? colors.white : colors.inkMuted}>
                {item}D
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.insights}>
        <Card style={styles.insight}>
          <AppText variant="caption" color={colors.inkMuted}>DAILY AVERAGE</AppText>
          <AppText variant="number">{average}</AppText>
          <AppText variant="caption" color={colors.inkMuted}>kcal</AppText>
        </Card>
        <Card style={styles.insight}>
          <AppText variant="caption" color={colors.inkMuted}>IN YOUR RANGE</AppText>
          <AppText variant="number">{daysOnTarget}/{range}</AppText>
          <AppText variant="caption" color={colors.inkMuted}>days</AppText>
        </Card>
      </View>

      <Card style={styles.chartCard}>
        <View style={styles.chartTitle}>
          <View>
            <AppText variant="heading">Calories</AppText>
            <AppText variant="caption" color={colors.inkMuted}>Tap a day for the exact total</AppText>
          </View>
          <View style={styles.goalPill}>
            <View style={styles.goalDot} />
            <AppText variant="caption">Goal {goals.calories}</AppText>
          </View>
        </View>
        <CalorieChart data={data} goal={goals.calories} />
      </Card>

      <View style={{ gap: 12 }}>
        <AppText variant="heading">Macro averages</AppText>
        <View style={styles.macros}>
          <MacroAverage
            label="Protein"
            value={macroAverages.protein}
            goal={goals.protein}
            color={colors.limeDark}
          />
          <MacroAverage
            label="Carbs"
            value={macroAverages.carbs}
            goal={goals.carbs}
            color={colors.blue}
          />
          <MacroAverage
            label="Fat"
            value={macroAverages.fat}
            goal={goals.fat}
            color={colors.orange}
          />
        </View>
      </View>
    </Screen>
  );
}

function CalorieChart({ data, goal }: { data: DailySummary[]; goal: number }) {
  const defaultIndex = Math.max(data.findLastIndex((item) => item.calories > 0), 0);
  const [selected, setSelected] = useState(defaultIndex);
  const selectedItem = data[selected] ?? data[data.length - 1];
  const max = Math.max(goal * 1.2, ...data.map((item) => item.calories), 1);
  const plotHeight = 190;
  const goalY = plotHeight - (goal / max) * plotHeight;

  return (
    <View style={styles.chart}>
      <View style={styles.tooltip}>
        <AppText variant="label">{selectedItem?.calories ?? 0} kcal</AppText>
        <AppText variant="caption" color={colors.inkMuted}>{selectedItem?.day}</AppText>
      </View>
      <View style={[styles.goalLine, { top: goalY }]}>
        <View style={styles.dash} />
      </View>
      <View style={[styles.bars, { height: plotHeight }]}>
        {data.map((item, index) => {
          const height = Math.max((item.calories / max) * plotHeight, item.calories ? 5 : 2);
          const showLabel = data.length === 7 || index % 2 === 0 || index === data.length - 1;
          return (
            <Pressable
              key={item.day}
              accessibilityRole="button"
              accessibilityLabel={`${item.day}, ${item.calories} calories`}
              onPress={() => setSelected(index)}
              style={styles.barColumn}>
              <View
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: selected === index ? colors.ink : colors.lime,
                    opacity: item.calories ? 1 : 0.28,
                  },
                ]}
              />
              <AppText
                variant="caption"
                color={selected === index ? colors.ink : colors.inkMuted}
                style={{ opacity: showLabel ? 1 : 0 }}>
                {shortDayLabel(item.day)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MacroAverage({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const ratio = Math.min(value / Math.max(goal, 1), 1);
  return (
    <Card style={styles.macroCard}>
      <View style={[styles.macroIcon, { backgroundColor: color }]} />
      <AppText variant="caption" color={colors.inkMuted}>{label}</AppText>
      <AppText variant="heading">{value}g</AppText>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
      </View>
      <AppText variant="caption" color={colors.inkMuted}>Goal {goal}g</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segment: { flexDirection: 'row', borderRadius: radius.pill, padding: 4, backgroundColor: colors.surfaceSoft },
  segmentItem: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill },
  segmentSelected: { backgroundColor: colors.ink },
  insights: { flexDirection: 'row', gap: 12 },
  insight: { flex: 1, gap: 3 },
  chartCard: { gap: 18 },
  chartTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
  },
  goalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange },
  chart: { gap: 10 },
  tooltip: {
    minHeight: 42,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: '#F2F5EE',
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 1, zIndex: 0, top: 80 },
  dash: { borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.orange },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barColumn: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 7 },
  bar: { width: '72%', minWidth: 5, maxWidth: 28, borderRadius: 7 },
  macros: { flexDirection: 'row', gap: 9 },
  macroCard: { flex: 1, padding: 13, gap: 6, borderRadius: radius.md },
  macroIcon: { width: 14, height: 5, borderRadius: 3 },
  macroTrack: { height: 5, backgroundColor: colors.surfaceSoft, borderRadius: 3, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 3 },
});

