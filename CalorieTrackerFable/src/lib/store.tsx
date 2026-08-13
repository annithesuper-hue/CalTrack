import { useAuth } from '@clerk/expo';
import * as Crypto from 'expo-crypto';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as db from './db';
import { lastNDayKeys, todayKey } from './dates';
import { haptic } from './haptics';
import { saveMealToHealth } from './health';
import { inferMealTypeFromHour } from './meal-type';
import { DEFAULT_GOALS } from './nutrition';
import type { AnalysisResult, DaySummary, Goals, Meal, MealType, Profile } from './types';
import { syncLiveActivity, syncWidget } from './widget-sync';

type Totals = { calories: number; protein: number; carbs: number; fat: number; fiber: number };

type AppState = {
  goals: Goals;
  profile: Profile | null;
  todayMeals: Meal[];
  totals: Totals;
  isOnboarded: boolean;
  /** True until the active user's local database has been resolved and loaded (guest DB pre-auth, or the signed-in user's DB post-auth). Data reads before this is true would reflect the previous user. */
  isDataReady: boolean;
  logMeal: (analysis: AnalysisResult, photoUri: string | null, mealType?: MealType) => Meal;
  editMeal: (meal: Meal) => void;
  removeMeal: (id: string) => void;
  saveGoals: (goals: Goals) => void;
  saveProfile: (profile: Profile) => void;
  completeOnboarding: () => void;
  getHistory: (days: number) => DaySummary[];
  getRecentMeals: (limit?: number) => Meal[];
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
      fiber: acc.fiber + (m.fiber ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

const EMPTY_TOTALS: Totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: authLoaded, userId, isSignedIn } = useAuth();

  const [isDataReady, setIsDataReady] = useState(false);
  const [goals, setGoalsState] = useState<Goals>(DEFAULT_GOALS);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [version, setVersion] = useState(0);

  // Tracks whose data is currently loaded, so we only reload/reset when the
  // *account* actually changes (not on every Clerk state re-render).
  const loadedForRef = useRef<string | null | undefined>(undefined);

  // The critical account-isolation step: whenever the authenticated user
  // changes — first launch, sign-in, sign-up, sign-out, or switching to a
  // different account on the same device — point the local database at
  // that user's own file and reload every piece of state from it. This
  // runs before any screen can read stale data from the previous account.
  useEffect(() => {
    if (!authLoaded) return;
    const nextUser = isSignedIn ? (userId ?? null) : null;
    if (loadedForRef.current === nextUser) return;
    loadedForRef.current = nextUser;

    setIsDataReady(false);
    db.setActiveUser(nextUser);

    // Adopt the onboarding draft (profile/goals computed pre-auth, in the
    // shared guest database) only into a brand-new account that has never
    // been onboarded in its own database — driven by DB state rather than
    // by which screen triggered this, so an existing account signing back
    // in can never have its real saved data overwritten by whatever draft
    // happens to be sitting in this device's guest scratch space.
    if (nextUser && db.kvGet('onboarded') !== '1') {
      db.adoptGuestData(nextUser);
    }

    setGoalsState(db.getGoals());
    setProfileState(db.getProfile());
    setTodayMeals(db.getMealsForDay(todayKey()));
    setIsOnboarded(db.kvGet('onboarded') === '1');
    setVersion((v) => v + 1);
    setIsDataReady(true);
  }, [authLoaded, isSignedIn, userId]);

  const refresh = useCallback(() => {
    setTodayMeals(db.getMealsForDay(todayKey()));
    setGoalsState(db.getGoals());
    setVersion((v) => v + 1);
  }, []);

  const totals = useMemo(() => (isDataReady ? computeTotals(todayMeals) : EMPTY_TOTALS), [todayMeals, isDataReady]);

  // Keep the home screen widget in sync with today's numbers.
  useEffect(() => {
    if (isDataReady) syncWidget(totals, goals);
  }, [isDataReady, totals, goals]);

  const logMeal = useCallback(
    (analysis: AnalysisResult, photoUri: string | null, mealType?: MealType): Meal => {
      const meal: Meal = {
        id: Crypto.randomUUID(),
        name: analysis.name,
        emoji: analysis.emoji,
        mealType: mealType ?? inferMealTypeFromHour(),
        calories: analysis.calories,
        protein: analysis.protein,
        carbs: analysis.carbs,
        fat: analysis.fat,
        fiber: analysis.fiber ?? 0,
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
    (days: number) => (isDataReady ? db.getDaySummaries(lastNDayKeys(days)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, isDataReady],
  );

  const getRecentMeals = useCallback(
    (limit = 10) => (isDataReady ? db.getRecentUniqueMeals(limit) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, isDataReady],
  );

  const value = useMemo(
    () => ({
      goals,
      profile,
      todayMeals,
      totals,
      isOnboarded,
      isDataReady,
      logMeal,
      editMeal,
      removeMeal,
      saveGoals,
      saveProfile,
      completeOnboarding,
      getHistory,
      getRecentMeals,
      refresh,
    }),
    [
      goals,
      profile,
      todayMeals,
      totals,
      isOnboarded,
      isDataReady,
      logMeal,
      editMeal,
      removeMeal,
      saveGoals,
      saveProfile,
      completeOnboarding,
      getHistory,
      getRecentMeals,
      refresh,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { DEFAULT_GOALS };
