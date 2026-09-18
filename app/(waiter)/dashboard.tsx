import React, { useCallback, useState } from 'react';
import { View, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ShiftStatus } from '@/lib/types';
import { Screen, Title, Muted, Card, Button, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function WaiterDashboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [status, setStatus] = useState<ShiftStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await api.getShiftStatus());
    } catch {
      // ignore — button below still lets them try clocking in
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleClockIn() {
    setBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(t('waiter.mNoLocationTitle'), t('waiter.mNoLocationMessage'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const res = await api.clockIn(pos.coords.latitude, pos.coords.longitude);
      setStatus(res);
    } catch (e) {
      // A rejected clock-in (too far from the venue) comes back as a normal API error, not a
      // GPS failure — surfaced with the server's own message either way.
      Alert.alert(t('waiter.mClockInFailedTitle'), api.extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleClockOut() {
    setBusy(true);
    try {
      setStatus(await api.clockOut());
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingView />;

  const onDuty = status?.onDuty ?? false;

  return (
    <Screen>
      <View style={{ padding: spacing.lg }}>
        <Title>{t('waiter.dashboardTitle')}</Title>
        <Muted style={{ marginTop: 4 }}>{user?.fullName}</Muted>

        <Card style={{ marginTop: spacing.xl, alignItems: 'center', padding: spacing.xl }}>
          <View
            style={{
              width: 14, height: 14, borderRadius: 7, marginBottom: spacing.md,
              backgroundColor: onDuty ? colors.success : colors.textFaint,
            }}
          />
          <Title style={{ marginBottom: spacing.xs }}>
            {onDuty ? t('waiter.onDuty') : t('waiter.offDuty')}
          </Title>
          {onDuty && status?.since && (
            <Muted style={{ marginBottom: spacing.lg }}>
              {t('waiter.sinceTime', { time: new Date(status.since).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) })}
            </Muted>
          )}
          {!onDuty && <Muted style={{ marginBottom: spacing.lg, textAlign: 'center' }}>{t('waiter.mClockInHint')}</Muted>}
          <Button
            title={onDuty ? t('waiter.clockOutButton') : t('waiter.clockInButton')}
            variant={onDuty ? 'secondary' : 'primary'}
            onPress={onDuty ? handleClockOut : handleClockIn}
            loading={busy}
          />
        </Card>
      </View>
    </Screen>
  );
}
