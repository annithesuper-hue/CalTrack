import { router } from 'expo-router';
import React, { useState } from 'react';

import { OnboardingScreen } from '@/components/onboarding-screen';
import { SelectCard } from '@/components/select-card';
import { draft } from '@/lib/onboarding-draft';
import type { ActivityLevel } from '@/lib/types';

const OPTIONS: { value: ActivityLevel; emoji: string; title: string; subtitle: string }[] = [
  { value: 'sedentary', emoji: '🪑', title: 'Mostly sitting', subtitle: 'Desk job, little exercise' },
  { value: 'light', emoji: '🚶', title: 'Lightly active', subtitle: 'Walks or workouts 1–3× a week' },
  { value: 'moderate', emoji: '🏃', title: 'Active', subtitle: 'Exercise 3–5× a week' },
  { value: 'very', emoji: '🏋️', title: 'Very active', subtitle: 'Hard training most days' },
];

export default function Activity() {
  const [selected, setSelected] = useState<ActivityLevel>(draft.activity);

  return (
    <OnboardingScreen
      title="How active are you?"
      subtitle="Be honest — this changes your daily calorie budget quite a bit."
      onNext={() => {
        draft.activity = selected;
        router.push('/(onboarding)/plan');
      }}>
      {OPTIONS.map((o) => (
        <SelectCard
          key={o.value}
          emoji={o.emoji}
          title={o.title}
          subtitle={o.subtitle}
          selected={selected === o.value}
          onPress={() => setSelected(o.value)}
        />
      ))}
    </OnboardingScreen>
  );
}
