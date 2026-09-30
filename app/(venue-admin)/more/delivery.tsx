import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { DeliveryOrder, DeliveryStatus } from '@/lib/types';
import { Screen, Title, Muted, Card, LoadingView, EmptyState } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

const FILTERS: (DeliveryStatus | 'ALL')[] = ['ALL', 'PENDING', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DECLINED', 'CANCELLED'];

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  PENDING: colors.gold, CONFIRMED: colors.success, DECLINED: colors.danger,
  OUT_FOR_DELIVERY: colors.primary, DELIVERED: colors.success, CANCELLED: colors.textFaint,
};

export default function VenueAdminDeliveryScreen() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<DeliveryStatus | 'ALL'>('ALL');
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setOrders(await api.listVenueDeliveryOrders(filter === 'ALL' ? undefined : filter));
    } catch {
      // ignore — list stays empty
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]));

  async function act(id: number, action: 'confirm' | 'decline' | 'out' | 'delivered') {
    setBusyId(id);
    try {
      if (action === 'confirm') await api.confirmDeliveryOrder(id);
      else if (action === 'decline') await api.declineDeliveryOrder(id);
      else if (action === 'out') await api.markOutForDelivery(id);
      else await api.markDelivered(id);
      await load();
    } catch {
      // best-effort — next auto-refresh will correct the list either way
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Title>{t('adminDelivery.title')}</Title>
        <Muted style={{ marginTop: 2 }}>{t('adminDelivery.subtitle')}</Muted>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, paddingLeft: spacing.lg, marginVertical: spacing.sm }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: 999, borderWidth: 1,
              marginRight: spacing.sm,
              backgroundColor: filter === f ? colors.primary : colors.card,
              borderColor: filter === f ? colors.primary : colors.cardBorder,
            }}
          >
            <Text style={{ color: filter === f ? colors.white : colors.text, fontSize: 13, fontWeight: '600' }}>
              {f === 'ALL' ? t('adminDelivery.allStatuses') : t(`deliveryStatus.${f}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
        {orders.length === 0 && <EmptyState text={t('adminDelivery.mNoOrders')} />}
        {orders.map((o) => (
          <Card key={o.id} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{t('adminDelivery.orderNumber', { id: o.id })}</Text>
                  <View style={{ backgroundColor: STATUS_COLORS[o.status] + '22', borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
                    <Text style={{ color: STATUS_COLORS[o.status], fontSize: 11, fontWeight: '700' }}>{t(`deliveryStatus.${o.status}`)}</Text>
                  </View>
                </View>
                <Muted style={{ marginTop: 4 }}>{o.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</Muted>
                {o.addressNote ? <Muted style={{ marginTop: 2 }}>{o.addressNote}</Muted> : null}
                <TouchableOpacity onPress={() => Linking.openURL(`https://www.google.com/maps?q=${o.deliveryLat},${o.deliveryLng}`)}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 4 }}>{t('adminDelivery.viewOnMap')}</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>{o.totalSum.toLocaleString('ru-RU')}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              {o.status === 'PENDING' && (
                <>
                  <TouchableOpacity disabled={busyId === o.id} onPress={() => act(o.id, 'confirm')} style={{ backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
                    <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700' }}>{t('adminDelivery.confirmButton')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={busyId === o.id} onPress={() => act(o.id, 'decline')} style={{ backgroundColor: colors.danger, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
                    <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700' }}>{t('adminDelivery.declineButton')}</Text>
                  </TouchableOpacity>
                </>
              )}
              {o.status === 'CONFIRMED' && (
                <TouchableOpacity disabled={busyId === o.id} onPress={() => act(o.id, 'out')} style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
                  <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700' }}>{t('adminDelivery.outForDeliveryButton')}</Text>
                </TouchableOpacity>
              )}
              {o.status === 'OUT_FOR_DELIVERY' && (
                <TouchableOpacity disabled={busyId === o.id} onPress={() => act(o.id, 'delivered')} style={{ backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 6 }}>
                  <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700' }}>{t('adminDelivery.deliveredButton')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
