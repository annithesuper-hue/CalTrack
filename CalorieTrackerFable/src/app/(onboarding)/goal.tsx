import { router } from 'expo-router';
import React, { useState } from 'react';

import { OnboardingScreen } from '@/components/onboarding-screen';
import { SelectCard } from '@/components/select-card';
import { draft } from '@/lib/onboarding-draft';
import type { GoalType } from '@/lib/types';

const OPTIONS: { value: GoalType; emoji: string; title: string; subtitle: string }[] = [
  { value: 'lose', emoji: '🔥', title: 'Lose weight', subtitle: 'Steady, sustainable fat loss' },
  { value: 'maintain', emoji: '⚖️', title: 'Maintain', subtitle: 'Stay right where you are' },
  { value: 'gain', emoji: '💪', title: 'Build muscle', subtitle: 'Lean bulk with enough protein' },
];

export default function Goal() {
  const [selected, setSelected] = useState<GoalType>(draft.goalType);

  return (
    <OnboardingScreen
      title="What brings you here?"
      subtitle="We'll tune your daily calorie and macro targets around this."
      onNext={() => {
        draft.goalType = selected;
        router.push('/(onboarding)/about');
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
