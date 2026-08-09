import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import { Button } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { enableReminders } from '@/lib/notifications';
import { usePurchases } from '@/lib/purchases';
import { Colors, Radius, Shadow, Spacing, Type } from '@/lib/theme';

const FEATURES = [
  { icon: 'camera.viewfinder', title: 'Unlimited photo scans', subtitle: 'Log any meal with one picture' },
  { icon: 'chart.bar.fill', title: 'Progress & trends', subtitle: 'Charts that keep you accountable' },
  { icon: 'heart.fill', title: 'Apple Health sync', subtitle: 'Nutrition flows into Health automatically' },
  { icon: 'bell.badge.fill', title: 'Smart reminders', subtitle: 'Never forget to log a meal' },
] as const;

export default function Paywall() {
  const insets = useSafeAreaInsets();
  const { packages, purchase, restore } = usePurchases();
  const [purchasing, setPurchasing] = useState(false);

  const weekly = useMemo(() => packages.find((p) => p.packageType === 'WEEKLY'), [packages]);
  const annual = useMemo(() => packages.find((p) => p.packageType === 'ANNUAL'), [packages]);
  const [selected, setSelected] = useState<'WEEKLY' | 'ANNUAL'>('ANNUAL');

  const selectedPackage = selected === 'ANNUAL' ? annual : weekly;

  const savings = useMemo(() => {
    if (!weekly || !annual) return null;
    const yearAtWeekly = weekly.product.price * 52;
    if (yearAtWeekly <= 0) return null;
    return Math.round((1 - annual.product.price / yearAtWeekly) * 100);
  }, [weekly, annual]);

  const buy = async () => {
    if (!selectedPackage) return;
    setPurchasing(true);
    haptic.medium();
    const success = await purchase(selectedPackage);
    setPurchasing(false);
    if (success) {
      haptic.success();
      // Reminders help retention; ask while intent is high.
      void enableReminders();
      router.replace('/(tabs)');
    } else {
      haptic.warning();
    }
  };

  const handleRestore = async () => {
    const restored = await restore();
    if (restored) {
      haptic.success();
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl }]}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.proBadge}>
            <SymbolView name="sparkles" size={14} tintColor={Colors.green} />
            <Text style={styles.proBadgeText}>CALTRACK PRO</Text>
          </View>
          <Text style={styles.title}>Reach your goal{'\n'}3× faster</Text>
          <Text style={styles.subtitle}>
            People who track consistently lose twice as much weight. CalTrack makes it effortless.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <SymbolView name={f.icon} size={17} tintColor={Colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSubtitle}>{f.subtitle}</Text>
              </View>
              <SymbolView name="checkmark" size={14} tintColor={Colors.green} weight="bold" />
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(240)} style={styles.plans}>
          {annual && (
            <PlanCard
              title="Yearly"
              price={annual.product.priceString}
              detail={`${perWeek(annual)} / week`}
              badge={savings ? `SAVE ${savings}%` : 'BEST VALUE'}
              selected={selected === 'ANNUAL'}
              onPress={() => setSelected('ANNUAL')}
            />
          )}
          {weekly && (
            <PlanCard
              title="Weekly"
              price={weekly.product.priceString}
              detail="per week"
              selected={selected === 'WEEKLY'}
              onPress={() => setSelected('WEEKLY')}
            />
          )}
          {packages.length === 0 && (
            <Text style={styles.loadingPlans}>Loading plans…</Text>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <Button
          title={selected === 'ANNUAL' ? 'Start Yearly Plan' : 'Start Weekly Plan'}
          onPress={buy}
          loading={purchasing}
          disabled={!selectedPackage}
        />
        <View style={styles.footerLinks}>
          <Text style={styles.footerNote}>Cancel anytime in Settings.</Text>
          <Text style={styles.restoreLink} onPress={handleRestore}>
            Restore purchases
          </Text>
        </View>
      </View>
    </View>
  );
}

function perWeek(pkg: PurchasesPackage): string {
  const symbol = pkg.product.priceString.replace(/[\d.,\s]/g, '') || '$';
  return `${symbol}${(pkg.product.price / 52).toFixed(2)}`;
}

function PlanCard({
  title,
  price,
  detail,
  badge,
  selected,
  onPress,
}: {
  title: string;
  price: string;
  detail: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={[styles.planCard, selected && styles.planCardSelected]}>
      {badge ? (
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.planTitle}>{title}</Text>
        <Text style={styles.planDetail}>{detail}</Text>
      </View>
      <Text style={styles.planPrice}>{price}</Text>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <SymbolView name="checkmark" size={12} tintColor="#FFFFFF" weight="bold" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: Spacing.screen,
    paddingBottom: Spacing.xl,
  },
  header: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.greenSoft,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: Colors.green,
  },
  title: {
    ...Type.title,
    fontSize: 32,
    lineHeight: 36,
  },
  subtitle: {
    ...Type.secondary,
    lineHeight: 22,
  },
  features: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
  },
  featureSubtitle: {
    fontSize: 13,
    color: Colors.inkSecondary,
    marginTop: 1,
  },
  plans: {
    gap: Spacing.md,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.hairline,
    ...Shadow.card,
  },
  planCardSelected: {
    borderColor: Colors.ink,
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: Spacing.lg,
    backgroundColor: Colors.green,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },
  planDetail: {
    fontSize: 13,
    color: Colors.inkSecondary,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: Colors.ink,
    borderColor: Colors.ink,
  },
  loadingPlans: {
    ...Type.secondary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  footerNote: {
    fontSize: 13,
    color: Colors.inkMuted,
  },
  restoreLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.inkSecondary,
  },
});
