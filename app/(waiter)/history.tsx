import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { WaiterHistory } from '@/lib/types';
import { Screen, Title, Muted, Card, LoadingView, EmptyState } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function WaiterHistoryScreen() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<WaiterHistory | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setHistory(await api.getWaiterHistory());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !history) return <LoadingView />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Title style={{ marginBottom: spacing.lg }}>{t('waiter.historyTitle')}</Title>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 20 }}>
              {history.totalEarningsSum.toLocaleString('ru-RU')}
            </Text>
            <Muted style={{ marginTop: 4 }}>{t('waiter.mTotalEarnings')}</Muted>
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20 }}>{history.totalOrdersClosed}</Text>
            <Muted style={{ marginTop: 4 }}>{t('waiter.mOrdersClosed')}</Muted>
          </Card>
        </View>

        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: spacing.md }}>{t('waiter.mRecentOrders')}</Text>
        {history.recentOrders.length === 0 && <EmptyState text={t('waiter.mNoClosedOrders')} />}
        {history.recentOrders.map((o) => (
          <Card key={o.id} style={{ marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{o.tableUnitName || `#${o.tableUnitId}`}</Text>
              <Muted>{o.closedAt ? new Date(o.closedAt).toLocaleDateString('ru-RU') : ''}</Muted>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{o.totalSum.toLocaleString('ru-RU')}</Text>
              {o.waiterEarningSum != null && (
                <Muted style={{ color: colors.primary }}>+{o.waiterEarningSum.toLocaleString('ru-RU')}</Muted>
              )}
            </View>
          </Card>
        ))}

        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.md }}>{t('waiter.mRecentShifts')}</Text>
        {history.recentShifts.length === 0 && <EmptyState text={t('waiter.mNoShiftsYet')} />}
        {history.recentShifts.map((s) => (
          <Card key={s.id} style={{ marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Muted>{new Date(s.clockInAt).toLocaleString('ru-RU')}</Muted>
            <Muted>{s.clockOutAt ? new Date(s.clockOutAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : t('waiter.onDuty')}</Muted>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
