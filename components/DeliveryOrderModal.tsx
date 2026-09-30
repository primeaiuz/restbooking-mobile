import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { LocationPickerMap } from './LocationPickerMap';
import { Title, Muted, Button } from './UI';
import { colors, spacing } from '@/lib/theme';
import type { VenueDetail } from '@/lib/types';

const TASHKENT_CENTER = { lat: 41.2995, lng: 69.2401 };

export function DeliveryOrderModal({ venue, visible, onClose, onSuccess }: {
  venue: VenueDetail; visible: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [addressNote, setAddressNote] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const items = venue.menuItems.filter((m) => (quantities[m.id] ?? 0) > 0);
  const total = items.reduce((sum, m) => sum + m.priceSum * (quantities[m.id] ?? 0), 0);

  function setQty(id: number, qty: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  }

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(t('waiter.mNoLocationTitle'), t('waiter.mNoLocationMessage'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      Alert.alert(t('common.error'), t('delivery.mLocationFailed'));
    } finally {
      setLocating(false);
    }
  }

  async function submit() {
    if (items.length === 0 || !coords) return;
    setSubmitting(true);
    try {
      await api.createDeliveryOrder({
        venueId: venue.id,
        deliveryLat: coords.lat,
        deliveryLng: coords.lng,
        addressNote: addressNote || undefined,
        items: items.map((m) => ({ menuItemId: m.id, quantity: quantities[m.id] })),
      });
      setQuantities({});
      setAddressNote('');
      setCoords(null);
      onSuccess();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ maxHeight: '90%', backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Title>{t('delivery.modalTitle')}</Title>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 20, color: colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            {venue.menuItems.map((item) => (
              <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{item.name}</Text>
                  <Muted>{t('venue.menuPriceLabel', { value: item.priceSum.toLocaleString('ru-RU') })}</Muted>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <TouchableOpacity onPress={() => setQty(item.id, (quantities[item.id] ?? 0) - 1)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.text }}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ width: 20, textAlign: 'center', color: colors.text }}>{quantities[item.id] ?? 0}</Text>
                  <TouchableOpacity onPress={() => setQty(item.id, (quantities[item.id] ?? 0) + 1)} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.white }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={{ marginTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{t('delivery.locationLabel')}</Text>
              <TouchableOpacity onPress={useCurrentLocation} disabled={locating}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                  {locating ? t('common.loading') : t('delivery.useCurrentLocationButton')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: spacing.xs }}>
              <LocationPickerMap
                value={coords}
                defaultCenter={venue.latitude && venue.longitude ? { lat: venue.latitude, lng: venue.longitude } : TASHKENT_CENTER}
                onChange={(lat, lng) => setCoords({ lat, lng })}
              />
            </View>
            <Muted style={{ marginTop: spacing.xs }}>{t('delivery.mMapHint')}</Muted>

            <View style={{ marginTop: spacing.md }}>
              <Text style={{ color: colors.text, fontWeight: '600', marginBottom: spacing.xs }}>{t('delivery.addressNoteLabel')}</Text>
              <TextInput
                value={addressNote}
                onChangeText={setAddressNote}
                placeholder={t('delivery.addressNotePlaceholder')}
                placeholderTextColor={colors.textFaint}
                multiline
                style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: spacing.sm, color: colors.text, minHeight: 60 }}
              />
            </View>

            <View style={{ marginTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{t('waiter.totalLabel')}</Text>
              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>
                {t('venue.menuPriceLabel', { value: total.toLocaleString('ru-RU') })}
              </Text>
            </View>

            {items.length === 0 && <Muted style={{ marginTop: spacing.sm }}>{t('delivery.mPickItemsHint')}</Muted>}
            {items.length > 0 && !coords && <Muted style={{ marginTop: spacing.sm }}>{t('delivery.mPickLocationHint')}</Muted>}

            <Button
              title={t('delivery.submitButton')}
              onPress={submit}
              loading={submitting}
              disabled={items.length === 0 || !coords}
              style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
