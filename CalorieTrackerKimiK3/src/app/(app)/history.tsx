import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { fullLabel, shortLabel, todayKey } from '@/lib/dates';
import { useApp } from '@/lib/store';
import { DaySummary } from '@/lib/types';

const C = Colors.dark;

type Range = 7 | 21;

const PAST_BAR = '#2E3947';

function formatKcal(v: number): string {
  return Math.round(v).toLocaleString('en-US');
}

export default function HistoryScreen() {
  const { history, goals } = useApp();
  const { width: screenWidth } = useWindowDimensions();
  const [range, setRange] = useState<Range>(7);

  const days = useMemo(() => history.slice(-range), [history, range]);
  const loggedDays = useMemo(() => days.filter((d) => d.entryCount > 0), [days]);

  const chartWidth = screenWidth - Spacing.three * 2 - Spacing.three * 2 - 8;
  const today = todayKey();

  const barData = useMemo(
    () =>
      loggedDays.map((d, i) => ({
        value: Math.round(d.calories),
        // 21D crowds the axis: label every third day only.
        label: range === 7 || i % 3 === 0 ? shortLabel(d.date).slice(0, 1) : '',
        frontColor: d.date === today ? C.accent : PAST_BAR,
      })),
    [loggedDays, range, today]
  );

  const stats = useMemo(() => {
    const onGoal = loggedDays.filter((d) => d.calories <= goals.calories).length;
    const avg = loggedDays.length
      ? Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length)
      : 0;
    // Current streak: consecutive on-goal logged days, walking back from today.
    // A not-yet-logged today does not break the streak.
    let streak = 0;
    const rev = [...days].reverse();
    for (let i = 0; i < rev.length; i++) {
      const d = rev[i];
      if (d.entryCount === 0) {
        if (i === 0) continue; // today, nothing logged yet
        break;
      }
      if (d.calories <= goals.calories) streak++;
      else break;
    }
    return { avg, onGoal, streak };
  }, [days, loggedDays, goals.calories]);

  const macroSeries = useMemo(() => {
    const toPoint = (d: DaySummary, i: number) => ({
      value: Math.round(d.protein),
      // customData carries all three macros so the pointer tooltip can show them.
      customData: d,
      label: range === 7 || i % 3 === 0 ? shortLabel(d.date).slice(0, 1) : '',
    });
    return {
      protein: days.map(toPoint),
      // Labels live on the first series only; extra labels on data2/data3 are ignored.
      carbs: days.map((d, i) => ({ ...toPoint(d, i), value: Math.round(d.carbs), label: undefined })),
      fat: days.map((d, i) => ({ ...toPoint(d, i), value: Math.round(d.fat), label: undefined })),
    };
  }, [days, range]);

  const setRangeWithHaptic = (r: Range) => {
    if (r === range) return;
    void Haptics.selectionAsync();
    setRange(r);
  };

  const maxBar = Math.max(goals.calories * 1.15, ...loggedDays.map((d) => d.calories * 1.1), 100);
  const maxMacro = Math.max(
    40,
    ...days.flatMap((d) => [d.protein, d.carbs, d.fat]).map((v) => v * 1.15)
  );

  return (
    <Screen scroll title="History" contentStyle={styles.content}>
      {/* Range toggle */}
      <View style={styles.segment}>
        {([7, 21] as Range[]).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRangeWithHaptic(r)}
            style={[styles.segmentItem, range === r && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, range === r && styles.segmentTextActive]}>{r}D</Text>
          </Pressable>
        ))}
      </View>

      {/* Calories bar chart */}
      <Card style={styles.chartCard}>
        <Text style={styles.cardTitle}>Calories</Text>
        {loggedDays.length === 0 ? (
          <Text style={styles.noData}>No logged days in this range</Text>
        ) : (
          <BarChart
            data={barData}
            width={chartWidth}
            height={180}
            barWidth={range === 7 ? 28 : 10}
            spacing={range === 7 ? 18 : 8}
            initialSpacing={8}
            endSpacing={8}
            barBorderRadius={range === 7 ? 8 : 4}
            maxValue={maxBar}
            noOfSections={3}
            hideRules
            hideYAxisText
            yAxisThickness={0}
            xAxisThickness={StyleSheet.hairlineWidth}
            xAxisColor={C.border}
            xAxisLabelTextStyle={styles.axisLabel}
            disableScroll
            showValuesAsTopLabel={range === 7}
            topLabelTextStyle={styles.topLabel}
            showReferenceLine1
            referenceLine1Position={goals.calories}
            referenceLine1Config={{
              color: C.accent,
              thickness: 1.5,
              dashWidth: 6,
              dashGap: 5,
              type: 'solid',
            }}
            isAnimated
          />
        )}
      </Card>

      {/* Averages */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.avg > 0 ? formatKcal(stats.avg) : '—'}</Text>
          <Text style={styles.statLabel}>avg kcal/day</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>
            {stats.onGoal}
            <Text style={styles.statValueSub}>/{loggedDays.length}</Text>
          </Text>
          <Text style={styles.statLabel}>days on goal</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, styles.streakValue]}>{stats.streak}</Text>
          <Text style={styles.statLabel}>day streak</Text>
        </Card>
      </View>

      {/* Macros line chart */}
      <Card style={styles.chartCard}>
        <View style={styles.legendRow}>
          <Text style={styles.cardTitle}>Macros</Text>
          <View style={styles.legend}>
            {[
              { label: 'Protein', color: C.protein },
              { label: 'Carbs', color: C.carbs },
              { label: 'Fat', color: C.fat },
            ].map((l) => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <LineChart
          data={macroSeries.protein}
          data2={macroSeries.carbs}
          data3={macroSeries.fat}
          width={chartWidth}
          height={170}
          maxValue={maxMacro}
          noOfSections={3}
          curved
          curvature={0.15}
          thickness={2.5}
          thickness2={2.5}
          thickness3={2.5}
          color={C.protein}
          color2={C.carbs}
          color3={C.fat}
          hideDataPoints
          hideDataPoints2
          hideDataPoints3
          hideRules
          hideYAxisText
          yAxisThickness={0}
          xAxisThickness={StyleSheet.hairlineWidth}
          xAxisColor={C.border}
          xAxisLabelTextStyle={styles.axisLabel}
          disableScroll
          spacing={(chartWidth - 16) / Math.max(days.length - 1, 1)}
          initialSpacing={8}
          endSpacing={8}
          pointerConfig={{
            pointerColor: C.text,
            pointerStripColor: C.textSecondary,
            pointerStripWidth: 1,
            pointerStripUptoDataPoint: false,
            activatePointersOnLongPress: true,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: { customData?: DaySummary }[]) => {
              const d = items[0]?.customData;
              if (!d) return null;
              return (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipTitle}>{shortLabel(d.date)}</Text>
                  <Text style={[styles.tooltipLine, { color: C.protein }]}>
                    P {Math.round(d.protein)} g
                  </Text>
                  <Text style={[styles.tooltipLine, { color: C.carbs }]}>
                    C {Math.round(d.carbs)} g
                  </Text>
                  <Text style={[styles.tooltipLine, { color: C.fat }]}>F {Math.round(d.fat)} g</Text>
                </View>
              );
            },
          }}
        />
        <Text style={styles.tooltipHint}>Long-press the chart for exact values</Text>
      </Card>

      {/* Last 7 days */}
      <Text style={styles.sectionTitle}>Last 7 days</Text>
      <Card padding={Spacing.two}>
        {days
          .slice(-7)
          .reverse()
          .map((d) => {
            const ratio = goals.calories > 0 ? Math.min(d.calories / goals.calories, 1) : 0;
            return (
              <View key={d.date} style={styles.dayRow}>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayLabel} numberOfLines={1}>
                    {fullLabel(d.date)}
                  </Text>
                  <Text style={styles.dayKcal}>
                    {d.entryCount > 0
                      ? `${formatKcal(d.calories)} / ${formatKcal(goals.calories)} kcal`
                      : 'Nothing logged'}
                  </Text>
                </View>
                <View style={styles.dayTrack}>
                  <View
                    style={[
                      styles.dayFill,
                      {
                        width: `${ratio * 100}%`,
                        backgroundColor:
                          d.entryCount === 0
                            ? 'transparent'
                            : d.calories > goals.calories
                              ? C.danger
                              : C.accent,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingBottom: 120,
  },
  segment: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: 3,
  },
  segmentItem: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  segmentItemActive: {
    backgroundColor: C.backgroundSelected,
  },
  segmentText: {
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: C.accent,
  },
  chartCard: {
    gap: Spacing.three,
  },
  cardTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
  },
  noData: {
    color: C.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: Spacing.five,
  },
  axisLabel: {
    color: C.textSecondary,
    fontSize: 10,
  },
  topLabel: {
    color: C.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.three,
  },
  statValue: {
    color: C.text,
    fontSize: 20,
    fontWeight: '800',
  },
  statValueSub: {
    color: C.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  streakValue: {
    color: C.accent,
  },
  statLabel: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.two + 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  legendText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tooltip: {
    backgroundColor: C.backgroundSelected,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  tooltipTitle: {
    color: C.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  tooltipLine: {
    fontSize: 12,
    fontWeight: '700',
  },
  tooltipHint: {
    color: C.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  sectionTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  dayRow: {
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.two,
    gap: Spacing.two,
  },
  dayInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.three,
  },
  dayLabel: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  dayKcal: {
    color: C.textSecondary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  dayTrack: {
    height: 3,
    borderRadius: Radius.full,
    backgroundColor: C.backgroundSelected,
    overflow: 'hidden',
  },
  dayFill: {
    height: 3,
    borderRadius: Radius.full,
  },
});
