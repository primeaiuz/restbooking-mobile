import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { ChatThreadSummary } from '@/lib/types';
import { Screen, Title, Muted, Card, Badge, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function ChatThreadsScreen() {
  const { t } = useTranslation();
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.listChatThreads();
      data.sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
      setThreads(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg }}>
        <Title>{t('mChat.title')}</Title>
      </View>
      <FlatList
        data={threads}
        keyExtractor={(th) => String(th.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(system-admin)/chat/${item.id}`)} activeOpacity={0.8}>
            <Card style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item.adminName}</Text>
                {item.unreadCount > 0 && <Badge text={String(item.unreadCount)} color={colors.primary} />}
              </View>
              <Muted style={{ marginTop: 2 }}>
                {item.adminRole === 'VENUE_ADMIN' ? t('chat.roleVenueAdmin') : item.adminRole === 'AGGREGATOR_ADMIN' ? t('chat.roleAggregatorAdmin') : item.adminRole ?? ''} · {item.contextLabel}
              </Muted>
              {item.lastMessagePreview ? <Muted style={{ marginTop: spacing.sm }} numberOfLines={1}>{item.lastMessagePreview}</Muted> : null}
              {item.lastMessageAt ? <Muted style={{ marginTop: 2, fontSize: 11 }}>{dayjs(item.lastMessageAt).format('DD.MM HH:mm')}</Muted> : null}
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState text={t('mChat.mEmpty')} />}
      />
    </Screen>
  );
}
