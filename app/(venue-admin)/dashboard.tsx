import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { VenueStats, BookingSource } from '@/lib/types';
import { Screen, Title, Muted, Card, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<VenueStats | null>(null);
  // The backend doesn't return a source breakdown in VenueStats, but each Booking
  // already carries a `source` field (WEB vs ADMIN_MANUAL) — computed client-side
  // from the full bookings list rather than waiting on a backend aggregation endpoint.
  const [bySource, setBySource] = useState<Record<BookingSource, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, bookings] = await Promise.all([api.getStats(), api.listVenueBookings()]);
      setStats(s);
      setBySource(
        bookings.reduce(
          (acc, b) => { acc[b.source] = (acc[b.source] ?? 0) + 1; return acc; },
          { WEB: 0, ADMIN_MANUAL: 0 } as Record<BookingSource, number>,
        ),
      );
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !stats) return <LoadingView />;

  const statusEntries = Object.entries(stats.byStatus);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <Title>{t('adminDashboard.title')}</Title>
        <Muted style={{ marginTop: 4 }}>{user?.fullName}</Muted>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl }}>
          <StatCard label={t('adminDashboard.bookings30d')} value={String(stats.totalBookingsLast30Days)} />
          <StatCard label={t('adminDashboard.occupancy')} value={`${stats.occupancyRatePercent}%`} />
          <StatCard label={t('adminDashboard.noShowRate')} value={`${stats.noShowRatePercent}%`} />
          <StatCard label={t('adminDashboard.rating')} value={stats.avgRating ? stats.avgRating.toFixed(1) : '—'} sub={`${stats.reviewsCount} ${t('common.reviews')}`} />
        </View>

        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.md }}>{t('adminDashboard.byStatusTitle')}</Text>
        <Card>
          {statusEntries.length === 0 && <Muted>{t('adminDashboard.noData')}</Muted>}
          {statusEntries.map(([status, count]) => (
            <View key={status} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ color: colors.textMuted }}>{t(`status.${status}`)}</Text>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{count}</Text>
            </View>
          ))}
        </Card>

        {bySource && (bySource.WEB + bySource.ADMIN_MANUAL) > 0 && (
          <>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.md }}>{t('adminBookings.mBySourceTitle')}</Text>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={{ color: colors.textMuted }}>{t('adminBookings.mSourceWeb')}</Text>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{bySource.WEB}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={{ color: colors.textMuted }}>{t('adminBookings.mSourceManual')}</Text>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{bySource.ADMIN_MANUAL}</Text>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card style={{ width: '47%' }}>
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 24 }}>{value}</Text>
      <Muted style={{ marginTop: 4 }}>{label}</Muted>
      {sub ? <Muted style={{ marginTop: 2 }}>{sub}</Muted> : null}
    </Card>
  );
}
