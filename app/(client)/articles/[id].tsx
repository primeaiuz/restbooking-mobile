import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as api from '@/lib/api';
import type { Article } from '@/lib/types';
import { Screen, Title, Muted, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPublishedArticle(Number(id)).then(setArticle).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading || !article) return <LoadingView />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {article.coverImageUrl ? <Image source={{ uri: api.resolveImageUrl(article.coverImageUrl) }} style={{ width: '100%', height: 200 }} resizeMode="cover" /> : null}
        <View style={{ padding: spacing.lg }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: spacing.md }}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          {article.categoryName ? <Muted>{article.categoryName}</Muted> : null}
          <Title style={{ marginTop: 4 }}>{article.title}</Title>
          <Text style={{ color: colors.textMuted, marginTop: spacing.lg, lineHeight: 22, fontSize: 15 }}>{article.content}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
