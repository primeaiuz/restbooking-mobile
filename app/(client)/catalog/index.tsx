import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, RefreshControl, TextInput,
  ScrollView, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { VenueSummary, VenueType, City, Banner } from '@/lib/types';
import { Screen, Muted, Pill, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing, radius, fonts, venueTypeGradient } from '@/lib/theme';

const TYPES: (VenueType | 'ALL')[] = ['ALL', 'RESTAURANT', 'TEAHOUSE', 'CAFE'];

export default function CatalogScreen() {
  const { t } = useTranslation();
  const [venues, setVenues] = useState<VenueSummary[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<VenueType | 'ALL'>('ALL');
  const [city, setCity] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const [v, c] = await Promise.all([
        api.searchVenues({
          search: search || undefined,
          type: type === 'ALL' ? undefined : type,
          city,
          sort: 'POPULAR',
        }),
        cities.length ? Promise.resolve(cities) : api.listCities(),
      ]);
      setVenues(v);
      setCities(c);
      if (banners.length === 0) {
        try {
          setBanners(await api.listActiveBanners());
        } catch {
          // banners are optional
        }
      }
    } catch {
      // keep previous state on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, type, city]);

  useEffect(() => {
    load();
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  if (loading && venues.length === 0) return <LoadingView />;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RestBooking</Text>
        <TouchableOpacity onPress={() => router.push('/(client)/articles')}>
          <Ionicons name="newspaper-outline" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={venues}
        keyExtractor={(v) => String(v.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        ListHeaderComponent={
          <View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textFaint} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={load}
                placeholder={t('catalog.searchPlaceholder')}
                placeholderTextColor={colors.textFaint}
                style={styles.searchInput}
                returnKeyType="search"
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
              {TYPES.map((tp) => (
                <Pill
                  key={tp}
                  label={tp === 'ALL' ? t('catalog.allTypes') : t(`venueType.${tp}`)}
                  active={type === tp}
                  onPress={() => setType(tp)}
                />
              ))}
            </ScrollView>

            {cities.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <Pill label={t('catalog.allCities')} active={!city} onPress={() => setCity(undefined)} />
                {cities.map((c) => (
                  <Pill key={c.id} label={c.name} active={city === c.name} onPress={() => setCity(c.name)} />
                ))}
              </ScrollView>
            )}
          </View>
        }
        renderItem={({ item }) => <VenueCard venue={item} />}
        ListEmptyComponent={<EmptyState text={t('catalog.emptyFiltered')} />}
      />
    </Screen>
  );
}

function VenueCard({ venue }: { venue: VenueSummary }) {
  const { t } = useTranslation();
  const gradient = venueTypeGradient[venue.type];
  const hasOcc = venue.freeTables != null && venue.totalTables != null && venue.totalTables > 0;
  const takenPct = hasOcc ? Math.round(((venue.totalTables! - venue.freeTables!) / venue.totalTables!) * 100) : 0;

  const meta: string[] = [];
  if (venue.district || venue.city) meta.push(venue.district || venue.city);
  if (venue.priceFrom != null) meta.push(t('venueCard.priceFrom', { value: venue.priceFrom.toLocaleString('ru-RU') }));
  if (venue.avgRating != null) meta.push(`★ ${venue.avgRating.toFixed(1)}`);
  if (venue.distanceKm != null) meta.push(t('common.distanceKm', { value: venue.distanceKm.toFixed(1) }));

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/(client)/catalog/${venue.id}`)} activeOpacity={0.85}>
      <View style={styles.cardImageWrap}>
        {venue.coverPhotoUrl ? (
          <Image source={{ uri: venue.coverPhotoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        )}
        <View style={styles.cuisinePill}>
          <Text style={styles.cuisinePillText} numberOfLines={1}>{venue.cuisine || t(`venueType.${venue.type}`)}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{venue.name}</Text>
        <Muted style={{ marginTop: 2 }}>{meta.join('  ·  ')}</Muted>
        {hasOcc && (
          <View style={{ marginTop: spacing.sm }}>
            <View style={styles.occRow}>
              <Text style={styles.occFree}>{t('venueCard.free')}</Text>
              <Muted style={{ fontSize: 12 }}>{t('venueCard.freeOf', { free: venue.freeTables, total: venue.totalTables })}</Muted>
            </View>
            <View style={styles.occTrack}>
              <View style={[styles.occFill, { width: `${takenPct}%` }]} />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 20, fontFamily: fonts.display, color: colors.text },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md, marginBottom: spacing.md,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 12, marginLeft: spacing.sm, fontSize: 15 },
  banner: {
    width: 280, height: 130, borderRadius: radius.lg, overflow: 'hidden',
    marginRight: spacing.md, backgroundColor: colors.card,
  },
  bannerOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md,
    backgroundColor: colors.scrimStrong,
  },
  bannerTitle: { color: colors.white, fontWeight: '700', fontSize: 15 },
  bannerSubtitle: { color: colors.onScrimMuted, fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardImageWrap: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.band },
  cuisinePill: {
    position: 'absolute', left: spacing.sm, bottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 4, maxWidth: '70%',
  },
  cuisinePillText: { color: colors.text, fontWeight: '700', fontSize: 11 },
  cardName: { color: colors.text, fontFamily: fonts.display, fontSize: 17 },
  occRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  occFree: { color: colors.forest, fontWeight: '700', fontSize: 12 },
  occTrack: { marginTop: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.band, overflow: 'hidden' },
  occFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.forest },
  cardBody: { padding: spacing.md },
});
