import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { VenueSummary } from '@/lib/types';
import { Screen, Title, Muted, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const [venues, setVenues] = useState<VenueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setVenues(await api.listFavorites());
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function removeFav(venueId: number) {
    setVenues((prev) => prev.filter((v) => v.id !== venueId));
    try {
      await api.removeFavorite(venueId);
    } catch {
      load();
    }
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Title>{t('favorites.title')}</Title>
      </View>
      <FlatList
        data={venues}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/(client)/catalog/${item.id}`)} activeOpacity={0.8}>
            <View style={styles.imageWrap}>
              {item.coverPhotoUrl ? (
                <Image source={{ uri: api.resolveImageUrl(item.coverPhotoUrl) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Ionicons name="restaurant-outline" size={28} color={colors.textFaint} style={{ margin: 'auto' }} />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{item.name}</Text>
              <Muted style={{ marginTop: 2 }}>{t(`venueType.${item.type}`)} · {item.city}</Muted>
            </View>
            <TouchableOpacity onPress={() => removeFav(item.id)} style={{ padding: spacing.sm }}>
              <Ionicons name="heart" size={22} color={colors.danger} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState text={t('favorites.empty')} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.md, marginBottom: spacing.md,
  },
  imageWrap: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.bg, overflow: 'hidden' },
});
