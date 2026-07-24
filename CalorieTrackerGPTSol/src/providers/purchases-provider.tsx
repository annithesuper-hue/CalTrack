import { useUser } from '@clerk/expo';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

const ENTITLEMENT_ID = 'Calorie Tracker Pro';
const OFFERING_ID = 'default';

type PurchasesContextValue = {
  ready: boolean;
  isPro: boolean;
  offering: PurchasesOffering | null;
  error: string | null;
  purchase: (plan: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
};

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

function hasPro(info: CustomerInfo) {
  return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
}

export function PurchasesProvider({ children }: PropsWithChildren) {
  const { user } = useUser();
  const configured = useRef(false);
  const loggedInUser = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_TEST;
    if (!apiKey) {
      setError('RevenueCat API key is missing.');
      setReady(true);
      return;
    }
    if (!configured.current) {
      Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
      Purchases.configure({ apiKey });
      configured.current = true;
    }

    const update = (info: CustomerInfo) => setIsPro(hasPro(info));
    Purchases.addCustomerInfoUpdateListener(update);
    Promise.all([Purchases.getCustomerInfo(), Purchases.getOfferings()])
      .then(([info, offerings]) => {
        setIsPro(hasPro(info));
        setOffering(offerings.all[OFFERING_ID] ?? offerings.current);
        setError(null);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Unable to load subscription plans.');
      })
      .finally(() => setReady(true));

    return () => {
      Purchases.removeCustomerInfoUpdateListener(update);
    };
  }, []);

  useEffect(() => {
    if (!ready || !user?.id || loggedInUser.current === user.id) return;
    Purchases.logIn(user.id)
      .then(({ customerInfo }) => {
        loggedInUser.current = user.id;
        setIsPro(hasPro(customerInfo));
      })
      .catch(console.error);
  }, [ready, user?.id]);

  const purchase = useCallback(async (plan: PurchasesPackage) => {
    try {
      setError(null);
      const { customerInfo } = await Purchases.purchasePackage(plan);
      const active = hasPro(customerInfo);
      setIsPro(active);
      return active;
    } catch (reason) {
      const maybeError = reason as { userCancelled?: boolean; message?: string };
      if (!maybeError.userCancelled) {
        setError(maybeError.message ?? 'Purchase could not be completed.');
      }
      return false;
    }
  }, []);

  const restore = useCallback(async () => {
    try {
      setError(null);
      const info = await Purchases.restorePurchases();
      const active = hasPro(info);
      setIsPro(active);
      if (!active) setError('No active CalTrack subscription was found.');
      return active;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Restore failed.');
      return false;
    }
  }, []);

  const value = useMemo(
    () => ({ ready, isPro, offering, error, purchase, restore }),
    [error, isPro, offering, purchase, ready, restore]
  );

  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
}

export function usePurchases() {
  const value = useContext(PurchasesContext);
  if (!value) throw new Error('usePurchases must be used inside PurchasesProvider');
  return value;
}
