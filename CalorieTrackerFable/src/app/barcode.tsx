import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { ApiError, userMessageForError } from '@/lib/api-client';
import { haptic } from '@/lib/haptics';
import { lookupBarcode } from '@/lib/usda';
import { Colors, Radius, Shadow, Spacing, Type } from '@/lib/theme';
import type { FoodItem } from '@/lib/types';

type Phase = 'scanning' | 'looking_up' | 'not_found' | 'error';

export default function BarcodeScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [phase, setPhase] = useState<Phase>('scanning');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<FoodItem | null>(null);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleBarcode = useCallback(
    async (barcode: string) => {
      // Debounce duplicate barcode events
      if (lastBarcode === barcode || phase !== 'scanning') return;
      setLastBarcode(barcode);
      setPhase('looking_up');
      haptic.medium();

      try {
        const result = await lookupBarcode(barcode);
        if (!isMounted.current) return;

        if (!result) {
          setPhase('not_found');
          haptic.warning();
          return;
        }

        setLookupResult(result);
        // Navigate to the food review screen with the result
        router.replace({
          pathname: '/food-review',
          params: { data: JSON.stringify(result) },
        });
      } catch (e) {
        if (!isMounted.current) return;
        setErrorMessage(userMessageForError(e));
        setPhase('error');
        haptic.error();
      }
    },
    [lastBarcode, phase],
  );

  const reset = () => {
    haptic.tap();
    setLastBarcode(null);
    setLookupResult(null);
    setErrorMessage('');
    setPhase('scanning');
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
          Camera permission is required to scan a barcode. Allow camera access to continue.
        </Text>
        <Button title="Allow Camera" onPress={requestPermission} style={{ alignSelf: 'stretch' }} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <View style={styles.container}>
        {phase === 'scanning' && (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['upc_a', 'upc_e', 'ean13', 'ean8', 'code128', 'code39'],
            }}
            onBarcodeScanned={(event) => {
              handleBarcode(event.data);
            }}
          />
        )}

        {/* Framing guide */}
        {phase === 'scanning' && (
          <View pointerEvents="none" style={styles.frameWrap}>
            <View style={styles.scanFrame}>
              <Corner style={{ top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }} />
              <Corner style={{ top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }} />
              <Corner style={{ bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }} />
              <Corner style={{ bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }} />
            </View>
            <Text style={styles.frameHint}>Center the barcode in the frame</Text>
          </View>
        )}

        <CloseButton onPress={close} top={insets.top} />

        {phase === 'looking_up' && (
          <Animated.View entering={FadeIn} style={styles.overlay}>
            <View style={styles.overlayCard}>
              <ActivityIndicator color={Colors.ink} />
              <Text style={styles.overlayTitle}>Looking up food…</Text>
              <Text style={styles.overlaySubtitle}>Searching USDA FoodData Central</Text>
            </View>
          </Animated.View>
        )}

        {phase === 'not_found' && (
          <Animated.View entering={FadeIn} style={styles.overlay}>
            <View style={styles.overlayCard}>
              <SymbolView name="magnifyingglass" size={30} tintColor={Colors.inkMuted} />
              <Text style={styles.overlayTitle}>Food not found</Text>
              <Text style={styles.overlaySubtitle}>
                This barcode isn't in the USDA database. You can enter it manually or try another barcode.
              </Text>
              <View style={styles.overlayActions}>
                <Button
                  title="Add Manually"
                  variant="secondary"
                  onPress={() => router.replace('/manual-entry')}
                  style={{ flex: 1 }}
                />
                <Button title="Try Another" onPress={reset} style={{ flex: 1 }} />
              </View>
            </View>
          </Animated.View>
        )}

        {phase === 'error' && (
          <Animated.View entering={FadeIn} style={styles.overlay}>
            <View style={styles.overlayCard}>
              <SymbolView name="exclamationmark.triangle.fill" size={30} tintColor={Colors.carbs} />
              <Text style={styles.overlayTitle}>Hmm, that didn't work</Text>
              <Text style={styles.overlaySubtitle}>{errorMessage}</Text>
              <View style={styles.overlayActions}>
                <Button
                  title="Add Manually"
                  variant="secondary"
                  onPress={() => router.replace('/manual-entry')}
                  style={{ flex: 1 }}
                />
                <Button title="Try Again" onPress={reset} style={{ flex: 1 }} />
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </>
  );
}

function CloseButton({ onPress, top }: { onPress: () => void; top: number }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={[styles.closeButton, { top: top + Spacing.sm }]}>
      <SymbolView name="xmark" size={16} tintColor="#FFFFFF" weight="semibold" />
    </Pressable>
  );
}

function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} />;
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
  scanFrame: {
    width: 280,
    height: 160,
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
  overlay: {
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
  overlayCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'stretch',
    ...Shadow.float,
  },
  overlayTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: Spacing.xs,
  },
  overlaySubtitle: {
    fontSize: 13,
    color: Colors.inkSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  overlayActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    alignSelf: 'stretch',
  },
});
