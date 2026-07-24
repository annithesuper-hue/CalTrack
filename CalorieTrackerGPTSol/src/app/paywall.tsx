import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { AppText, Card, PrimaryButton, Screen } from '@/components/ui';
import { colors, radius } from '@/constants/design';
import { DEFAULT_GOALS, type Goals } from '@/lib/types';
import { useApp } from '@/providers/app-provider';
import { usePurchases } from '@/providers/purchases-provider';

type Plan = {
  pkg: PurchasesPackage;
  title: string;
  cadence: string;
  badge?: string;
};

function planKind(pkg: PurchasesPackage) {
  return `${pkg.identifier} ${pkg.packageType} ${pkg.product.identifier}`.toLowerCase();
}

export default function PaywallScreen() {
  const params = useLocalSearchParams<{ onboarding?: string; goals?: string }>();
  const app = useApp();
  const purchases = usePurchases();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const goals = useMemo(() => {
    if (!params.goals) return DEFAULT_GOALS;
    try {
      return JSON.parse(params.goals) as Goals;
    } catch {
      return DEFAULT_GOALS;
    }
  }, [params.goals]);

  const plans = useMemo<Plan[]>(() => {
    const available = purchases.offering?.availablePackages ?? [];
    const weekly = available.find((pkg) => planKind(pkg).includes('week'));
    const yearly = available.find(
      (pkg) => planKind(pkg).includes('year') || planKind(pkg).includes('annual')
    );
    const result: Plan[] = [];
    if (yearly) {
      result.push({ pkg: yearly, title: 'Yearly', cadence: 'Best value', badge: 'SAVE MOST' });
    }
    if (weekly) result.push({ pkg: weekly, title: 'Weekly', cadence: 'Flexible' });
    if (!result.length) {
      available.slice(0, 2).forEach((pkg, index) =>
        result.push({
          pkg,
          title: index === 0 ? 'Yearly' : 'Weekly',
          cadence: index === 0 ? 'Best value' : 'Flexible',
          badge: index === 0 ? 'MOST POPULAR' : undefined,
        })
      );
    }
    return result;
  }, [purchases.offering]);

  useEffect(() => {
    if (!selectedId && plans[0]) setSelectedId(plans[0].pkg.identifier);
  }, [plans, selectedId]);

  const selected = plans.find((plan) => plan.pkg.identifier === selectedId) ?? plans[0];

  const finish = async () => {
    if (params.onboarding === '1') await app.finishOnboarding(goals);
    router.replace('/');
  };

  const buy = async () => {
    if (!selected) return;
    setBusy(true);
    const success = await purchases.purchase(selected.pkg);
    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await finish();
    }
    setBusy(false);
  };

  const restore = async () => {
    setBusy(true);
    const success = await purchases.restore();
    if (success) await finish();
    setBusy(false);
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <SymbolView name="sparkles" size={25} tintColor={colors.ink} />
        </View>
        <AppText variant="eyebrow" color={colors.limeDark}>CALTRACK PRO</AppText>
        <AppText variant="hero" style={{ textAlign: 'center' }}>
          Make every meal count.
        </AppText>
        <AppText color={colors.inkMuted} style={{ textAlign: 'center' }}>
          Unlimited AI meal scans, full trends, widgets and Apple Health sync.
        </AppText>
      </View>

      <Card dark style={styles.promise}>
        {[
          ['camera.fill', 'Unlimited photo analysis'],
          ['chart.bar.xaxis', '14-day calorie and macro trends'],
          ['heart.fill', 'Apple Health nutrition sync'],
          ['rectangle.stack.badge.plus', 'Widget and Live Activity'],
        ].map(([icon, label]) => (
          <View key={label} style={styles.promiseRow}>
            <View style={styles.check}>
              <SymbolView name={icon as 'camera.fill'} size={17} tintColor={colors.ink} />
            </View>
            <AppText variant="label" color={colors.white}>{label}</AppText>
          </View>
        ))}
      </Card>

      <View style={styles.plans}>
        {!purchases.ready ? <ActivityIndicator color={colors.limeDark} /> : null}
        {plans.map((plan) => {
          const selectedPlan = plan.pkg.identifier === selectedId;
          return (
            <Pressable
              key={plan.pkg.identifier}
              accessibilityRole="radio"
              accessibilityLabel={`${plan.title}, ${plan.pkg.product.priceString}`}
              accessibilityState={{ selected: selectedPlan }}
              onPress={() => {
                setSelectedId(plan.pkg.identifier);
                Haptics.selectionAsync();
              }}
              style={[styles.plan, selectedPlan && styles.planSelected]}>
              {plan.badge ? (
                <View style={styles.badge}>
                  <AppText variant="eyebrow" color={colors.ink}>{plan.badge}</AppText>
                </View>
              ) : null}
              <View style={[styles.radio, selectedPlan && styles.radioSelected]} />
              <View style={{ flex: 1 }}>
                <AppText variant="heading">{plan.title}</AppText>
                <AppText variant="caption" color={colors.inkMuted}>{plan.cadence}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="heading">{plan.pkg.product.priceString}</AppText>
                <AppText variant="caption" color={colors.inkMuted}>
                  {plan.title === 'Yearly' ? 'per year' : 'per week'}
                </AppText>
              </View>
            </Pressable>
          );
        })}
        {purchases.error ? (
          <AppText variant="caption" color={colors.red} style={{ textAlign: 'center' }}>
            {purchases.error}
          </AppText>
        ) : null}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label={selected ? `Continue with ${selected.title}` : 'Loading plans…'}
          onPress={buy}
          tone="lime"
          loading={busy}
          disabled={!selected}
          testID="paywall-purchase"
        />
        <Pressable onPress={restore} disabled={busy} accessibilityRole="button">
          <AppText variant="caption" color={colors.inkMuted} style={{ textAlign: 'center' }}>
            Restore purchases
          </AppText>
        </Pressable>
        <AppText variant="caption" color={colors.inkMuted} style={{ textAlign: 'center' }}>
          Cancel anytime · Secure purchase via RevenueCat
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between' },
  header: { alignItems: 'center', gap: 11, paddingTop: 6 },
  logo: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  promise: { gap: 16, paddingVertical: 22 },
  promiseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plans: { gap: 12 },
  plan: {
    minHeight: 86,
    borderRadius: radius.lg,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  planSelected: { borderColor: colors.ink, backgroundColor: '#F2FAE9' },
  badge: {
    position: 'absolute',
    top: -9,
    right: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.lime,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#B8C0B8' },
  radioSelected: { borderWidth: 6, borderColor: colors.ink, backgroundColor: colors.lime },
  actions: { gap: 13 },
});

