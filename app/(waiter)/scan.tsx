import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { Screen, Title, Muted, Button, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

// Same QR the venue-admin's own scanner reads (see (venue-admin)/bookings/scan.tsx) — this one
// hits PATCH /waiter/bookings/:id/check-in instead, which additionally checks this waiter's own
// qrScanEnabled flag server-side (set by their venue-admin, or toggled by the aggregator) before
// allowing the check-in, on top of the same venue-scoping the admin's endpoint already has.
export default function WaiterScanScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [locked, setLocked] = useState(false);

  async function handleScan(result: BarcodeScanningResult) {
    if (locked || processing) return;
    let payload: any;
    try {
      payload = JSON.parse(result.data);
    } catch {
      return;
    }
    if (payload?.type !== 'restbooking-checkin' || !payload?.bookingId) return;

    setLocked(true);
    setProcessing(true);
    try {
      await api.waiterCheckIn(payload.bookingId);
      Alert.alert(t('adminBookings.mScanSuccessTitle'), t('adminBookings.mScanSuccessMessage'), [
        { text: t('common.ok'), onPress: () => setLocked(false) },
      ]);
    } catch (e) {
      Alert.alert(t('adminBookings.mScanFailedTitle'), api.extractErrorMessage(e), [
        { text: t('common.ok'), onPress: () => setLocked(false) },
      ]);
    } finally {
      setProcessing(false);
    }
  }

  if (!permission) return <LoadingView />;

  if (!permission.granted) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Ionicons name="camera-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.lg }} />
          <Title style={{ textAlign: 'center', marginBottom: spacing.sm }}>{t('adminBookings.mScanPermissionTitle')}</Title>
          <Muted style={{ textAlign: 'center', marginBottom: spacing.lg }}>{t('adminBookings.mScanPermissionMessage')}</Muted>
          <Button title={t('adminBookings.mScanGrantButton')} onPress={requestPermission} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ padding: spacing.lg }}>
        <Title>{t('waiter.scanTitle')}</Title>
      </View>
      <View style={{ flex: 1, margin: spacing.lg, borderRadius: 20, overflow: 'hidden' }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={locked ? undefined : handleScan}
        />
        {processing && (
          <View style={styles.overlay}>
            <Muted style={{ color: colors.white }}>{t('common.loading')}</Muted>
          </View>
        )}
      </View>
      <Muted style={{ textAlign: 'center', marginBottom: spacing.lg }}>{t('adminBookings.mScanHint')}</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});
