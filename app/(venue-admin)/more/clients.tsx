import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { ClientSummary } from '@/lib/types';
import { Screen, Title, Muted, Card, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function ClientsScreen() {
  const { t } = useTranslation();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listClients().then(setClients).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Title>{t('adminClients.title')}</Title>
      </View>
      <FlatList
        data={clients}
        keyExtractor={(c) => c.guestPhone}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item.guestName}</Text>
            <Muted style={{ marginTop: 2 }}>{item.guestPhone}</Muted>
            <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
              <Muted>{t('adminClients.mVisits')}: {item.visitsCount}</Muted>
              <Muted>{t('adminClients.mNoShows')}: {item.noShowCount}</Muted>
              <Muted>{t('adminClients.mCancellations')}: {item.cancelledCount}</Muted>
            </View>
            {item.lastVisitDate ? <Muted style={{ marginTop: 4 }}>{t('adminClients.mLastVisit')}: {item.lastVisitDate}</Muted> : null}
          </Card>
        )}
        ListEmptyComponent={<EmptyState text={t('adminClients.mEmpty')} />}
      />
    </Screen>
  );
}
