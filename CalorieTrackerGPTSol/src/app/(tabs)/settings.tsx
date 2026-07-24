import { useClerk, useUser } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Screen } from '@/components/ui';
import { colors, radius } from '@/constants/design';
import { useApp } from '@/providers/app-provider';
import { usePurchases } from '@/providers/purchases-provider';
import { enableMealReminders } from '@/services/notifications';
import { startNutritionLiveActivity } from '@/widgets/calorie-widget';

export default function SettingsScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const app = useApp();
  const purchases = usePurchases();
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  const enableHealth = async () => {
    const enabled = await app.enableHealth();
    setHealthStatus(enabled ? 'Connected' : 'Not available');
    Haptics.notificationAsync(
      enabled ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
  };

  const enableNotifications = async () => {
    const result = await enableMealReminders();
    if (result.pushToken && user) {
      await user.update({
        unsafeMetadata: { ...user.unsafeMetadata, expoPushToken: result.pushToken },
      });
    }
    setNotificationStatus(result.enabled ? '3 daily reminders' : 'Permission needed');
  };

  return (
    <Screen>
      <View>
        <AppText variant="eyebrow" color={colors.limeDark}>MAKE IT YOURS</AppText>
        <AppText variant="title">Settings</AppText>
      </View>

      <Card dark style={styles.profile}>
        <View style={styles.avatar}>
          <AppText variant="heading" color={colors.ink}>
            {(user?.firstName?.[0] ?? user?.primaryEmailAddress?.emailAddress[0] ?? 'C').toUpperCase()}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="heading" color={colors.white}>{user?.fullName ?? 'CalTrack member'}</AppText>
          <AppText variant="caption" color="#AAB4AC">
            {user?.primaryEmailAddress?.emailAddress}
          </AppText>
        </View>
        <View style={styles.proPill}>
          <AppText variant="eyebrow" color={colors.ink}>PRO</AppText>
        </View>
      </Card>

      <SettingsSection title="Your plan">
        <SettingsRow
          icon="target"
          title="Daily goals"
          detail={`${app.goals.calories} kcal · ${app.goals.protein}g protein`}
          onPress={() => router.push('/goals')}
        />
      </SettingsSection>

      <SettingsSection title="Connected experience">
        <SettingsRow
          icon="heart.fill"
          title="Apple Health"
          detail={healthStatus ?? 'Sync nutrition when you save a meal'}
          color="#FFCDD0"
          onPress={enableHealth}
        />
        <SettingsRow
          icon="bell.badge.fill"
          title="Meal reminders"
          detail={notificationStatus ?? 'Smart nudges at breakfast, lunch and dinner'}
          color="#D9E8FF"
          onPress={enableNotifications}
        />
        <SettingsRow
          icon="platter.filled.top.and.arrow.up.iphone"
          title="Live Activity"
          detail="Keep calories on your Lock Screen"
          color="#DFF5CB"
          onPress={() => {
            startNutritionLiveActivity(app.totals, app.goals);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
      </SettingsSection>

      <SettingsSection title="Subscription">
        <SettingsRow
          icon="arrow.clockwise"
          title="Restore purchases"
          detail={purchases.isPro ? 'CalTrack Pro is active' : 'Check for an existing plan'}
          onPress={() => purchases.restore()}
        />
      </SettingsSection>

      <Pressable
        accessibilityRole="button"
        onPress={() => signOut({ redirectUrl: '/' })}
        style={styles.signOut}>
        <AppText variant="label" color={colors.red}>Sign out</AppText>
      </Pressable>
      <AppText variant="caption" color={colors.inkMuted} style={{ textAlign: 'center' }}>
        CalTrack 1.0 · Estimates are informational, not medical advice.
      </AppText>
    </Screen>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 9 }}>
      <AppText variant="caption" color={colors.inkMuted}>{title.toUpperCase()}</AppText>
      <Card style={styles.section}>{children}</Card>
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  detail,
  onPress,
  color = colors.surfaceSoft,
}: {
  icon: 'target' | 'heart.fill' | 'bell.badge.fill' | 'platter.filled.top.and.arrow.up.iphone' | 'arrow.clockwise';
  title: string;
  detail: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.65 }]}>
      <View style={[styles.rowIcon, { backgroundColor: color }]}>
        <SymbolView name={icon} size={20} tintColor={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption" color={colors.inkMuted}>{detail}</AppText>
      </View>
      <SymbolView name="chevron.right" size={15} tintColor="#99A299" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proPill: {
    backgroundColor: colors.lime,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  section: { paddingVertical: 3, paddingHorizontal: 14 },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOut: {
    minHeight: 54,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#F0C9C9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8F7',
  },
});

