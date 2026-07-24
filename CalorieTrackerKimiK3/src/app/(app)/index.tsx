import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useCallback } from 'react';
import {
  ActionSheetIOS,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MacroBar } from '@/components/macro-bar';
import { Ring } from '@/components/ring';
import { Screen } from '@/components/screen';
import { EntryRow } from '@/components/entry-row';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/lib/store';
import { FoodEntry } from '@/lib/types';

const C = Colors.dark;

function formatKcal(v: number): string {
  return Math.round(v).toLocaleString('en-US');
}

export default function TodayScreen() {
  const { todayEntries, todayTotals, goals, removeFood, refresh } = useApp();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const remaining = goals.calories - todayTotals.calories;
  const over = remaining < 0;
  const entries = [...todayEntries].reverse(); // newest first

  const openSettings = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- typed routes lag behind new files
    router.push('/settings' as any);
  };

  const openCamera = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- typed routes lag behind new files
    router.push('/camera' as any);
  };

  const openManual = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- typed routes lag behind new files
    router.push('/edit-entry' as any);
  };

  const confirmDelete = (entry: FoodEntry) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: `Delete “${entry.name}”?`,
        options: ['Cancel', 'Delete'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 0,
      },
      (index) => {
        if (index === 1) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          void removeFood(entry.id);
        }
      }
    );
  };

  const header = (
    <View style={styles.headerContent}>
      <View style={styles.ringWrap}>
        <Ring
          progress={goals.calories > 0 ? todayTotals.calories / goals.calories : 0}
          over={over}
        >
          <Text style={styles.ringValue}>{formatKcal(todayTotals.calories)}</Text>
          <Text style={styles.ringUnit}>kcal</Text>
          <Text style={[styles.ringSub, over && styles.ringSubOver]}>
            {over ? `Over by ${formatKcal(-remaining)}` : `${formatKcal(remaining)} left`}
          </Text>
        </Ring>
      </View>

      <View style={styles.macroCard}>
        <MacroBar label="Protein" value={todayTotals.protein} goal={goals.protein} color={C.protein} />
        <MacroBar label="Carbs" value={todayTotals.carbs} goal={goals.carbs} color={C.carbs} />
        <MacroBar label="Fat" value={todayTotals.fat} goal={goals.fat} color={C.fat} />
      </View>

      <Text style={styles.sectionTitle}>Today&apos;s meals</Text>
    </View>
  );

  const empty = (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <SymbolView name="fork.knife" size={28} tintColor={C.accent} />
      </View>
      <Text style={styles.emptyTitle}>No meals logged yet</Text>
      <Text style={styles.emptyHint}>Snap a photo of your next meal and we&apos;ll do the math.</Text>
    </View>
  );

  return (
    <Screen
      title="CalTrack"
      contentStyle={styles.content}
      headerRight={
        <Pressable onPress={openSettings} hitSlop={8} accessibilityLabel="Settings">
          <SymbolView name="gearshape" size={24} tintColor={C.textSecondary} />
        </Pressable>
      }
    >
      <View style={styles.listWrap}>
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <EntryRow
              entry={item}
              onPress={() =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- typed routes lag behind new files
                router.push({ pathname: '/edit-entry', params: { entryId: item.id } } as any)
              }
              onLongPress={() => confirmDelete(item)}
            />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />

        <View style={[styles.fabColumn, { bottom: insets.bottom + 76 }]}>
          <Pressable
            onPress={openCamera}
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            accessibilityLabel="Scan a meal with the camera"
          >
            <SymbolView name="camera.fill" size={26} tintColor={C.background} />
          </Pressable>
          <Pressable onPress={openManual} hitSlop={8}>
            <Text style={styles.addManual}>+ Add manually</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
  },
  listWrap: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    gap: 0,
  },
  headerContent: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  ringWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  ringValue: {
    color: C.text,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
  ringUnit: {
    color: C.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    marginTop: -4,
  },
  ringSub: {
    color: C.accent,
    fontSize: 15,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  ringSubOver: {
    color: C.danger,
  },
  macroCard: {
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  separator: {
    height: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: C.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyHint: {
    color: C.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  fabColumn: {
    position: 'absolute',
    right: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
  },
  addManual: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '700',
  },
});
