import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView, Share } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { Booking, BookingStatus } from '@/lib/types';
import { Screen, Title, Muted, Badge, Card, Button, EmptyState, LoadingView, Pill } from '@/components/UI';
import { colors, spacing, statusColor } from '@/lib/theme';

const FILTERS: (BookingStatus | 'ALL')[] = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DECLINED', 'NO_SHOW'];

export default function VenueBookingsScreen() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.listVenueBookings();
      data.sort((a, b) => (a.bookingDate + a.startTime < b.bookingDate + b.startTime ? 1 : -1));
      setBookings(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function act(id: number, fn: (id: number) => Promise<any>) {
    setBusyId(id);
    try {
      await fn(id);
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  function confirmAction(title: string, id: number, fn: (id: number) => Promise<any>) {
    Alert.alert(title, undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('adminBookings.mYes'), onPress: () => act(id, fn) },
    ]);
  }

  const filtered = filter === 'ALL' ? bookings : bookings.filter((b) => b.status === filter);

  // Plain-text export via the OS share sheet — covers "print/export the day's
  // bookings for the hostess at the door" without a PDF pipeline: from the share
  // sheet the admin can already print, send to Telegram, or save as a file.
  async function exportList() {
    if (filtered.length === 0) {
      Alert.alert(t('adminBookings.mExportEmpty'));
      return;
    }
    const lines = filtered
      .slice()
      .sort((a, b) => (a.bookingDate + a.startTime > b.bookingDate + b.startTime ? 1 : -1))
      .map((b) => `${b.bookingDate} ${b.startTime}–${b.endTime} · ${b.tableUnitName} · ${b.guestName} (${b.guestPhone}) · ${b.guestCount} ${t('common.guestsUnit')} · ${t(`status.${b.status}`)}`);
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // user dismissed the share sheet
    }
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title>{t('adminBookings.title')}</Title>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TouchableOpacity onPress={exportList}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('adminBookings.mExportButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(venue-admin)/bookings/scan')}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('adminBookings.mScanQr')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(venue-admin)/bookings/new')}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('adminBookings.mNewBooking')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: spacing.lg, marginBottom: spacing.sm }}>
        {FILTERS.map((f) => (
          <Pill key={f} label={f === 'ALL' ? t('adminBookings.allStatuses') : t(`status.${f}`)} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>
      <FlatList
        data={filtered}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{item.guestName}</Text>
              <Badge text={t(`status.${item.status}`)} color={statusColor[item.status] ?? colors.textMuted} />
            </View>
            <Muted style={{ marginTop: 4 }}>{item.guestPhone} · {item.guestCount} {t('common.guestsUnit')}</Muted>
            <Muted style={{ marginTop: 2 }}>{item.tableUnitName} · {item.bookingDate} {item.startTime}–{item.endTime}</Muted>
            {item.comment ? <Muted style={{ marginTop: 2 }}>«{item.comment}»</Muted> : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
              {item.status === 'PENDING' && (
                <>
                  <Button title={t('adminBookings.mConfirm')} small onPress={() => act(item.id, api.confirmBooking)} loading={busyId === item.id} disabled={busyId !== null && busyId !== item.id} />
                  <Button title={t('adminBookings.mDecline')} variant="danger" small onPress={() => confirmAction(t('adminBookings.mDeclineConfirm'), item.id, api.declineBooking)} loading={busyId === item.id} disabled={busyId !== null && busyId !== item.id} />
                </>
              )}
              {item.status === 'CONFIRMED' && (
                <>
                  <Button title={t('adminBookings.mComplete')} small variant="secondary" onPress={() => act(item.id, api.completeBooking)} loading={busyId === item.id} disabled={busyId !== null && busyId !== item.id} />
                  <Button title={t('adminBookings.mNoShow')} small variant="secondary" onPress={() => confirmAction(t('adminBookings.mNoShowConfirm'), item.id, api.markNoShow)} loading={busyId === item.id} disabled={busyId !== null && busyId !== item.id} />
                  <Button title={t('adminBookings.mCancel')} small variant="danger" onPress={() => confirmAction(t('adminBookings.mCancelConfirm'), item.id, api.cancelBookingAsAdmin)} loading={busyId === item.id} disabled={busyId !== null && busyId !== item.id} />
                </>
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={<EmptyState text={t('adminBookings.mNotFound')} />}
      />
    </Screen>
  );
}
