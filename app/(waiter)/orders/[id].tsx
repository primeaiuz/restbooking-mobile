import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { TableOrder, MenuItem } from '@/lib/types';
import { Screen, Title, Muted, Card, Button, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function WaiterOrderDetailScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const [order, setOrder] = useState<TableOrder | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, v] = await Promise.all([
        api.getOrder(orderId),
        user?.venueId ? api.getVenue(user.venueId) : Promise.resolve(null),
      ]);
      setOrder(o);
      setMenu(v?.menuItems ?? []);
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [orderId, user?.venueId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleAddItem(menuItemId: number) {
    setBusy(true);
    try {
      setOrder(await api.addOrderItem(orderId, menuItemId, 1));
      setPickerOpen(false);
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveItem(itemId: number) {
    setBusy(true);
    try {
      await api.removeOrderItem(orderId, itemId);
      setOrder(await api.getOrder(orderId));
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    if (!order?.items.length) {
      Alert.alert(t('waiter.mEmptyOrderTitle'), t('waiter.mEmptyOrderMessage'));
      return;
    }
    Alert.alert(t('waiter.mCloseOrderConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('waiter.closeOrderButton'), onPress: async () => {
          setBusy(true);
          try {
            await api.closeOrder(orderId);
            router.replace('/(waiter)/orders');
          } catch (e) {
            Alert.alert(t('common.error'), api.extractErrorMessage(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (loading || !order) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Title>{order.tableUnitName || `#${order.tableUnitId}`}</Title>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, flexGrow: 1 }}>
        {order.items.map((item) => (
          <Card key={item.id} style={{ marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
              <Muted>{item.quantity} × {t('venue.menuPriceLabel', { value: item.unitPriceSum.toLocaleString('ru-RU') })}</Muted>
            </View>
            <Text style={{ color: colors.primary, fontWeight: '700', marginRight: spacing.md }}>
              {item.lineTotalSum.toLocaleString('ru-RU')}
            </Text>
            <TouchableOpacity onPress={() => handleRemoveItem(item.id)} disabled={busy}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </Card>
        ))}

        <TouchableOpacity onPress={() => setPickerOpen(true)} style={{ marginTop: spacing.sm }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>+ {t('waiter.addItemButton')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{t('waiter.totalLabel')}</Text>
          <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>
            {t('venue.menuPriceLabel', { value: order.totalSum.toLocaleString('ru-RU') })}
          </Text>
        </View>
        {order.status === 'OPEN' ? (
          <Button title={t('waiter.closeOrderButton')} onPress={handleClose} loading={busy} />
        ) : (
          <Muted style={{ textAlign: 'center' }}>{t('waiter.mOrderClosed')}</Muted>
        )}
      </View>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '75%' }}>
            <Title style={{ marginBottom: spacing.md }}>{t('waiter.pickDishTitle')}</Title>
            <ScrollView>
              {menu.map((m) => (
                <TouchableOpacity key={m.id} onPress={() => handleAddItem(m.id)} disabled={busy}>
                  <Card style={{ marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{m.name}</Text>
                      <Muted>{m.category}</Muted>
                    </View>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      {t('venue.menuPriceLabel', { value: m.priceSum.toLocaleString('ru-RU') })}
                    </Text>
                  </Card>
                </TouchableOpacity>
              ))}
              {menu.length === 0 && <Muted>{t('waiter.mNoMenuItems')}</Muted>}
            </ScrollView>
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setPickerOpen(false)} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
