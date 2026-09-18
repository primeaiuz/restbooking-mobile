import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { PlatformOverview } from '@/lib/types';
import { Screen, Title, Muted, Card, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function OverviewScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setOverview(await api.getPlatformOverview());
    } catch (e) {
      setError(api.extractErrorMessage(e));
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

  if (loading) return <LoadingView />;

  if (error || !overview) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Muted style={{ textAlign: 'center', marginBottom: spacing.md }}>{error || t('common.error')}</Muted>
          <Text onPress={load} style={{ color: colors.primary, fontWeight: '700' }}>{t('common.retry')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Title>{t('systemAdminOverview.title')}</Title>
            <Muted style={{ marginTop: 4 }}>{user?.fullName}</Muted>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl }}>
          <StatCard label={t('systemAdminOverview.chains')} value={String(overview.totalChains)} />
          <StatCard label={t('systemAdminOverview.totalVenues')} value={String(overview.totalVenues)} />
          <StatCard label={t('systemAdminOverview.independentVenues')} value={String(overview.independentVenues)} />
          <StatCard label={t('systemAdminOverview.pendingModeration')} value={String(overview.pendingModeration)} highlight={overview.pendingModeration > 0} />
          <StatCard label={t('systemAdminOverview.bookings30d')} value={String(overview.totalBookingsLast30Days)} />
          <StatCard label={t('systemAdminOverview.avgRating')} value={overview.avgRatingPlatform ? overview.avgRatingPlatform.toFixed(1) : '—'} />
        </View>

        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.md }}>{t('systemAdminOverview.usersByRole')}</Text>
        <Card>
          {Object.entries(overview.usersByRole).map(([role, count]) => (
            <View key={role} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ color: colors.textMuted }}>{t(`role.${role}`)}</Text>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{count}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card style={{ width: '47%' }}>
      <Text style={{ color: highlight ? colors.warning : colors.primary, fontWeight: '800', fontSize: 24 }}>{value}</Text>
      <Muted style={{ marginTop: 4 }}>{label}</Muted>
    </Card>
  );
}
