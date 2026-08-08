import * as Crypto from 'expo-crypto';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import * as db from './db';
import { lastNDayKeys, todayKey } from './dates';
import { haptic } from './haptics';
import { saveMealToHealth } from './health';
import { DEFAULT_GOALS } from './nutrition';
import type { AnalysisResult, DaySummary, Goals, Meal, Profile } from './types';
import { syncLiveActivity, syncWidget } from './widget-sync';

type Totals = { calories: number; protein: number; carbs: number; fat: number };

type AppState = {
  goals: Goals;
  profile: Profile | null;
  todayMeals: Meal[];
  totals: Totals;
  isOnboarded: boolean;
  logMeal: (analysis: AnalysisResult, photoUri: string | null) => Meal;
  editMeal: (meal: Meal) => void;
  removeMeal: (id: string) => void;
  saveGoals: (goals: Goals) => void;
  saveProfile: (profile: Profile) => void;
  completeOnboarding: () => void;
  getHistory: (days: number) => DaySummary[];
  refresh: () => void;
};

const AppContext = createContext<AppState | null>(null);

function computeTotals(meals: Meal[]): Totals {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [initialized] = useState(() => {
    db.initDb();
    return true;
  });
  const [goals, setGoalsState] = useState<Goals>(() => db.getGoals());
  const [profile, setProfileState] = useState<Profile | null>(() => db.getProfile());
  const [todayMeals, setTodayMeals] = useState<Meal[]>(() => db.getMealsForDay(todayKey()));
  const [isOnboarded, setIsOnboarded] = useState(() => db.kvGet('onboarded') === '1');
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setTodayMeals(db.getMealsForDay(todayKey()));
    setGoalsState(db.getGoals());
    setVersion((v) => v + 1);
  }, []);

  const totals = useMemo(() => computeTotals(todayMeals), [todayMeals]);

  // Keep the home screen widget in sync with today's numbers.
  useEffect(() => {
    if (initialized) syncWidget(totals, goals);
  }, [initialized, totals, goals]);

  const logMeal = useCallback(
    (analysis: AnalysisResult, photoUri: string | null): Meal => {
      const meal: Meal = {
        id: Crypto.randomUUID(),
        name: analysis.name,
        emoji: analysis.emoji,
        calories: analysis.calories,
        protein: analysis.protein,
        carbs: analysis.carbs,
        fat: analysis.fat,
        photoUri,
        note: null,
        createdAt: Date.now(),
      };
      db.insertMeal(meal);
      const meals = db.getMealsForDay(todayKey());
      setTodayMeals(meals);
      setVersion((v) => v + 1);
      const newTotals = computeTotals(meals);
      syncLiveActivity(meal, newTotals, db.getGoals());
      void saveMealToHealth(meal);
      haptic.success();
      return meal;
    },
    [],
  );

  const editMeal = useCallback((meal: Meal) => {
    db.updateMeal(meal);
    refresh();
  }, [refresh]);

  const removeMeal = useCallback((id: string) => {
    db.deleteMeal(id);
    refresh();
  }, [refresh]);

  const saveGoals = useCallback((next: Goals) => {
    db.setGoals(next);
    setGoalsState(next);
  }, []);

  const saveProfile = useCallback((next: Profile) => {
    db.setProfile(next);
    setProfileState(next);
  }, []);

  const completeOnboarding = useCallback(() => {
    db.kvSet('onboarded', '1');
    setIsOnboarded(true);
  }, []);

  // getHistory reads synchronously; `version` keys consumers to re-read after writes.
  const getHistory = useCallback(
    (days: number) => db.getDaySummaries(lastNDayKeys(days)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const value = useMemo(
    () => ({
      goals,
      profile,
      todayMeals,
      totals,
      isOnboarded,
      logMeal,
      editMeal,
      removeMeal,
      saveGoals,
      saveProfile,
      completeOnboarding,
      getHistory,
      refresh,
    }),
    [goals, profile, todayMeals, totals, isOnboarded, logMeal, editMeal, removeMeal, saveGoals, saveProfile, completeOnboarding, getHistory, refresh],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { DEFAULT_GOALS };
