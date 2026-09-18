import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { TableOrder, VenueDetail } from '@/lib/types';
import { Screen, Title, Muted, Card, Button, LoadingView, EmptyState } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function WaiterOrdersScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ordersList, v] = await Promise.all([
        api.listMyOpenOrders(),
        user?.venueId ? api.getVenue(user.venueId) : Promise.resolve(null),
      ]);
      setOrders(ordersList);
      setVenue(v);
    } catch {
      // ignore — list stays empty, "no orders yet" shows
    } finally {
      setLoading(false);
    }
  }, [user?.venueId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handlePickTable(tableUnitId: number) {
    setOpening(true);
    try {
      const order = await api.openOrder(tableUnitId);
      setPickerOpen(false);
      router.push(`/(waiter)/orders/${order.id}`);
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setOpening(false);
    }
  }

  if (loading) return <LoadingView />;

  const allTables = (venue?.halls ?? []).flatMap((h) => h.tables.map((tb) => ({ ...tb, hallName: h.name })));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <Title>{t('waiter.ordersTitle')}</Title>
          <TouchableOpacity onPress={() => setPickerOpen(true)}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>+ {t('waiter.newOrderButton')}</Text>
          </TouchableOpacity>
        </View>

        {orders.length === 0 && <EmptyState text={t('waiter.mNoOpenOrders')} />}

        {orders.map((o) => (
          <TouchableOpacity key={o.id} onPress={() => router.push(`/(waiter)/orders/${o.id}`)}>
            <Card style={{ marginBottom: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{o.tableUnitName || `#${o.tableUnitId}`}</Text>
                <Muted style={{ marginTop: 2 }}>{t('waiter.itemsCount', { count: o.items.length })}</Muted>
              </View>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>
                {t('venue.menuPriceLabel', { value: o.totalSum.toLocaleString('ru-RU') })}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '75%' }}>
            <Title style={{ marginBottom: spacing.md }}>{t('waiter.pickTableTitle')}</Title>
            <ScrollView>
              {allTables.map((tb) => (
                <TouchableOpacity key={tb.id} onPress={() => handlePickTable(tb.id)} disabled={opening}>
                  <Card style={{ marginBottom: spacing.sm }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{tb.name}</Text>
                    <Muted>{tb.hallName}</Muted>
                  </Card>
                </TouchableOpacity>
              ))}
              {allTables.length === 0 && <Muted>{t('waiter.mNoTables')}</Muted>}
            </ScrollView>
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setPickerOpen(false)} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
