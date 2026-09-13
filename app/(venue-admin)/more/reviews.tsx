import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { Review } from '@/lib/types';
import { Screen, Title, Muted, Card, Input, Button, EmptyState, LoadingView, Label } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

export default function VenueReviewsScreen() {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  function load() {
    api.listVenueReviews().then(setReviews).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function submitReply(id: number) {
    const text = (replyDrafts[id] ?? '').trim();
    if (!text) return;
    setSavingId(id);
    try {
      await api.replyToReview(id, text);
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Title>{t('adminReviews.title')}</Title>
      </View>
      <FlatList
        data={reviews}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.clientName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="star" size={14} color={colors.gold} />
                <Text style={{ color: colors.text, marginLeft: 4, fontWeight: '600' }}>{item.rating}</Text>
              </View>
            </View>
            {item.comment ? <Text style={{ color: colors.textMuted, marginTop: spacing.xs }}>{item.comment}</Text> : null}

            {item.adminReply ? (
              <View style={{ marginTop: spacing.sm, backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm }}>
                <Label>{t('adminReviews.mYourReply')}</Label>
                <Text style={{ color: colors.textMuted, marginTop: 2 }}>{item.adminReply}</Text>
              </View>
            ) : (
              <View style={{ marginTop: spacing.md }}>
                <Input
                  placeholder={t('adminReviews.replyPlaceholder')}
                  value={replyDrafts[item.id] ?? ''}
                  onChangeText={(v) => setReplyDrafts((prev) => ({ ...prev, [item.id]: v }))}
                  multiline
                  style={{ minHeight: 60, textAlignVertical: 'top' }}
                />
                <Button title={t('adminReviews.mReplyButton')} small variant="secondary" onPress={() => submitReply(item.id)} loading={savingId === item.id} style={{ alignSelf: 'flex-start' }} />
              </View>
            )}
          </Card>
        )}
        ListEmptyComponent={<EmptyState text={t('adminReviews.mEmpty')} />}
      />
    </Screen>
  );
}
