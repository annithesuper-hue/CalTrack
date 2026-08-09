import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { weekdayLetter, todayKey } from '@/lib/dates';
import { Colors, MacroMeta, Spacing } from '@/lib/theme';
import type { DaySummary } from '@/lib/types';

const PLOT_HEIGHT = 148;
const BAR_RADIUS = 4;

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

/**
 * Daily calories vs goal. Single-series bars, dashed goal reference line,
 * today's bar emphasized in ink and directly labeled.
 */
export function CalorieBarChart({ data, goal }: { data: DaySummary[]; goal: number }) {
  const [width, setWidth] = useState(0);
  const today = todayKey();
  const max = niceMax(Math.max(goal * 1.15, ...data.map((d) => d.calories)));
  const n = data.length;
  const gap = n > 10 ? 5 : 10;
  const barW = width > 0 ? (width - gap * (n - 1)) / n : 0;
  const goalY = PLOT_HEIGHT * (1 - goal / max);

  return (
    <View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={PLOT_HEIGHT}>
            {/* baseline */}
            <Line x1={0} y1={PLOT_HEIGHT - 0.5} x2={width} y2={PLOT_HEIGHT - 0.5} stroke={Colors.hairline} strokeWidth={1} />
            {data.map((d, i) => {
              const isToday = d.day === today;
              const h = Math.max(d.calories > 0 ? 3 : 0, (d.calories / max) * PLOT_HEIGHT);
              const x = i * (barW + gap);
              const y = PLOT_HEIGHT - h;
              return (
                <React.Fragment key={d.day}>
                  {h > 0 && (
                    <Rect
                      x={x}
                      y={y}
                      width={barW}
                      height={h + BAR_RADIUS}
                      rx={BAR_RADIUS}
                      fill={isToday ? Colors.ink : Colors.green}
                      opacity={isToday ? 1 : 0.85}
                    />
                  )}
                  {/* clip the rounded bottom back to the baseline */}
                  {h > 0 && <Rect x={x} y={PLOT_HEIGHT} width={barW} height={BAR_RADIUS} fill={Colors.card} />}
                  {isToday && d.calories > 0 && (
                    <SvgText
                      x={x + barW / 2}
                      y={Math.max(10, y - 6)}
                      fontSize={11}
                      fontWeight="700"
                      fill={Colors.ink}
                      textAnchor="middle">
                      {Math.round(d.calories).toLocaleString()}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
            {/* goal reference line */}
            <Line x1={0} y1={goalY} x2={width} y2={goalY} stroke={Colors.inkSecondary} strokeWidth={1.5} strokeDasharray="5,4" />
            <SvgText x={width - 2} y={goalY - 5} fontSize={10} fontWeight="600" fill={Colors.inkSecondary} textAnchor="end">
              {`Goal ${goal.toLocaleString()}`}
            </SvgText>
          </Svg>
        )}
      </View>
      <AxisLabels data={data} />
    </View>
  );
}

/**
 * Macro grams per day as stacked bars (protein / carbs / fat) with 2px surface
 * gaps between segments. Legend rendered above the plot.
 */
export function MacroStackChart({ data }: { data: DaySummary[] }) {
  const [width, setWidth] = useState(0);
  const today = todayKey();
  const max = niceMax(Math.max(1, ...data.map((d) => d.protein + d.carbs + d.fat)));
  const n = data.length;
  const gap = n > 10 ? 5 : 10;
  const barW = width > 0 ? (width - gap * (n - 1)) / n : 0;

  return (
    <View>
      <View style={styles.legendRow}>
        {(['protein', 'carbs', 'fat'] as const).map((key) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendChip, { backgroundColor: MacroMeta[key].color }]} />
            <Text style={styles.legendText}>{MacroMeta[key].label}</Text>
          </View>
        ))}
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={PLOT_HEIGHT}>
            <Line x1={0} y1={PLOT_HEIGHT - 0.5} x2={width} y2={PLOT_HEIGHT - 0.5} stroke={Colors.hairline} strokeWidth={1} />
            {data.map((d, i) => {
              const x = i * (barW + gap);
              const segments = [
                { value: d.protein, color: MacroMeta.protein.color },
                { value: d.carbs, color: MacroMeta.carbs.color },
                { value: d.fat, color: MacroMeta.fat.color },
              ];
              let y = PLOT_HEIGHT;
              const isToday = d.day === today;
              return (
                <React.Fragment key={d.day}>
                  {segments.map((seg, j) => {
                    const h = (seg.value / max) * PLOT_HEIGHT;
                    if (h <= 0) return null;
                    y -= h;
                    const drawY = y;
                    const isTop = j === segments.length - 1 || segments.slice(j + 1).every((s) => s.value <= 0);
                    return (
                      <Rect
                        key={seg.color}
                        x={x}
                        y={drawY}
                        width={barW}
                        height={Math.max(1, h - 2)}
                        rx={isTop ? BAR_RADIUS : 1.5}
                        fill={seg.color}
                        opacity={isToday ? 1 : 0.85}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </Svg>
        )}
      </View>
      <AxisLabels data={data} />
    </View>
  );
}

function AxisLabels({ data }: { data: DaySummary[] }) {
  const today = todayKey();
  return (
    <View style={styles.axisRow}>
      {data.map((d) => (
        <Text
          key={d.day}
          style={[styles.axisLabel, d.day === today && { color: Colors.ink, fontWeight: '700' }]}>
          {weekdayLetter(d.day)}
        </Text>
      ))}
    </View>
  );
}

export function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axisLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    color: Colors.inkMuted,
  },
  legendRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendChip: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.inkSecondary,
  },
  statTile: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.inkMuted,
    letterSpacing: 0,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.inkSecondary,
  },
});
