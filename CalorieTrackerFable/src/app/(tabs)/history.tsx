import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalorieBarChart, MacroStackChart, StatTile } from '@/components/charts';
import { Card, SectionLabel } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/lib/store';
import { Colors, Radius, Spacing, Type } from '@/lib/theme';

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
] as const;

export default function History() {
  const insets = useSafeAreaInsets();
  const { goals, getHistory } = useApp();
  const [range, setRange] = useState<7 | 14>(7);

  const data = useMemo(() => getHistory(range), [getHistory, range]);

  const stats = useMemo(() => {
    const tracked = data.filter((d) => d.mealCount > 0);
    if (tracked.length === 0) return { avg: 0, onGoal: 0, avgProtein: 0 };
    const avg = tracked.reduce((s, d) => s + d.calories, 0) / tracked.length;
    const onGoal = tracked.filter((d) => d.calories <= goals.calories).length;
    const avgProtein = tracked.reduce((s, d) => s + d.protein, 0) / tracked.length;
    return { avg, onGoal, avgProtein };
  }, [data, goals.calories]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={Type.title}>History</Text>
        <View style={styles.segment}>
          {RANGES.map((r) => (
            <Pressable
              key={r.days}
              onPress={() => {
                haptic.select();
                setRange(r.days);
              }}
              style={[styles.segmentItem, range === r.days && styles.segmentItemActive]}>
              <Text style={[styles.segmentText, range === r.days && styles.segmentTextActive]}>{r.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Animated.View entering={FadeInDown.duration(400)} style={styles.statsRow}>
        <StatTile label="Avg. kcal" value={Math.round(stats.avg).toLocaleString()} />
        <StatTile label="Days on goal" value={`${stats.onGoal}/${range}`} />
        <StatTile label="Avg. protein" value={`${Math.round(stats.avgProtein)}`} unit="g" />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <SectionLabel>Calories</SectionLabel>
        <Card>
          <CalorieBarChart data={data} goal={goals.calories} />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(200)} style={{ marginTop: Spacing.xl }}>
        <SectionLabel>Macros</SectionLabel>
        <Card>
          <MacroStackChart data={data} />
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.ringTrack,
    borderRadius: Radius.full,
    padding: 3,
  },
  segmentItem: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
  },
  segmentItemActive: {
    backgroundColor: Colors.card,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.inkSecondary,
  },
  segmentTextActive: {
    color: Colors.ink,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
});
