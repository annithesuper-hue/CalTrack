import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Field, PrimaryButton, Screen } from '@/components/ui';
import { colors } from '@/constants/design';
import { useApp } from '@/providers/app-provider';

export default function GoalsScreen() {
  const app = useApp();
  const [calories, setCalories] = useState(String(app.goals.calories));
  const [protein, setProtein] = useState(String(app.goals.protein));
  const [carbs, setCarbs] = useState(String(app.goals.carbs));
  const [fat, setFat] = useState(String(app.goals.fat));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await app.saveGoals({
      calories: Number(calories) || app.goals.calories,
      protein: Number(protein) || app.goals.protein,
      carbs: Number(carbs) || app.goals.carbs,
      fat: Number(fat) || app.goals.fat,
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close goals" onPress={() => router.back()}>
          <View style={styles.close}>
            <SymbolView name="xmark" size={18} tintColor={colors.ink} />
          </View>
        </Pressable>
        <AppText variant="label">Daily goals</AppText>
        <View style={styles.close} />
      </View>
      <View style={styles.copy}>
        <AppText variant="eyebrow" color={colors.limeDark}>YOUR TARGETS</AppText>
        <AppText variant="title">Plan the day you can repeat.</AppText>
        <AppText color={colors.inkMuted}>
          Keep targets realistic enough for consistency and useful enough to guide choices.
        </AppText>
      </View>
      <Card style={styles.form}>
        <Field label="Daily calories" value={calories} onChangeText={setCalories} keyboardType="number-pad" suffix="kcal" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Protein" value={protein} onChangeText={setProtein} keyboardType="number-pad" suffix="g" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Carbs" value={carbs} onChangeText={setCarbs} keyboardType="number-pad" suffix="g" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Fat" value={fat} onChangeText={setFat} keyboardType="number-pad" suffix="g" />
          </View>
        </View>
      </Card>
      <Card dark style={styles.tip}>
        <SymbolView name="lightbulb.fill" size={24} tintColor={colors.lime} />
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={colors.white}>A useful protein target</AppText>
          <AppText variant="caption" color="#AAB4AC">
            Many active adults use 1.6–2.2g per kg of body weight, adjusted for personal needs.
          </AppText>
        </View>
      </Card>
      <View style={{ flex: 1 }} />
      <PrimaryButton label="Save goals" onPress={save} loading={saving} tone="lime" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'flex-start' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: 10 },
  form: { gap: 16 },
  row: { flexDirection: 'row', gap: 8 },
  tip: { flexDirection: 'row', gap: 13, alignItems: 'flex-start' },
});

