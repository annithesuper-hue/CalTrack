import { useAuth } from '@clerk/expo';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, PrimaryButton } from '@/components/ui';
import { colors, radius } from '@/constants/design';
import type { MealEstimate } from '@/lib/types';

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const takePhoto = async () => {
    if (!cameraRef.current || !ready || capturing) return;
    setCapturing(true);
    setError(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.62,
        base64: true,
        shutterSound: true,
      });
      if (!photo?.base64) throw new Error('The camera did not return image data.');
      setPreviewUri(photo.uri);

      const token = await getToken();
      const response = await fetch('/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ image: photo.base64, mimeType: 'image/jpeg' }),
      });
      const payload = (await response.json()) as MealEstimate | { error?: string };
      if (!response.ok || 'error' in payload) {
        throw new Error('error' in payload ? payload.error : 'The meal could not be analyzed.');
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: '/meal-review',
        params: { imageUri: photo.uri, estimate: JSON.stringify(payload) },
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.');
      setCapturing(false);
    }
  };

  if (!permission) {
    return <View style={styles.permission}><ActivityIndicator color={colors.lime} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permission, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.permissionIcon}>
          <SymbolView name="camera.fill" size={34} tintColor={colors.ink} />
        </View>
        <AppText variant="title" color={colors.white} style={{ textAlign: 'center' }}>
          Your camera turns meals into numbers.
        </AppText>
        <AppText color="#B8C1BA" style={{ textAlign: 'center' }}>
          CalTrack only analyzes photos you choose to take.
        </AppText>
        <PrimaryButton label="Allow camera access" onPress={requestPermission} tone="lime" />
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <AppText variant="label" color="#B8C1BA">Not now</AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {previewUri ? (
        <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode="picture"
          onCameraReady={() => setReady(true)}
          onMountError={(event) => setError(event.message)}
        />
      )}
      <View style={styles.scrim} />

      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close camera"
          onPress={() => router.back()}
          style={styles.circleButton}>
          <SymbolView name="xmark" size={20} tintColor={colors.white} />
        </Pressable>
        <View style={styles.cameraTitle}>
          <View style={styles.liveDot} />
          <AppText variant="caption" color={colors.white}>
            {capturing ? 'ANALYZING MEAL' : 'AI MEAL SCAN'}
          </AppText>
        </View>
        <View style={styles.circleSpacer} />
      </View>

      <View style={styles.frameWrap}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          {capturing ? (
            <View style={styles.analysis}>
              <View style={styles.analysisBubble}>
                <ActivityIndicator color={colors.ink} />
                <AppText variant="label">Finding foods and portions…</AppText>
              </View>
              <View style={styles.scanLine} />
            </View>
          ) : null}
        </View>
        <View style={styles.hint}>
          <SymbolView name="viewfinder" size={18} tintColor={colors.lime} />
          <AppText variant="caption" color={colors.white}>Fit the entire meal inside the frame</AppText>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 22 }]}>
        {error ? (
          <View style={styles.error}>
            <AppText variant="caption" color={colors.white}>{error}</AppText>
            <Pressable
              onPress={() => {
                setPreviewUri(null);
                setCapturing(false);
                setError(null);
              }}>
              <AppText variant="label" color={colors.lime}>Try again</AppText>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.shutterRow}>
          <View style={styles.circleSpacer} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take meal photo"
            testID="camera-shutter"
            disabled={!ready || capturing}
            onPress={takePhoto}
            style={({ pressed }) => [
              styles.shutterOuter,
              (!ready || capturing) && { opacity: 0.5 },
              pressed && { transform: [{ scale: 0.94 }] },
            ]}>
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.aiBadge}>
            <SymbolView name="sparkles" size={18} tintColor={colors.ink} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5,9,6,0.13)',
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(12,18,14,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSpacer: { width: 46, height: 46 },
  cameraTitle: {
    height: 39,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(12,18,14,0.62)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lime },
  frameWrap: {
    position: 'absolute',
    top: '18%',
    left: 22,
    right: 22,
    bottom: '24%',
    gap: 15,
  },
  frame: { flex: 1, borderRadius: radius.xl, overflow: 'hidden' },
  corner: { position: 'absolute', width: 54, height: 54, borderColor: colors.lime },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 26 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 26 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 26 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 26 },
  hint: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(12,18,14,0.62)',
  },
  analysis: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 17,
    paddingVertical: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.lime,
  },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '58%',
    height: 2,
    backgroundColor: colors.lime,
    shadowColor: colors.lime,
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  bottom: { position: 'absolute', bottom: 0, left: 22, right: 22, gap: 14 },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shutterOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.white },
  aiBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(166,44,44,0.9)',
    borderRadius: radius.md,
    padding: 13,
  },
  permission: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: colors.ink,
  },
  permissionIcon: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
