import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { NutrientField } from '@/components/nutrient-field';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { Card } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { draft } from '@/lib/onboarding-draft';
import { Radius, Spacing, useTheme, type Theme } from '@/lib/theme';
import type { Sex } from '@/lib/types';
import { Pressable } from 'react-native';

export default function About() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [sex, setSex] = useState<Sex>(draft.sex);
  const [age, setAge] = useState(draft.age);
  const [heightCm, setHeightCm] = useState(draft.heightCm);
  const [weightKg, setWeightKg] = useState(draft.weightKg);

  return (
    <OnboardingScreen
      title="Tell us about you"
      subtitle="We use this to estimate how much energy your body burns each day."
      ctaDisabled={age < 13 || heightCm < 100 || weightKg < 30}
      onNext={() => {
        Object.assign(draft, { sex, age, heightCm, weightKg });
        router.push('/(onboarding)/activity');
      }}>
      <View style={styles.sexRow}>
        {(
          [
            { value: 'female', label: 'Female' },
            { value: 'male', label: 'Male' },
          ] as const
        ).map((o) => (
          <Pressable
            key={o.value}
            onPress={() => {
              haptic.select();
              setSex(o.value);
            }}
            style={[styles.sexOption, sex === o.value && styles.sexOptionSelected]}>
            <Text style={[styles.sexText, sex === o.value && { color: colors.accentInk }]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
      <Card style={{ paddingVertical: Spacing.sm }}>
        <NutrientField label="Age" value={age} unit="yrs" step={1} color={colors.inkMuted} onChange={setAge} />
        <NutrientField label="Height" value={heightCm} unit="cm" step={1} color={colors.inkMuted} onChange={setHeightCm} />
        <NutrientField label="Weight" value={weightKg} unit="kg" step={1} color={colors.inkMuted} onChange={setWeightKg} />
      </Card>
    </OnboardingScreen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
  sexRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  sexOption: {
    flex: 1,
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexOptionSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  sexText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.ink,
  },
});
}
