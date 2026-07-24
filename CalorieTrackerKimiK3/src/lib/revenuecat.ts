import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import type {
  CustomerInfo,
  PurchasesError,
  PurchasesPackage,
} from 'react-native-purchases';

/**
 * RevenueCat service. Configures the SDK once inside ProProvider and exposes
 * subscription state via usePro(). All native calls are guarded so the module
 * never crashes on web or when the native module is unavailable.
 */

export const PRO_ENTITLEMENT = 'Calorie Tracker Pro';

type PurchasesModule = typeof import('react-native-purchases').default;

let cachedPurchases: PurchasesModule | null = null;

/** Lazily load the native module so importing this file is always safe. */
function getPurchases(): PurchasesModule | null {
  if (cachedPurchases) return cachedPurchases;
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedPurchases = require('react-native-purchases').default as PurchasesModule;
    return cachedPurchases;
  } catch {
    return null;
  }
}

function isProFromInfo(info: CustomerInfo | null): boolean {
  return !!info && PRO_ENTITLEMENT in info.entitlements.active;
}

interface ProContextValue {
  /** True once configuration + the initial offerings fetch has finished (ok or not). */
  ready: boolean;
  isPro: boolean;
  weekly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
  purchase: (pkg: PurchasesPackage) => Promise<{ cancelled: boolean; error: string | null }>;
  restore: () => Promise<{ error: string | null }>;
  logIn: (userId: string) => Promise<void>;
  /** Re-fetch offerings + customer info (used by the paywall retry button). */
  refresh: () => Promise<void>;
}

const ProContext = createContext<ProContextValue | null>(null);

export function ProProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [weekly, setWeekly] = useState<PurchasesPackage | null>(null);
  const [yearly, setYearly] = useState<PurchasesPackage | null>(null);
  const configuredRef = useRef(false);

  const load = useCallback(async () => {
    const Purchases = getPurchases();
    if (!Purchases) {
      setReady(true);
      return;
    }
    try {
      const [info, offerings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);
      setCustomerInfo(info);
      setWeekly(offerings.current?.weekly ?? null);
      setYearly(offerings.current?.annual ?? null);
    } catch {
      // Offline / store unavailable — paywall shows a retry state.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (configuredRef.current) return;
    configuredRef.current = true;

    const Purchases = getPurchases();
    if (!Purchases) {
      setReady(true);
      return;
    }
    try {
      Purchases.configure({
        apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_TEST!,
      });
    } catch {
      setReady(true);
      return;
    }

    const listener = (info: CustomerInfo) => setCustomerInfo(info);
    Purchases.addCustomerInfoUpdateListener(listener);
    void load();

    return () => {
      try {
        Purchases.removeCustomerInfoUpdateListener(listener);
      } catch {
        // ignore
      }
    };
  }, [load]);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    const Purchases = getPurchases();
    if (!Purchases) return { cancelled: false, error: 'Purchases unavailable' };
    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      return { cancelled: false, error: null };
    } catch (e) {
      const err = e as PurchasesError | undefined;
      if (err?.userCancelled) return { cancelled: true, error: null };
      return { cancelled: false, error: err?.message ?? 'Purchase failed' };
    }
  }, []);

  const restore = useCallback(async () => {
    const Purchases = getPurchases();
    if (!Purchases) return { error: 'Purchases unavailable' };
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return { error: null };
    } catch (e) {
      return { error: (e as Error)?.message ?? 'Restore failed' };
    }
  }, []);

  const logIn = useCallback(async (userId: string) => {
    const Purchases = getPurchases();
    if (!Purchases) return;
    try {
      const { customerInfo: info } = await Purchases.logIn(userId);
      setCustomerInfo(info);
    } catch {
      // Identification is best-effort.
    }
  }, []);

  const value = useMemo<ProContextValue>(
    () => ({
      ready,
      isPro: isProFromInfo(customerInfo),
      weekly,
      yearly,
      purchase,
      restore,
      logIn,
      refresh: load,
    }),
    [ready, customerInfo, weekly, yearly, purchase, restore, logIn, load]
  );

  // Plain createElement keeps this a .ts module (no JSX).
  return React.createElement(ProContext.Provider, { value }, children);
}

export function usePro(): ProContextValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used within ProProvider');
  return ctx;
}
