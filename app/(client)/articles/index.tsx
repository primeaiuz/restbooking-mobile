import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { ArticleSummary } from '@/lib/types';
import { Screen, Title, Muted, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

export default function ArticlesScreen() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listPublishedArticles().then(setArticles).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Title>{t('articlesPage.title')}</Title>
      </View>
      <FlatList
        data={articles}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/(client)/articles/${item.id}`)} activeOpacity={0.8}>
            {item.coverImageUrl ? (
              <Image source={{ uri: api.resolveImageUrl(item.coverImageUrl) }} style={styles.image} resizeMode="cover" />
            ) : null}
            <View style={{ padding: spacing.md }}>
              {item.categoryName ? <Muted>{item.categoryName}</Muted> : null}
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 4 }}>{item.title}</Text>
              <Text style={{ color: colors.textMuted, marginTop: 4 }} numberOfLines={2}>{item.excerpt}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState text={t('articlesPage.empty')} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.md, overflow: 'hidden' },
  image: { width: '100%', height: 140 },
});
