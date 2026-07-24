import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import * as db from './db';
import { lastNDays, todayKey } from './dates';
import * as nativeSync from './native-sync';
import { goalsFromProfile } from './nutrition';
import { seedIfEmpty } from './seed';
import { DaySummary, FoodEntry, Goals, Macros, NewFoodEntry, Profile, sumMacros, ZERO_MACROS } from './types';

const HISTORY_DAYS = 21;

interface Settings {
  healthSync: boolean;
  reminders: boolean;
}

interface AppContextValue {
  ready: boolean;
  onboarded: boolean;
  goals: Goals;
  profile: Profile | null;
  settings: Settings;
  todayEntries: FoodEntry[];
  todayTotals: Macros;
  history: DaySummary[];
  addFood: (e: NewFoodEntry) => Promise<FoodEntry>;
  editFood: (id: string, patch: Partial<NewFoodEntry>) => Promise<void>;
  removeFood: (id: string) => Promise<void>;
  saveGoals: (goals: Goals) => Promise<void>;
  completeOnboarding: (profile: Profile, goals?: Goals) => Promise<void>;
  setHealthSync: (enabled: boolean) => Promise<void>;
  setReminders: (enabled: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [goals, setGoalsState] = useState<Goals>(db.DEFAULT_GOALS);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings>({ healthSync: false, reminders: false });
  const [todayEntries, setTodayEntries] = useState<FoodEntry[]>([]);
  const [history, setHistory] = useState<DaySummary[]>([]);
  const goalsRef = useRef(goals);
  goalsRef.current = goals;
  const healthSyncRef = useRef(settings.healthSync);
  healthSyncRef.current = settings.healthSync;

  const todayTotals = useMemo(() => sumMacros(todayEntries), [todayEntries]);

  const refresh = useCallback(async () => {
    const key = todayKey();
    const [entries, summaries] = await Promise.all([
      db.getEntriesForDate(key),
      db.getDaySummaries(lastNDays(HISTORY_DAYS)),
    ]);
    setTodayEntries(entries);
    setHistory(summaries);
  }, []);

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      const [g, p, ob, hs, rem] = await Promise.all([
        db.getGoals(),
        db.getProfile(),
        db.hasCompletedOnboarding(),
        db.getSetting<boolean>('healthSync', false),
        db.getSetting<boolean>('reminders', false),
      ]);
      setGoalsState(g);
      setProfile(p);
      setOnboarded(ob);
      setSettings({ healthSync: hs, reminders: rem });
      await refresh();
      setReady(true);
    })();
  }, [refresh]);

  // Keep widget + Live Activity in sync with today's progress.
  useEffect(() => {
    if (ready) void nativeSync.syncTodayProgress(todayTotals, goals);
  }, [ready, todayTotals, goals]);

  const addFood = useCallback(
    async (e: NewFoodEntry) => {
      const entry = await db.addEntry(e);
      await refresh();
      if (healthSyncRef.current) {
        const ok = await nativeSync.syncEntryToHealth(entry);
        if (ok) {
          await db.markSyncedToHealth(entry.id);
          await refresh();
        }
      }
      return entry;
    },
    [refresh]
  );

  const editFood = useCallback(
    async (id: string, patch: Partial<NewFoodEntry>) => {
      await db.updateEntry(id, patch);
      await refresh();
    },
    [refresh]
  );

  const removeFood = useCallback(
    async (id: string) => {
      await db.deleteEntry(id);
      await refresh();
    },
    [refresh]
  );

  const saveGoals = useCallback(
    async (g: Goals) => {
      await db.setGoals(g);
      setGoalsState(g);
    },
    []
  );

  const completeOnboarding = useCallback(async (p: Profile, g?: Goals) => {
    const finalGoals = g ?? goalsFromProfile(p);
    await db.setProfile(p);
    await db.setGoals(finalGoals);
    await db.setOnboardingComplete();
    setProfile(p);
    setGoalsState(finalGoals);
    setOnboarded(true);
  }, []);

  const setHealthSync = useCallback(async (enabled: boolean) => {
    const granted = await nativeSync.setHealthSyncEnabled(enabled);
    const effective = enabled && granted;
    await db.setSetting('healthSync', effective);
    setSettings((s) => ({ ...s, healthSync: effective }));
  }, []);

  const setReminders = useCallback(async (enabled: boolean) => {
    await nativeSync.setDailyReminderEnabled(enabled);
    await db.setSetting('reminders', enabled);
    setSettings((s) => ({ ...s, reminders: enabled }));
  }, []);

  const value: AppContextValue = {
    ready,
    onboarded,
    goals,
    profile,
    settings,
    todayEntries,
    todayTotals,
    history,
    addFood,
    editFood,
    removeFood,
    saveGoals,
    completeOnboarding,
    setHealthSync,
    setReminders,
    refresh,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
