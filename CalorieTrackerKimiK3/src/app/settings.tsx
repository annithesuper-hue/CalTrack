import { useAuth, useUser } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { StepperInput } from '@/components/stepper-input';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { goalsFromProfile } from '@/lib/nutrition';
import { usePro } from '@/lib/revenuecat';
import { useApp } from '@/lib/store';

const C = Colors.dark;

export default function SettingsScreen() {
  const { goals, profile, settings, saveGoals, setHealthSync, setReminders } = useApp();
  const { isPro } = usePro();
  const { user } = useUser();
  const { signOut } = useAuth();

  const [calories, setCalories] = useState(String(Math.round(goals.calories)));
  const [protein, setProtein] = useState(String(Math.round(goals.protein)));
  const [carbs, setCarbs] = useState(String(Math.round(goals.carbs)));
  const [fat, setFat] = useState(String(Math.round(goals.fat)));

  const recalculate = () => {
    if (!profile) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const g = goalsFromProfile(profile);
    setCalories(String(g.calories));
    setProtein(String(g.protein));
    setCarbs(String(g.carbs));
    setFat(String(g.fat));
  };

  const save = async () => {
    await saveGoals({
      calories: parseInt(calories, 10) || goals.calories,
      protein: parseInt(protein, 10) || goals.protein,
      carbs: parseInt(carbs, 10) || goals.carbs,
      fat: parseInt(fat, 10) || goals.fat,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const openPaywall = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- typed routes lag behind new files
    router.push('/paywall?dismissable=1' as any);
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- typed routes lag behind new files
          router.replace('/' as any);
        },
      },
    ]);
  };

  const email = user?.primaryEmailAddress?.emailAddress ?? 'Signed in';

  return (
    <Screen scroll title="Settings" contentStyle={styles.content}>
      {/* Daily goals */}
      <Text style={styles.sectionTitle}>Daily goals</Text>
      <Card>
        <StepperInput label="Calories" value={calories} unit="kcal" step={50} onChange={setCalories} />
        <View style={styles.divider} />
        <StepperInput label="Protein" value={protein} unit="g" step={5} onChange={setProtein} />
        <View style={styles.divider} />
        <StepperInput label="Carbs" value={carbs} unit="g" step={10} onChange={setCarbs} />
        <View style={styles.divider} />
        <StepperInput label="Fat" value={fat} unit="g" step={5} onChange={setFat} />
      </Card>

      {profile && (
        <Pressable onPress={recalculate} style={styles.recalcButton}>
          <SymbolView name="arrow.clockwise" size={15} tintColor={C.accent} />
          <Text style={styles.recalcText}>Recalculate from profile</Text>
        </Pressable>
      )}

      <Pressable onPress={() => void save()} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
        <Text style={styles.saveText}>Save goals</Text>
      </Pressable>

      {/* Integrations */}
      <Text style={styles.sectionTitle}>Integrations</Text>
      <Card>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Apple Health</Text>
            <Text style={styles.toggleSub}>Writes logged meals to Apple Health</Text>
          </View>
          <Switch
            value={settings.healthSync}
            onValueChange={(v) => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void setHealthSync(v);
            }}
            trackColor={{ false: C.backgroundSelected, true: C.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Daily reminder</Text>
            <Text style={styles.toggleSub}>A nudge at 7:30 PM if you haven&apos;t logged dinner</Text>
          </View>
          <Switch
            value={settings.reminders}
            onValueChange={(v) => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void setReminders(v);
            }}
            trackColor={{ false: C.backgroundSelected, true: C.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      {/* Account */}
      <Text style={styles.sectionTitle}>Account</Text>
      <Card>
        <View style={styles.accountRow}>
          <SymbolView name="person.crop.circle" size={22} tintColor={C.textSecondary} />
          <Text style={styles.accountEmail} numberOfLines={1}>
            {email}
          </Text>
        </View>
        <View style={styles.divider} />
        {isPro ? (
          <View style={styles.accountRow}>
            <SymbolView name="checkmark.seal.fill" size={20} tintColor={C.accent} />
            <Text style={styles.proText}>CalTrack Pro ✓ active</Text>
          </View>
        ) : (
          <Pressable onPress={openPaywall} style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}>
            <SymbolView name="crown" size={20} tintColor={C.accent} />
            <Text style={styles.manageText}>Manage subscription</Text>
            <SymbolView name="chevron.right" size={14} tintColor={C.textSecondary} />
          </Pressable>
        )}
        <View style={styles.divider} />
        <Pressable onPress={confirmSignOut} style={({ pressed }) => [styles.accountRow, pressed && styles.pressed]}>
          <SymbolView name="rectangle.portrait.and.arrow.right" size={20} tintColor={C.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginVertical: Spacing.one,
  },
  recalcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  recalcText: {
    color: C.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: C.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three - 2,
    alignItems: 'center',
  },
  saveText: {
    color: C.background,
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '600',
  },
  toggleSub: {
    color: C.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingVertical: Spacing.two + 2,
  },
  accountEmail: {
    color: C.text,
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  proText: {
    color: C.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  manageText: {
    color: C.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  signOutText: {
    color: C.danger,
    fontSize: 16,
    fontWeight: '700',
  },
});
