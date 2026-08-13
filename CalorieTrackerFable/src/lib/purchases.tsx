import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

export const PRO_ENTITLEMENT = 'Calorie Tracker Pro';

type PurchasesState = {
  isReady: boolean;
  isPro: boolean;
  packages: PurchasesPackage[];
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  syncClerkUser: (userId: string | null) => void;
};

const PurchasesContext = createContext<PurchasesState | null>(null);

function hasPro(info: CustomerInfo | null): boolean {
  return Boolean(info?.entitlements.active[PRO_ENTITLEMENT]);
}

// Paywall disabled: everyone is treated as Pro by default and the
// purchase flow is skipped entirely. Flip this back to `false` (and
// restore the RevenueCat init logic below) to re-enable purchases.
const FORCE_PRO = true;

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(FORCE_PRO);
  const [isPro, setIsPro] = useState(FORCE_PRO);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  useEffect(() => {
    if (FORCE_PRO) return;

    // The key sometimes arrives with a pasted "RC=" prefix — strip anything
    // before the actual "test_" / "appl_" key body.
    const raw = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_TEST ?? '';
    const apiKey = raw.replace(/^.*?(?=test_|appl_)/, '');
    if (!apiKey) {
      console.warn('RevenueCat API key missing');
      setIsReady(true);
      return;
    }
    Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey });

    const listener = (info: CustomerInfo) => setIsPro(hasPro(info));
    Purchases.addCustomerInfoUpdateListener(listener);

    (async () => {
      try {
        const [info, offerings] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);
        setIsPro(hasPro(info));
        setPackages(offerings.current?.availablePackages ?? []);
      } catch (e) {
        console.warn('RevenueCat init failed', e);
      } finally {
        setIsReady(true);
      }
    })();

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    if (FORCE_PRO) return true;
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const pro = hasPro(customerInfo);
      setIsPro(pro);
      return pro;
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean };
      if (!err.userCancelled) console.warn('Purchase failed', e);
      return false;
    }
  }, []);

  const restore = useCallback(async () => {
    if (FORCE_PRO) return true;
    try {
      const info = await Purchases.restorePurchases();
      const pro = hasPro(info);
      setIsPro(pro);
      return pro;
    } catch (e) {
      console.warn('Restore failed', e);
      return false;
    }
  }, []);

  const syncClerkUser = useCallback((userId: string | null) => {
    if (FORCE_PRO || !userId) return;
    Purchases.logIn(userId)
      .then(({ customerInfo }) => setIsPro(hasPro(customerInfo)))
      .catch((e) => console.warn('RevenueCat logIn failed', e));
  }, []);

  const value = useMemo(
    () => ({ isReady, isPro, packages, purchase, restore, syncClerkUser }),
    [isReady, isPro, packages, purchase, restore, syncClerkUser],
  );

  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
}

export function usePurchases(): PurchasesState {
  const ctx = useContext(PurchasesContext);
  if (!ctx) throw new Error('usePurchases must be used within PurchasesProvider');
  return ctx;
}
