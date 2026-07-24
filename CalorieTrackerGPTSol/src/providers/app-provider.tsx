import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  deleteMeal as deleteMealFromDb,
  getGoals,
  getHistory,
  getMealsForDay,
  getSetting,
  insertMeal,
  saveGoals as saveGoalsToDb,
  setSetting,
} from '@/lib/database';
import { localDay } from '@/lib/date';
import {
  DEFAULT_GOALS,
  EMPTY_TOTALS,
  type AppState,
  type Goals,
  type MealRecord,
} from '@/lib/types';
import { enableHealthIntegration, syncNutritionToHealth } from '@/services/health';
import { updateCalorieWidget } from '@/widgets/calorie-widget';

type AppContextValue = AppState & {
  totals: Goals;
  refresh: () => Promise<void>;
  saveMeal: (meal: Omit<MealRecord, 'id' | 'day' | 'eatenAt'>) => Promise<void>;
  deleteMeal: (id: number) => Promise<void>;
  saveGoals: (goals: Goals) => Promise<void>;
  finishOnboarding: (goals: Goals) => Promise<void>;
  enableHealth: () => Promise<boolean>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [state, setState] = useState<AppState>({
    ready: false,
    onboardingComplete: false,
    goals: DEFAULT_GOALS,
    todayMeals: [],
    history: [],
  });

  const refresh = useCallback(async () => {
    const [goals, todayMeals, history, onboarding] = await Promise.all([
      getGoals(db),
      getMealsForDay(db, localDay()),
      getHistory(db, 14),
      getSetting(db, 'onboarding_complete'),
    ]);
    setState({
      ready: true,
      goals,
      todayMeals,
      history,
      onboardingComplete: onboarding === '1',
    });
  }, [db]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const totals = useMemo(
    () =>
      state.todayMeals.reduce<Goals>(
        (total, meal) => ({
          calories: total.calories + meal.calories,
          protein: total.protein + meal.protein,
          carbs: total.carbs + meal.carbs,
          fat: total.fat + meal.fat,
        }),
        { ...EMPTY_TOTALS }
      ),
    [state.todayMeals]
  );

  useEffect(() => {
    if (!state.ready) return;
    updateCalorieWidget(totals, state.goals);
  }, [state.goals, state.ready, totals]);

  const saveMeal = useCallback(
    async (meal: Omit<MealRecord, 'id' | 'day' | 'eatenAt'>) => {
      await insertMeal(db, meal);
      if ((await getSetting(db, 'health_enabled')) === '1') {
        await syncNutritionToHealth(meal);
      }
      await refresh();
    },
    [db, refresh]
  );

  const deleteMeal = useCallback(
    async (id: number) => {
      await deleteMealFromDb(db, id);
      await refresh();
    },
    [db, refresh]
  );

  const saveGoals = useCallback(
    async (goals: Goals) => {
      await saveGoalsToDb(db, goals);
      await refresh();
    },
    [db, refresh]
  );

  const finishOnboarding = useCallback(
    async (goals: Goals) => {
      await saveGoalsToDb(db, goals);
      await setSetting(db, 'onboarding_complete', '1');
      await refresh();
    },
    [db, refresh]
  );

  const enableHealth = useCallback(async () => {
    const enabled = await enableHealthIntegration();
    if (enabled) await setSetting(db, 'health_enabled', '1');
    return enabled;
  }, [db]);

  const value = useMemo(
    () => ({
      ...state,
      totals,
      refresh,
      saveMeal,
      deleteMeal,
      saveGoals,
      finishOnboarding,
      enableHealth,
    }),
    [deleteMeal, enableHealth, finishOnboarding, refresh, saveGoals, saveMeal, state, totals]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
