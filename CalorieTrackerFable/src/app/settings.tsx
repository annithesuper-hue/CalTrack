import { useAuth, useUser } from '@clerk/expo';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NutrientField } from '@/components/nutrient-field';
import { Card, SectionLabel } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { isHealthSyncEnabled, requestHealthAccess, setHealthSyncEnabled } from '@/lib/health';
import { areRemindersEnabled, disableReminders, enableReminders } from '@/lib/notifications';
import { useApp } from '@/lib/store';
import { Radius, Spacing, ThemeColors, useColors, useMacroMeta, useTypeStyles } from '@/lib/theme';
import { endLiveActivities } from '@/lib/widget-sync';

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { goals, saveGoals } = useApp();
  const colors = useColors();
  const Type = useTypeStyles(colors);
  const MacroMeta = useMacroMeta(colors);
  const styles = useMemo(() => createStyles(colors, Type), [colors, Type]);

  const [healthOn, setHealthOn] = useState(isHealthSyncEnabled());
  const [remindersOn, setRemindersOn] = useState(areRemindersEnabled());

  const toggleHealth = async (next: boolean) => {
    haptic.select();
    if (next) {
      const granted = await requestHealthAccess();
      setHealthSyncEnabled(granted);
      setHealthOn(granted);
      if (!granted) haptic.warning();
    } else {
      setHealthSyncEnabled(false);
      setHealthOn(false);
    }
  };

  const toggleReminders = async (next: boolean) => {
    haptic.select();
    if (next) {
      const granted = await enableReminders();
      setRemindersOn(granted);
      if (!granted) haptic.warning();
    } else {
      await disableReminders();
      setRemindersOn(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'Your food log stays on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          endLiveActivities();
          await signOut();
          router.replace('/');
        },
      },
    ]);
  };

  const email = user?.emailAddresses[0]?.emailAddress ?? '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xxl }]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            haptic.tap();
            router.back();
          }}
          hitSlop={12}
          style={styles.backButton}>
          <SymbolView name="chevron.left" size={17} tintColor={colors.ink} weight="semibold" />
        </Pressable>
        <Text style={Type.heading}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(email[0] ?? '?').toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{user?.fullName ?? 'CalTrack Member'}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>
        <View style={styles.proPill}>
          <Text style={styles.proPillText}>PRO</Text>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionLabel>Daily goals</SectionLabel>
        <Card style={{ paddingVertical: Spacing.sm }}>
          <NutrientField
            label="Calories"
            value={goals.calories}
            unit="kcal"
            step={50}
            color={colors.ink}
            onChange={(calories) => saveGoals({ ...goals, calories })}
          />
          <NutrientField
            label="Protein"
            value={goals.protein}
            unit="g"
            step={5}
            color={MacroMeta.protein.color}
            onChange={(protein) => saveGoals({ ...goals, protein })}
          />
          <NutrientField
            label="Carbs"
            value={goals.carbs}
            unit="g"
            step={5}
            color={MacroMeta.carbs.color}
            onChange={(carbs) => saveGoals({ ...goals, carbs })}
          />
          <NutrientField
            label="Fat"
            value={goals.fat}
            unit="g"
            step={5}
            color={MacroMeta.fat.color}
            onChange={(fat) => saveGoals({ ...goals, fat })}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionLabel>Integrations</SectionLabel>
        <Card style={{ paddingVertical: Spacing.xs, gap: 0 }}>
          <ToggleRow
            icon="heart.fill"
            iconColor="#E5484D"
            title="Apple Health"
            subtitle="Save logged meals to Health"
            value={healthOn}
            onChange={toggleHealth}
          />
          <View style={styles.rowDivider} />
          <ToggleRow
            icon="bell.badge.fill"
            iconColor={colors.carbs}
            title="Meal reminders"
            subtitle="Gentle nudges at meal times"
            value={remindersOn}
            onChange={toggleReminders}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionLabel>Account</SectionLabel>
        <Card style={{ paddingVertical: Spacing.xs }}>
          <Pressable onPress={handleSignOut} style={styles.actionRow}>
            <SymbolView name="rectangle.portrait.and.arrow.right" size={18} tintColor={colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </Card>
      </View>

      <Text style={styles.footerNote}>CalTrack Pro · Subscription managed by RevenueCat</Text>
    </ScrollView>
  );
}

function ToggleRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: React.ComponentProps<typeof SymbolView>['name'];
  iconColor: string;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const colors = useColors();
  const Type = useTypeStyles(colors);
  const styles = useMemo(() => createStyles(colors, Type), [colors, Type]);
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleIcon, { backgroundColor: `${iconColor}18` }]}>
        <SymbolView name={icon} size={16} tintColor={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.green }} />
    </View>
  );
}

const createStyles = (colors: ThemeColors, Type: ReturnType<typeof useTypeStyles>) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: Spacing.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.onAccent,
    fontSize: 18,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.inkSecondary,
    marginTop: 1,
  },
  proPill: {
    backgroundColor: colors.greenSoft,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  proPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.green,
    letterSpacing: 0.6,
  },
  section: {
    marginTop: Spacing.xl,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: colors.inkSecondary,
    marginTop: 1,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: Spacing.xxl,
  },
});
