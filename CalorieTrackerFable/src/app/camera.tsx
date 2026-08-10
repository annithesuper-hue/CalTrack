import { CameraView, useCameraPermissions } from 'expo-camera';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NutrientField } from '@/components/nutrient-field';
import { Button } from '@/components/ui';
import { HealthBadge } from '@/components/health-badge';
import { MealTypePicker } from '@/components/meal-type-picker';
import { PortionCorrection } from '@/components/portion-correction';
import { analyzeMealPhoto } from '@/lib/analyze';
import { ApiError, friendlyErrorMessage } from '@/lib/api-client';
import { haptic } from '@/lib/haptics';
import { inferMealTypeFromHour } from '@/lib/meal-type';
import { useApp } from '@/lib/store';
import { Radius, Spacing, ThemeColors, useColors, useMacroMeta, useShadow, useTypeStyles } from '@/lib/theme';
import type { AnalysisResult, MealType } from '@/lib/types';

type Phase = 'camera' | 'analyzing' | 'result' | 'error';

export default function Camera() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { logMeal } = useApp();
  const colors = useColors();
  const shadow = useShadow();
  const Type = useTypeStyles(colors);
  const MacroMeta = useMacroMeta(colors);
  const styles = useMemo(() => createStyles(colors, shadow, Type), [colors, shadow, Type]);

  const [phase, setPhase] = useState<Phase>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [baseResult, setBaseResult] = useState<AnalysisResult | null>(null);
  const [mealType, setMealType] = useState<MealType>(() => inferMealTypeFromHour());
  const [errorMessage, setErrorMessage] = useState('');
  // Kept so "Try Again" can re-run analysis on the same photo instead of
  // forcing the person to retake it.
  const lastBase64Ref = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight request if the screen unmounts, and never touch
  // state after that point.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const runAnalysis = async (base64: string) => {
    setPhase('analyzing');
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const analysis = await analyzeMealPhoto(base64, 'image/jpeg', controller.signal);
      if (controller.signal.aborted) return;
      setResult(analysis);
      setBaseResult(analysis);
      setPhase('result');
      haptic.success();
    } catch (e) {
      if (controller.signal.aborted) return;
      if (e instanceof ApiError && e.body && (e.body as { error?: string }).error === 'no_food') {
        setErrorMessage("We couldn't find food in that photo. Try again with the meal in frame.");
      } else {
        setErrorMessage(friendlyErrorMessage(e, 'ai'));
      }
      setPhase('error');
      haptic.error();
    }
  };

  const capture = async () => {
    if (!cameraRef.current) return;
    haptic.heavy();
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      setPhotoUri(photo.uri);

      // Downscale before shipping to the API — faster and cheaper.
      const context = ImageManipulator.manipulate(photo.uri);
      context.resize({ width: 1024 });
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });

      lastBase64Ref.current = saved.base64 ?? null;
      if (!lastBase64Ref.current) throw new Error('Failed to prepare photo');
      await runAnalysis(lastBase64Ref.current);
    } catch (e) {
      setErrorMessage(e instanceof ApiError ? friendlyErrorMessage(e, 'ai') : 'Something went wrong preparing the photo. Try again.');
      setPhase('error');
      haptic.error();
    }
  };

  /** "Try Again" re-runs analysis on the same photo — it doesn't discard it. */
  const retryAnalysis = () => {
    haptic.tap();
    if (lastBase64Ref.current) {
      void runAnalysis(lastBase64Ref.current);
    } else {
      retake();
    }
  };

  const save = () => {
    if (!result) return;
    let storedUri: string | null = null;
    if (photoUri) {
      try {
        const dest = new File(Paths.document, `meal-${Date.now()}.jpg`);
        new File(photoUri).copy(dest);
        storedUri = dest.uri;
      } catch (e) {
        console.warn('Failed to persist photo', e);
        storedUri = photoUri;
      }
    }
    logMeal(result, storedUri, mealType);
    router.back();
  };

  const retake = () => {
    haptic.tap();
    abortRef.current?.abort();
    lastBase64Ref.current = null;
    setPhotoUri(null);
    setResult(null);
    setBaseResult(null);
    setPhase('camera');
  };

  const scalePortion = (ratio: number) => {
    if (!baseResult) return;
    const clamped = Math.max(0.1, Math.min(6, ratio));
    setResult({
      ...baseResult,
      calories: Math.max(0, Math.round(baseResult.calories * clamped)),
      protein: Math.max(0, Math.round(baseResult.protein * clamped)),
      carbs: Math.max(0, Math.round(baseResult.carbs * clamped)),
      fat: Math.max(0, Math.round(baseResult.fat * clamped)),
    });
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
        <SymbolView name="camera.fill" size={44} tintColor="#FFFFFF" />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          CalTrack estimates calories from photos of your food. Allow camera access to start scanning.
        </Text>
        <Button title="Allow Camera" onPress={requestPermission} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  // --- Result / editing sheet ---
  if (phase === 'result' && result) {
    return (
      <KeyboardAvoidingView
        style={styles.resultContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.resultContent, { paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {photoUri && (
            <View style={styles.resultPhotoWrap}>
              <Image source={{ uri: photoUri }} style={styles.resultPhoto} contentFit="cover" />
              <View style={styles.confidenceBadge}>
                <SymbolView name="sparkles" size={12} tintColor="#FFFFFF" />
                <Text style={styles.confidenceText}>
                  {result.confidence === 'high' ? 'High confidence' : result.confidence === 'medium' ? 'Good estimate' : 'Rough estimate'}
                </Text>
              </View>
            </View>
          )}

          <Animated.View entering={FadeInDown.duration(350)} style={styles.resultCard}>
            <View style={styles.nameRow}>
              <Text style={styles.resultEmoji}>{result.emoji}</Text>
              <TextInput
                style={styles.nameInput}
                value={result.name}
                onChangeText={(name) => setResult({ ...result, name })}
                placeholder="Meal name"
                placeholderTextColor={colors.inkMuted}
              />
              <SymbolView name="pencil" size={16} tintColor={colors.inkMuted} />
            </View>

            {result.items.length > 0 && (
              <View style={styles.itemsWrap}>
                {result.items.map((item, i) => (
                  <View key={`${item.name}-${i}`} style={styles.itemChip}>
                    <Text style={styles.itemChipText}>
                      {item.name} · {Math.round(item.calories)} kcal
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.badgeRow}>
              <HealthBadge macros={result} />
            </View>

            {baseResult && (baseResult.estimatedGrams || baseResult.countable) ? (
              <View style={styles.portionWrap}>
                <PortionCorrection
                  estimatedGrams={baseResult.estimatedGrams ?? null}
                  countable={baseResult.countable ?? null}
                  onScale={scalePortion}
                />
              </View>
            ) : null}

            <View style={styles.mealTypeWrap}>
              <MealTypePicker value={mealType} onChange={setMealType} />
            </View>

            <View style={styles.fieldsDivider} />
            <NutrientField
              label="Calories"
              value={result.calories}
              unit="kcal"
              step={10}
              color={colors.ink}
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
            <Text style={styles.editHint}>Estimates are editable — tweak anything that looks off.</Text>
          </Animated.View>
        </ScrollView>

        <View style={[styles.resultFooter, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Pressable onPress={retake} style={styles.retakeButton}>
            <SymbolView name="arrow.counterclockwise" size={18} tintColor={colors.ink} />
          </Pressable>
          <Button title="Log Meal" onPress={save} style={{ flex: 1 }} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // --- Camera / analyzing / error ---
  return (
    <View style={styles.container}>
      {phase === 'camera' ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        photoUri && <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}

      {/* Framing guide */}
      {phase === 'camera' && (
        <View pointerEvents="none" style={styles.frameWrap}>
          <View style={styles.frame}>
            <Corner style={{ top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }} />
            <Corner style={{ top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }} />
            <Corner style={{ bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }} />
            <Corner style={{ bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }} />
          </View>
          <Text style={styles.frameHint}>Center your meal in the frame</Text>
        </View>
      )}

      <CloseButton onPress={close} top={insets.top} />

      {phase === 'analyzing' && (
        <Animated.View entering={FadeIn} style={styles.analyzingOverlay}>
          <View style={styles.analyzingCard}>
            <ActivityIndicator color={colors.ink} />
            <Text style={styles.analyzingTitle}>Analyzing your meal…</Text>
            <Text style={styles.analyzingSubtitle}>Identifying ingredients and estimating macros</Text>
          </View>
        </Animated.View>
      )}

      {phase === 'error' && (
        <Animated.View entering={FadeIn} style={styles.analyzingOverlay}>
          <View style={styles.analyzingCard}>
            <SymbolView name="exclamationmark.triangle.fill" size={30} tintColor={colors.carbs} />
            <Text style={styles.analyzingTitle}>Hmm, that didn't work</Text>
            <Text style={styles.analyzingSubtitle}>{errorMessage}</Text>
            <Button title="Try Again" onPress={retryAnalysis} style={{ alignSelf: 'stretch', marginTop: Spacing.sm }} />
            <Pressable onPress={retake} hitSlop={8} style={{ marginTop: Spacing.xs }}>
              <Text style={styles.retakeLink}>Retake photo</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {phase === 'camera' && (
        <View style={[styles.shutterWrap, { paddingBottom: insets.bottom + Spacing.xl }]}>
          <Pressable onPress={capture} style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.92 }] }]}>
            <View style={styles.shutterInner} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function CloseButton({ onPress, top }: { onPress: () => void; top: number }) {
  const colors = useColors();
  const shadow = useShadow();
  const Type = useTypeStyles(colors);
  const styles = useMemo(() => createStyles(colors, shadow, Type), [colors, shadow, Type]);
  return (
    <Pressable onPress={onPress} hitSlop={10} style={[styles.closeButton, { top: top + Spacing.sm }]}>
      <SymbolView name="xmark" size={16} tintColor="#FFFFFF" weight="semibold" />
    </Pressable>
  );
}

function Corner({ style }: { style: object }) {
  const colors = useColors();
  const shadow = useShadow();
  const Type = useTypeStyles(colors);
  const styles = useMemo(() => createStyles(colors, shadow, Type), [colors, shadow, Type]);
  return <View style={[styles.corner, style]} />;
}

const createStyles = (colors: ThemeColors, Shadow: ReturnType<typeof useShadow>, Type: ReturnType<typeof useTypeStyles>) =>
  StyleSheet.create({
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
    width: 264,
    height: 264,
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 2,
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
  shutterWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  analyzingCard: {
    backgroundColor: colors.card,
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
    color: colors.ink,
    marginTop: Spacing.xs,
  },
  analyzingSubtitle: {
    fontSize: 13,
    color: colors.inkSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  retakeLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSecondary,
    textDecorationLine: 'underline',
  },
  resultContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  resultContent: {
    paddingHorizontal: Spacing.screen,
  },
  resultPhotoWrap: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  resultPhoto: {
    width: '100%',
    height: 210,
  },
  confidenceBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
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
  nameInput: {
    flex: 1,
    ...Type.heading,
    padding: 0,
  },
  itemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.md,
  },
  itemChip: {
    backgroundColor: colors.bg,
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  itemChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.inkSecondary,
  },
  badgeRow: {
    marginTop: Spacing.md,
  },
  portionWrap: {
    marginTop: Spacing.md,
  },
  mealTypeWrap: {
    marginTop: Spacing.md,
  },
  fieldsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginVertical: Spacing.md,
  },
  editHint: {
    fontSize: 12,
    color: colors.inkMuted,
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
    backgroundColor: colors.bg,
  },
  retakeButton: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
