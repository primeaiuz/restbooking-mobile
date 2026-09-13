import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Switch } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { ChainVenue } from '@/lib/types';
import { Screen, Title, Muted, Card, Badge, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function ChainVenuesScreen() {
  const { t } = useTranslation();
  const [venues, setVenues] = useState<ChainVenue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setVenues(await api.listChainVenues());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleActive(v: ChainVenue) {
    setVenues((prev) => prev.map((x) => (x.id === v.id ? { ...x, active: !x.active } : x)));
    try {
      await api.setVenueActive(v.id, !v.active);
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
      load();
    }
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title>{t('aggregatorVenues.title')}</Title>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <TouchableOpacity onPress={() => router.push('/(aggregator)/venues/import')}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('mImportVenues.mImportLink')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(aggregator)/venues/new')}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('common.addPrefix')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={venues}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{item.name}</Text>
                <Muted style={{ marginTop: 2 }}>{t(`venueType.${item.type}`)} · {item.city}</Muted>
                <Muted style={{ marginTop: 2 }}>{t('aggregatorVenues.mAdmins')}: {item.adminCount} · {t('aggregatorVenues.mRating')}: {item.avgRating ? item.avgRating.toFixed(1) : '—'}</Muted>
              </View>
              <Switch value={item.active} onValueChange={() => toggleActive(item)} trackColor={{ true: colors.primary }} />
            </View>
          </Card>
        )}
        ListEmptyComponent={<EmptyState text={t('aggregatorVenues.mNoVenuesYet')} />}
      />
    </Screen>
  );
}
