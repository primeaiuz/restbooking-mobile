import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ChainStats } from '@/lib/types';
import { Screen, Title, Muted, Card, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function AggregatorDashboardScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<ChainStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setStats(await api.getChainStats());
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleLogout() {
    Alert.alert(t('common.logoutConfirmTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.logout'), style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  }

  if (loading || !stats) return <LoadingView />;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Title>{t('aggregatorDashboard.title')}</Title>
            <Muted style={{ marginTop: 4 }}>{user?.fullName}</Muted>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl }}>
          <StatCard label={t('aggregatorDashboard.venuesInChain')} value={String(stats.totalVenues)} />
          <StatCard label={t('aggregatorDashboard.bookings30d')} value={String(stats.totalBookingsLast30Days)} />
          <StatCard label={t('aggregatorDashboard.avgRating')} value={stats.avgRatingAcrossChain ? stats.avgRatingAcrossChain.toFixed(1) : '—'} />
        </View>

        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.md }}>{t('aggregatorDashboard.mComparisonTitle')}</Text>
        <Muted style={{ marginBottom: spacing.md }}>{t('aggregatorDashboard.mComparisonHint')}</Muted>
        {(() => {
          const sorted = [...stats.perVenue].sort((a, b) => b.bookingsLast30Days - a.bookingsLast30Days);
          const max = Math.max(1, ...sorted.map((v) => v.bookingsLast30Days));
          return sorted.map((v, i) => (
            <Card key={v.venueId} style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{i + 1}. {v.venueName}</Text>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>{v.bookingsLast30Days}</Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.bg, marginTop: spacing.sm, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${Math.max(4, (v.bookingsLast30Days / max) * 100)}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
                <Muted>{t('aggregatorDashboard.mNoShows')}: {v.noShowRatePercent}%</Muted>
                <Muted>{t('aggregatorDashboard.mRating')}: {v.avgRating ? v.avgRating.toFixed(1) : '—'}</Muted>
              </View>
            </Card>
          ));
        })()}
      </ScrollView>
    </Screen>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ width: '47%' }}>
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 24 }}>{value}</Text>
      <Muted style={{ marginTop: 4 }}>{label}</Muted>
    </Card>
  );
}
