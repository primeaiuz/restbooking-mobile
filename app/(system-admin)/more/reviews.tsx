import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { PlatformReview } from '@/lib/types';
import { Screen, Title, Muted, Card, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function PlatformReviewsScreen() {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<PlatformReview[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.listPlatformReviews().then(setReviews).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function confirmDelete(id: number) {
    Alert.alert(t('systemAdminReviewsPage.mDeleteConfirm'), t('systemAdminReviewsPage.mDeleteHint'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await api.deletePlatformReview(id); load(); } catch (e) { Alert.alert(t('common.error'), api.extractErrorMessage(e)); } } },
    ]);
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Title>{t('systemAdminReviewsPage.title')}</Title>
      </View>
      <FlatList
        data={reviews}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{item.venueName}</Text>
              <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
            <Muted style={{ marginTop: 2 }}>{item.clientName} · {item.rating}★</Muted>
            {item.comment ? <Text style={{ color: colors.textMuted, marginTop: spacing.xs }}>{item.comment}</Text> : null}
            {item.adminReply ? <Muted style={{ marginTop: spacing.xs }}>{t('systemAdminReviewsPage.mReplyPrefix')}{item.adminReply}</Muted> : null}
          </Card>
        )}
        ListEmptyComponent={<EmptyState text={t('systemAdminReviewsPage.empty')} />}
      />
    </Screen>
  );
}
