import { useUser } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { usePro } from '@/lib/revenuecat';

const C = Colors.dark;

const BENEFITS = [
  'Unlimited AI photo scans',
  'Apple Health sync',
  'Home screen widget & Live Activity',
  'Smart reminders',
] as const;

type PlanKey = 'weekly' | 'yearly';

export default function PaywallScreen() {
  const router = useRouter();
  const { dismissable } = useLocalSearchParams<{ dismissable?: string }>();
  const { user } = useUser();
  const { ready, weekly, yearly, purchase, restore, logIn, refresh } = usePro();

  const [selected, setSelected] = useState<PlanKey>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const packagesReady = weekly !== null || yearly !== null;
  const selectedPkg: PurchasesPackage | null =
    selected === 'yearly' ? (yearly ?? weekly) : (weekly ?? yearly);

  // Identify the RevenueCat customer with the Clerk user id.
  useEffect(() => {
    if (user?.id) void logIn(user.id);
  }, [user?.id, logIn]);

  const savingsBadge = useMemo(() => {
    const w = weekly?.product.price;
    const y = yearly?.product.price;
    if (w && y && w > 0 && y > 0) {
      const pct = Math.round((1 - y / (w * 52)) * 100);
      if (pct > 0) return `SAVE ~${pct}%`;
    }
    return 'BEST VALUE';
  }, [weekly, yearly]);

  const perWeekLabel = yearly?.product.pricePerWeekString
    ? `${yearly.product.pricePerWeekString} / week`
    : null;

  const handlePurchase = async () => {
    if (purchasing || !selectedPkg) return;
    setPurchasing(true);
    setError(null);
    setNotice(null);
    const result = await purchase(selectedPkg);
    setPurchasing(false);
    if (result.cancelled) return; // user dismissed the sheet — stay silent
    if (result.error) {
      setError(result.error);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Cast: expo-router typed routes (.expo/types) are not generated yet.
    router.replace('/' as any);
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    setError(null);
    setNotice(null);
    const result = await restore();
    setRestoring(false);
    if (result.error) {
      setError(result.error);
    } else {
      setNotice('Purchases restored.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {dismissable === '1' ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}>
          <SymbolView name="xmark" size={16} tintColor={C.textSecondary} weight="semibold" />
        </Pressable>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.logoMark}>
          <SymbolView name="flame.fill" size={30} tintColor={C.background} />
        </View>
        <Text style={styles.headline}>CalTrack Pro</Text>
        <Text style={styles.subline}>Unlock unlimited AI food scanning</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <SymbolView name="checkmark.circle.fill" size={20} tintColor={C.tint} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {!ready || !packagesReady ? (
          <View style={styles.planList}>
            <View style={[styles.planCard, styles.skeleton]} />
            <View style={[styles.planCard, styles.skeleton]} />
            {ready && !packagesReady ? (
              <Pressable onPress={() => void refresh()} style={styles.retryButton}>
                <Text style={styles.retryText}>
                  Couldn't load plans — tap to retry
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.planList}>
            {yearly ? (
              <PlanCard
                title="Yearly"
                price={yearly.product.priceString}
                detail={perWeekLabel}
                badge={savingsBadge}
                selected={selected === 'yearly'}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelected('yearly');
                }}
              />
            ) : null}
            {weekly ? (
              <PlanCard
                title="Weekly"
                price={weekly.product.priceString}
                detail="Billed weekly"
                selected={selected === 'weekly'}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelected('weekly');
                }}
              />
            ) : null}
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => void handlePurchase()}
          disabled={purchasing || !selectedPkg}
          style={({ pressed }) => [
            styles.cta,
            (pressed || purchasing || !selectedPkg) && styles.ctaPressed,
          ]}>
          <Text style={styles.ctaText}>{purchasing ? 'Processing…' : 'Continue'}</Text>
        </Pressable>

        <Pressable onPress={() => void handleRestore()} disabled={restoring}>
          <Text style={styles.restore}>
            {restoring ? 'Restoring…' : 'Restore purchases'}
          </Text>
        </Pressable>

        <Text style={styles.smallPrint}>
          Payment will be charged to your Apple ID. Subscription renews automatically
          unless canceled.
        </Text>
        <View style={styles.legalRow}>
          <Text style={styles.legalLink}>Terms of Service</Text>
          <Text style={styles.legalDot}>·</Text>
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </View>
      </View>
    </SafeAreaView>
  );
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
  detail?: string | null;
  badge?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.planCard, selected && styles.planCardSelected]}>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <View style={styles.planText}>
        <Text style={styles.planTitle}>{title}</Text>
        {detail ? <Text style={styles.planDetail}>{detail}</Text> : null}
      </View>
      <Text style={styles.planPrice}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  close: {
    position: 'absolute',
    top: Spacing.five,
    right: Spacing.four,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: C.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  headline: {
    fontSize: 34,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -0.5,
  },
  subline: { fontSize: 16, color: C.textSecondary },
  benefits: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
    paddingHorizontal: Spacing.two,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  benefitText: { fontSize: 17, fontWeight: '600', color: C.text },
  planList: { alignSelf: 'stretch', gap: Spacing.two },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.backgroundElement,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: C.border,
    padding: Spacing.three,
    minHeight: 76,
    gap: Spacing.three,
  },
  planCardSelected: { borderColor: C.tint, backgroundColor: C.backgroundSelected },
  skeleton: { opacity: 0.4 },
  badge: {
    position: 'absolute',
    top: -11,
    right: Spacing.three,
    backgroundColor: C.tint,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: C.background },
  planText: { flex: 1, gap: 2 },
  planTitle: { fontSize: 17, fontWeight: '800', color: C.text },
  planDetail: { fontSize: 13, color: C.textSecondary },
  planPrice: { fontSize: 18, fontWeight: '800', color: C.text },
  retryButton: { paddingVertical: Spacing.two, alignItems: 'center' },
  retryText: { color: C.tint, fontSize: 14, fontWeight: '600' },
  error: { color: C.danger, fontSize: 14, textAlign: 'center', marginTop: Spacing.two },
  notice: { color: C.tint, fontSize: 14, textAlign: 'center', marginTop: Spacing.two },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
    alignItems: 'center',
  },
  cta: {
    alignSelf: 'stretch',
    backgroundColor: C.tint,
    borderRadius: Radius.full,
    paddingVertical: 19,
    alignItems: 'center',
  },
  ctaPressed: { opacity: 0.7 },
  ctaText: { color: C.background, fontSize: 18, fontWeight: '800' },
  restore: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  smallPrint: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  legalRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  legalLink: { fontSize: 12, color: C.textSecondary, textDecorationLine: 'underline' },
  legalDot: { fontSize: 12, color: C.textSecondary },
});
