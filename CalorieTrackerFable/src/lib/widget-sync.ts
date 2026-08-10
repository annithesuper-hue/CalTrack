import { Platform } from 'react-native';

import type { Goals, Meal } from './types';

type Totals = { calories: number; protein: number; carbs: number; fat: number };

/** Pushes today's totals to the home screen widget. Best-effort. */
export function syncWidget(totals: Totals, goals: Goals): void {
  if (Platform.OS !== 'ios') return;
  try {
    const { CalTrackWidget } = require('../widgets/caltrack-widget');
    CalTrackWidget.updateSnapshot({
      consumed: Math.round(totals.calories),
      goal: goals.calories,
      protein: Math.round(totals.protein),
      proteinGoal: goals.protein,
      carbs: Math.round(totals.carbs),
      carbsGoal: goals.carbs,
      fat: Math.round(totals.fat),
      fatGoal: goals.fat,
    });
  } catch (e) {
    console.warn('Widget sync failed', e);
  }
}

/**
 * Starts or updates the daily-progress Live Activity after a meal is logged.
 * A single activity instance is reused for the day.
 */
export function syncLiveActivity(meal: Meal, totals: Totals, goals: Goals): void {
  if (Platform.OS !== 'ios') return;
  try {
    const { ProgressActivity } = require('../widgets/progress-activity');
    const props = {
      mealEmoji: meal.emoji,
      mealName: meal.name,
      mealCalories: Math.round(meal.calories),
      consumed: Math.round(totals.calories),
      goal: goals.calories,
    };
    const instances = ProgressActivity.getInstances();
    if (instances.length > 0) {
      instances[0].update(props);
    } else {
      ProgressActivity.start(props, 'calorietracker:///');
    }
  } catch (e) {
    console.warn('Live Activity sync failed', e);
  }
}

export function endLiveActivities(): void {
  if (Platform.OS !== 'ios') return;
  try {
    const { ProgressActivity } = require('../widgets/progress-activity');
    for (const instance of ProgressActivity.getInstances()) {
      instance.end('immediate');
    }
  } catch {
    // no-op
  }
}
