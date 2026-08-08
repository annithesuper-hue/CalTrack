import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NutrientField } from '@/components/nutrient-field';
import { Button } from '@/components/ui';
import { ApiError, friendlyErrorMessage } from '@/lib/api-client';
import { haptic } from '@/lib/haptics';
import { useApp } from '@/lib/store';
import { Colors, MacroMeta, Radius, Shadow, Spacing, Type } from '@/lib/theme';
import type { AnalysisResult } from '@/lib/types';
import { lookupBarcode, usdaFoodToAnalysis, type UsdaNormalizedFood } from '@/lib/usda';

type Phase = 'scanning' | 'looking_up' | 'review' | 'not_found' | 'error';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

export default function Barcode() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { logMeal } = useApp();

  const [phase, setPhase] = useState<Phase>('scanning');
  const [food, setFood] = useState<UsdaNormalizedFood | null>(null);
  const [servings, setServings] = useState(1);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  // Debounce: stop reacting to scan events once a code is being looked up.
  const lockedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleScan = (scan: BarcodeScanningResult) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    haptic.medium();
    void runLookup(scan.data);
  };

  const runLookup = async (code: string) => {
    setScannedCode(code);
    setPhase('looking_up');
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const usdaFood = await lookupBarcode(code, controller.signal);
      if (controller.signal.aborted) return;
      setFood(usdaFood);
      setServings(1);
      setResult(usdaFoodToAnalysis(usdaFood, 1));
      setPhase('review');
      haptic.success();
    } catch (e) {
      if (controller.signal.aborted) return;
      if (e instanceof ApiError && e.kind === 'not_found') {
        setPhase('not_found');
      } else {
        setErrorMessage(friendlyErrorMessage(e, 'usda'));
        setPhase('error');
      }
      haptic.error();
    }
  };

  const rescan = () => {
    haptic.tap();
    abortRef.current?.abort();
    lockedRef.current = false;
    setFood(null);
    setResult(null);
    setScannedCode(null);
    setPhase('scanning');
  };

  const changeServings = (delta: number) => {
    if (!food) return;
    const next = Math.max(0.25, Math.round((servings + delta) * 4) / 4);
    setServings(next);
    setResult(usdaFoodToAnalysis(food, next));
    haptic.select();
  };

  const save = () => {
    if (!result) return;
    logMeal(result, null);
    router.back();
  };

  const close = () => {
    haptic.tap();
    router.back();
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionWrap, { paddingTop: insets.top }]}>
        <CloseButton onPress={close} top={insets.top} />
        <SymbolView name="barcode.viewfinder" size={44} tintColor="#FFFFFF" />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>Camera permission is required to scan a barcode.</Text>
        <Button title="Allow Camera" onPress={requestPermission} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  // --- Review / edit sheet ---
  if (phase === 'review' && result && food) {
    return (
      <KeyboardAvoidingView style={styles.resultContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.resultContent, { paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(350)} style={styles.resultCard}>
            <View style={styles.nameRow}>
              <Text style={styles.resultEmoji}>📦</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>{food.name}</Text>
                {food.brand ? <Text style={styles.foodBrand}>{food.brand}</Text> : null}
              </View>
            </View>

            <View style={styles.servingsRow}>
              <Text style={styles.servingsLabel}>
                Servings{food.servingDescription ? ` · ${food.servingDescription}` : ''}
              </Text>
              <View style={styles.servingsControls}>
                <StepperButton symbol="minus" onPress={() => changeServings(-0.25)} />
                <Text style={styles.servingsValue}>{servings}</Text>
                <StepperButton symbol="plus" onPress={() => changeServings(0.25)} />
              </View>
            </View>

            <View style={styles.fieldsDivider} />
            <NutrientField
              label="Calories"
              value={result.calories}
              unit="kcal"
              step={10}
              color={Colors.ink}
              onChange={(calories) => setResult({ ...result, calories })}
            />
            <NutrientField
              label="Protein"
              value={result.protein}
              unit="g"
              step={5}
              color={MacroMeta.protein.color}
              onChange={(protein) => setResult({ ...result, protein })}
            />
            <NutrientField
              label="Carbs"
              value={result.carbs}
              unit="g"
              step={5}
              color={MacroMeta.carbs.color}
              onChange={(carbs) => setResult({ ...result, carbs })}
            />
            <NutrientField
              label="Fat"
              value={result.fat}
              unit="g"
              step={5}
              color={MacroMeta.fat.color}
              onChange={(fat) => setResult({ ...result, fat })}
            />
            <Text style={styles.editHint}>From USDA FoodData Central — tweak anything that looks off.</Text>
          </Animated.View>
        </ScrollView>

        <View style={[styles.resultFooter, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Pressable onPress={rescan} style={styles.retakeButton}>
            <SymbolView name="arrow.counterclockwise" size={18} tintColor={Colors.ink} />
          </Pressable>
          <Button title="Log Food" onPress={save} style={{ flex: 1 }} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // --- Not found ---
  if (phase === 'not_found') {
    return (
      <View style={[styles.container, styles.permissionWrap, { paddingTop: insets.top }]}>
        <CloseButton onPress={close} top={insets.top} />
        <SymbolView name="questionmark.circle.fill" size={44} tintColor="#FFFFFF" />
        <Text style={styles.permissionTitle}>Food not found</Text>
        <Text style={styles.permissionText}>
          {scannedCode ? `We couldn't find "${scannedCode}" in USDA FoodData Central.` : "We couldn't find that product in USDA FoodData Central."}
        </Text>
        <Button title="Add Manually" onPress={() => router.replace('/manual-entry')} style={{ alignSelf: 'stretch' }} />
        <Button title="Try Another Barcode" variant="secondary" onPress={rescan} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  // --- Error ---
  if (phase === 'error') {
    return (
      <View style={[styles.container, styles.permissionWrap, { paddingTop: insets.top }]}>
        <CloseButton onPress={close} top={insets.top} />
        <SymbolView name="exclamationmark.triangle.fill" size={44} tintColor={Colors.carbs} />
        <Text style={styles.permissionTitle}>Hmm, that didn't work</Text>
        <Text style={styles.permissionText}>{errorMessage}</Text>
        <Button title="Try Again" onPress={() => scannedCode && runLookup(scannedCode)} style={{ alignSelf: 'stretch' }} />
        <Button title="Add Manually" variant="secondary" onPress={() => router.replace('/manual-entry')} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  // --- Scanning / looking up ---
  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={phase === 'scanning' ? handleScan : undefined}
      />

      {phase === 'scanning' && (
        <View pointerEvents="none" style={styles.frameWrap}>
          <View style={styles.frame} />
          <Text style={styles.frameHint}>Line up the barcode in the box</Text>
        </View>
      )}

      <CloseButton onPress={close} top={insets.top} />

      {phase === 'looking_up' && (
        <Animated.View entering={FadeIn} style={styles.analyzingOverlay}>
          <View style={styles.analyzingCard}>
            <ActivityIndicator color={Colors.ink} />
            <Text style={styles.analyzingTitle}>Looking up food…</Text>
            <Text style={styles.analyzingSubtitle}>Searching USDA FoodData Central</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function CloseButton({ onPress, top }: { onPress: () => void; top: number }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={[styles.closeButton, { top: top + Spacing.sm }]}>
      <SymbolView name="xmark" size={16} tintColor="#FFFFFF" weight="semibold" />
    </Pressable>
  );
}

function StepperButton({ symbol, onPress }: { symbol: 'plus' | 'minus'; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.stepper, pressed && { backgroundColor: Colors.cardPressed }]}>
      <SymbolView name={symbol} size={14} tintColor={Colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0D0A',
  },
  permissionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  permissionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: Spacing.sm,
  },
  permissionText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    left: Spacing.screen,
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  frameWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  frame: {
    width: 280,
    height: 160,
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  frameHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  analyzingCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'stretch',
    ...Shadow.float,
  },
  analyzingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: Spacing.xs,
  },
  analyzingSubtitle: {
    fontSize: 13,
    color: Colors.inkSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  resultContent: {
    paddingHorizontal: Spacing.screen,
  },
  resultCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.lg,
    ...Shadow.card,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  resultEmoji: {
    fontSize: 30,
  },
  foodName: {
    ...Type.heading,
  },
  foodBrand: {
    fontSize: 13,
    color: Colors.inkSecondary,
    marginTop: 2,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  servingsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.inkSecondary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  servingsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servingsValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
    fontVariant: ['tabular-nums'],
    minWidth: 34,
    textAlign: 'center',
  },
  stepper: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.hairline,
    marginVertical: Spacing.md,
  },
  editHint: {
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: Spacing.sm,
  },
  resultFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    backgroundColor: Colors.bg,
  },
  retakeButton: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
