import { CameraCapturedPicture, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { analyzeFoodImage } from '@/lib/analyze';

const C = Colors.dark;

type Phase =
  | { kind: 'camera' }
  | { kind: 'analyzing'; imageUri: string }
  | { kind: 'error'; imageUri: string | null; message: string };

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'camera' });
  const cameraRef = useRef<CameraView>(null);

  const analyze = useCallback(async (base64: string, imageUri: string, mimeType: string) => {
    setPhase({ kind: 'analyzing', imageUri });
    try {
      const estimate = await analyzeFoodImage(base64, mimeType);
      // Typed-route defs may lag behind new routes.
      router.replace({
        pathname: '/edit-entry',
        params: { estimate: JSON.stringify(estimate), imageUri },
      } as any);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
      setPhase({ kind: 'error', imageUri, message });
    }
  }, []);

  const handleShutter = useCallback(async () => {
    const camera = cameraRef.current;
    if (!camera || !cameraReady) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const photo: CameraCapturedPicture = await camera.takePictureAsync({
        base64: true,
        quality: 0.7,
        shutterSound: false,
      });
      if (!photo.base64) {
        setPhase({ kind: 'error', imageUri: photo.uri, message: 'Could not read the photo. Please try again.' });
        return;
      }
      const mimeType = photo.format === 'png' ? 'image/png' : 'image/jpeg';
      await analyze(photo.base64, photo.uri, mimeType);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not take the photo. Please try again.';
      setPhase({ kind: 'error', imageUri: null, message });
    }
  }, [analyze, cameraReady]);

  const handlePickFromLibrary = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.7,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        setPhase({ kind: 'error', imageUri: asset?.uri ?? null, message: 'Could not read that photo. Please try another.' });
        return;
      }
      const mimeType = asset.mimeType ?? 'image/jpeg';
      await analyze(asset.base64, asset.uri, mimeType);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not open the photo library.';
      setPhase({ kind: 'error', imageUri: null, message });
    }
  }, [analyze]);

  const handleRetry = useCallback(() => {
    setPhase({ kind: 'camera' });
  }, []);

  const handleEnterManually = useCallback(() => {
    // Typed-route defs may lag behind new routes.
    router.replace({ pathname: '/edit-entry', params: {} } as any);
  }, []);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
  }, []);

  const handleFlip = useCallback(() => {
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  }, []);

  // ---- Permission gate ----
  if (!permission) {
    return <View style={styles.container} />;
  }
  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.gate]}>
        <SymbolView name="camera.fill" size={56} tintColor={C.accent} />
        <Text style={styles.gateTitle}>Camera access needed</Text>
        <Text style={styles.gateSubtitle}>
          CalTrack uses your camera to scan meals and estimate calories.
        </Text>
        <Pressable style={styles.gateButton} onPress={() => void requestPermission()}>
          <Text style={styles.gateButtonText}>Enable camera</Text>
        </Pressable>
        <Pressable style={styles.gateSecondary} onPress={handleEnterManually}>
          <Text style={styles.gateSecondaryText}>Enter manually instead</Text>
        </Pressable>
      </View>
    );
  }

  const analyzing = phase.kind === 'analyzing';
  const errored = phase.kind === 'error';

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        onCameraReady={() => setCameraReady(true)}
      />

      {/* Close */}
      <Pressable
        style={[styles.iconButton, { top: insets.top + Spacing.two, left: Spacing.three }]}
        onPress={handleClose}
        hitSlop={8}
      >
        <SymbolView name="xmark" size={20} tintColor="#FFFFFF" />
      </Pressable>

      {/* Bottom controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.four }]}>
        <Pressable style={styles.iconButtonInline} onPress={handlePickFromLibrary} hitSlop={8}>
          <SymbolView name="photo.on.rectangle" size={26} tintColor="#FFFFFF" />
        </Pressable>

        <Pressable
          style={[styles.shutter, !cameraReady && styles.shutterDisabled]}
          onPress={() => void handleShutter()}
          disabled={!cameraReady}
        >
          <View style={styles.shutterInner} />
        </Pressable>

        <Pressable style={styles.iconButtonInline} onPress={handleFlip} hitSlop={8}>
          <SymbolView name="arrow.triangle.2.circlepath.camera" size={26} tintColor="#FFFFFF" />
        </Pressable>
      </View>

      {/* Analyzing overlay */}
      {analyzing && (
        <View style={styles.overlay}>
          <Image source={{ uri: phase.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={styles.overlayDim} />
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.overlayText}>Analyzing your meal…</Text>
        </View>
      )}

      {/* Error overlay */}
      {errored && (
        <View style={styles.overlay}>
          {phase.imageUri ? (
            <Image source={{ uri: phase.imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : null}
          <View style={styles.overlayDim} />
          <SymbolView name="exclamationmark.triangle.fill" size={40} tintColor={C.danger} />
          <Text style={styles.errorTitle}>Analysis failed</Text>
          <Text style={styles.errorMessage}>{phase.message}</Text>
          <Pressable style={styles.gateButton} onPress={handleRetry}>
            <Text style={styles.gateButtonText}>Retry</Text>
          </Pressable>
          <Pressable style={styles.gateSecondary} onPress={handleEnterManually}>
            <Text style={styles.gateSecondaryText}>Enter manually</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gate: {
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  gateTitle: {
    color: C.text,
    fontSize: 22,
    fontWeight: '700',
  },
  gateSubtitle: {
    color: C.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  gateButton: {
    backgroundColor: C.accent,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  gateButtonText: {
    color: C.background,
    fontSize: 16,
    fontWeight: '700',
  },
  gateSecondary: {
    padding: Spacing.two,
  },
  gateSecondaryText: {
    color: C.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  iconButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonInline: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: Radius.full,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  overlayDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16,20,24,0.78)',
  },
  overlayText: {
    color: C.text,
    fontSize: 17,
    fontWeight: '600',
  },
  errorTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: '700',
  },
  errorMessage: {
    color: C.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
