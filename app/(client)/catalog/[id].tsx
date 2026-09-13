import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Share, Switch, Platform, Linking,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { scheduleBookingReminder } from '@/lib/reminders';
import type { VenueDetail, TableUnit, Review } from '@/lib/types';
import {
  Screen, Title, Subtitle, Muted, Label, Input, Button, Card, EmptyState, LoadingView, Divider,
} from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

export default function VenueDetailScreen() {
  const { t } = useTranslation();
  const { id, prefillName, prefillPhone, prefillGuests } = useLocalSearchParams<{
    id: string; prefillName?: string; prefillPhone?: string; prefillGuests?: string;
  }>();
  const venueId = Number(id);
  const { user } = useAuth();

  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  const [selectedTable, setSelectedTable] = useState<TableUnit | null>(null);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Pre-filled either from the logged-in user, or (when arriving via "book again" /
  // "reschedule" from the bookings list) from the query params of a past booking.
  const [guestName, setGuestName] = useState(prefillName || user?.fullName || '');
  const [guestPhone, setGuestPhone] = useState(prefillPhone || user?.phone || '');
  const [guestCount, setGuestCount] = useState(prefillGuests || '2');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // "Banquet / event" mode — the backend has no dedicated banquet-request flow, so we
  // fold the extra details into the existing free-text comment field that's already
  // shown to the venue admin, rather than waiting on a backend/data-model change.
  const [isBanquet, setIsBanquet] = useState(false);
  const [banquetOccasion, setBanquetOccasion] = useState('');
  const [banquetWishes, setBanquetWishes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, r] = await Promise.all([api.getVenue(venueId), api.getVenueReviews(venueId)]);
      setVenue(v);
      setReviews(r);
      try {
        const favs = await api.listFavorites();
        setIsFavorite(favs.some((f) => f.id === venueId));
      } catch {
        // not critical
      }
    } catch {
      Alert.alert(t('venue.loadErrorTitle'), t('venue.loadError'));
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => { load(); }, [load]);

  const next14Days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => dayjs().add(i, 'day')),
    [],
  );

  const loadSlots = useCallback(async (table: TableUnit, date: string) => {
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const s = await api.getFreeSlots(venueId, table.id, date);
      setSlots(s);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [venueId]);

  function pickTable(table: TableUnit) {
    setSelectedTable(table);
    loadSlots(table, selectedDate);
  }

  function pickDate(date: string) {
    setSelectedDate(date);
    if (selectedTable) loadSlots(selectedTable, date);
  }

  async function toggleFavorite() {
    try {
      if (isFavorite) {
        await api.removeFavorite(venueId);
        setIsFavorite(false);
      } else {
        await api.addFavorite(venueId);
        setIsFavorite(true);
      }
    } catch {
      Alert.alert(t('venue.loadErrorTitle'), t('venue.favoriteError'));
    }
  }

  // A full interactive "map with all catalog venues" view is blocked on the backend:
  // /venues (VenueSummary) doesn't currently return latitude/longitude, only
  // /venues/:id (VenueDetail) does — see lib/types.ts. Until the list endpoint
  // includes coordinates there's nothing to plot a catalog-wide map from, so this
  // deep-links out to the device's own Maps app for directions instead, which needs
  // no API key and works from data we already have on this screen.
  function openInMaps(lat: number, lng: number, label: string) {
    const query = encodeURIComponent(label);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${query})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url!).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    });
  }

  async function shareVenue() {
    try {
      await Share.share({
        message: t('venue.mShareMessage', { name: venue?.name, url: `https://restbooking.uz/venues/${venueId}` }),
        url: `https://restbooking.uz/venues/${venueId}`, // iOS uses `url` separately; Android folds it into `message`
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  async function submitBooking() {
    if (!selectedTable || !selectedSlot) {
      Alert.alert(t('venue.selectTimeTitle'), t('venue.selectTimeMessage'));
      return;
    }
    if (!guestName.trim() || !guestPhone.trim()) {
      Alert.alert(t('common.fillFields'), t('venue.fillDataMessage'));
      return;
    }
    const count = Number(guestCount);
    if (!count || count < 1) {
      Alert.alert(t('venue.invalidTitle'), t('venue.invalidGuestCount'));
      return;
    }
    const banquetNote = isBanquet
      ? [
          t('venue.mBanquetTag'),
          banquetOccasion.trim() && `${t('venue.mBanquetOccasionLabel')}: ${banquetOccasion.trim()}`,
          banquetWishes.trim() && `${t('venue.mBanquetWishesLabel')}: ${banquetWishes.trim()}`,
        ].filter(Boolean).join(' · ')
      : '';
    const fullComment = [banquetNote, comment.trim()].filter(Boolean).join('\n');

    setSubmitting(true);
    try {
      const booking = await api.createBooking({
        venueId,
        tableUnitId: selectedTable.id,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestCount: count,
        bookingDate: selectedDate,
        startTime: selectedSlot,
        comment: fullComment || undefined,
      });
      scheduleBookingReminder({
        bookingId: booking.id,
        venueName: venue?.name ?? '',
        bookingDate: selectedDate,
        startTime: selectedSlot,
      });
      Alert.alert(t('common.done'), t('venue.bookingCreatedMessage'), [
        { text: t('venue.goToMyBookings'), onPress: () => router.push('/(client)/bookings') },
      ]);
      setSelectedSlot(null);
      setComment('');
      setIsBanquet(false);
      setBanquetOccasion('');
      setBanquetWishes('');
      // The slot we just booked is no longer free — refresh so it disappears from the grid.
      if (selectedTable) loadSlots(selectedTable, selectedDate);
    } catch (e) {
      Alert.alert(t('venue.bookingFailedTitle'), api.extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !venue) return <LoadingView />;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.imageWrap}>
          {venue.coverPhotoUrl ? (
            <Image source={{ uri: venue.coverPhotoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
          <View style={styles.imageTopBar}>
            <TouchableOpacity style={styles.roundBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={20} color={colors.white} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity style={styles.roundBtn} onPress={shareVenue}>
                <Ionicons name="share-social-outline" size={19} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.roundBtn} onPress={toggleFavorite}>
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? colors.danger : colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ padding: spacing.lg }}>
          <Title>{venue.name}</Title>
          <Muted style={{ marginTop: 4 }}>
            {t(`venueType.${venue.type}`)} · {venue.city}{venue.district ? `, ${venue.district}` : ''}
            {venue.cuisine ? ` · ${venue.cuisine}` : ''}
          </Muted>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
            <Ionicons name="star" size={16} color={colors.gold} />
            <Text style={{ color: colors.text, marginLeft: 4, fontWeight: '700' }}>
              {venue.avgRating ? venue.avgRating.toFixed(1) : '—'}
            </Text>
            <Muted style={{ marginLeft: 4 }}>({venue.reviewsCount} {t('common.reviews')})</Muted>
          </View>

          {venue.description ? <Text style={styles.description}>{venue.description}</Text> : null}

          {venue.address ? (
            <TouchableOpacity
              style={styles.row}
              disabled={venue.latitude == null || venue.longitude == null}
              onPress={() => openInMaps(venue.latitude!, venue.longitude!, venue.name)}
            >
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Muted style={{ marginLeft: spacing.xs, flex: 1 }}>{venue.address}</Muted>
              {venue.latitude != null && venue.longitude != null && (
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{t('venue.mOpenInMaps')}</Text>
              )}
            </TouchableOpacity>
          ) : null}
          {venue.phone ? (
            <View style={styles.row}><Ionicons name="call-outline" size={16} color={colors.textMuted} /><Muted style={{ marginLeft: spacing.xs }}>{venue.phone}</Muted></View>
          ) : null}

          <SectionTitle>{t('venue.workingHours')}</SectionTitle>
          <Card>
            {venue.workingHours.map((d) => (
              <View key={d.dayOfWeek} style={styles.hourRow}>
                <Text style={{ color: colors.text, fontSize: 13 }}>{t(`weekdayShort.${d.dayOfWeek}`)}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                  {d.closed ? t('venue.closed') : `${d.openTime} – ${d.closeTime}`}
                </Text>
              </View>
            ))}
          </Card>

          {venue.menuItems.length > 0 && (
            <>
              <SectionTitle>{t('venue.menuTitle')}</SectionTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                {venue.menuItems.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.menuCard, item.signature && styles.menuCardSignature]}
                  >
                    <View style={styles.menuImageWrap}>
                      {item.photoUrl ? (
                        <Image source={{ uri: item.photoUrl }} style={styles.menuImage} />
                      ) : (
                        <View style={[styles.menuImage, { backgroundColor: colors.card }]} />
                      )}
                      <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>
                          {item.signature ? `★ ${t('venue.signatureDish')}` : item.category}
                        </Text>
                      </View>
                      <View style={[styles.menuBadge, { right: 8, left: undefined }]}>
                        <Text style={styles.menuBadgeText}>
                          {t('venue.menuPriceLabel', { value: item.priceSum.toLocaleString('ru-RU') })}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: colors.text, fontWeight: '700', marginTop: spacing.sm }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Muted style={{ marginTop: 2 }} numberOfLines={2}>{item.description}</Muted>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <SectionTitle>{t('venue.selectTable')}</SectionTitle>
          {venue.halls.length === 0 && <EmptyState text={t('venue.noTablesYet')} />}
          {venue.halls.map((hall) => (
            <View key={hall.id} style={{ marginBottom: spacing.md }}>
              <Label style={{ marginBottom: spacing.sm }}>{hall.name}</Label>
              {hall.tables.filter((tb) => tb.active).map((table) => (
                <TouchableOpacity
                  key={table.id}
                  onPress={() => pickTable(table)}
                  style={[styles.tableCard, selectedTable?.id === table.id && styles.tableCardActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{table.name}</Text>
                    <Muted style={{ marginTop: 2 }}>
                      {table.capacityMin}–{table.capacityMax} {t('common.guestsUnit')}
                    </Muted>
                  </View>
                  {selectedTable?.id === table.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {selectedTable && (
            <>
              <SectionTitle>{t('venue.selectDate')}</SectionTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                {next14Days.map((d) => {
                  const key = d.format('YYYY-MM-DD');
                  const active = key === selectedDate;
                  return (
                    <TouchableOpacity key={key} onPress={() => pickDate(key)} style={[styles.dateChip, active && styles.dateChipActive]}>
                      <Text style={{ color: active ? colors.white : colors.textFaint, fontSize: 11 }}>{d.format('dd')}</Text>
                      <Text style={{ color: active ? colors.white : colors.text, fontWeight: '700', fontSize: 15 }}>{d.format('D')}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <SectionTitle>{t('venue.freeTime')}</SectionTitle>
              {slotsLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
              ) : slots.length === 0 ? (
                <EmptyState text={t('venue.noSlots')} />
              ) : (
                <View style={styles.slotGrid}>
                  {slots.map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setSelectedSlot(s)}
                      style={[styles.slot, selectedSlot === s && styles.slotActive]}
                    >
                      <Text style={{ color: selectedSlot === s ? colors.white : colors.text, fontWeight: '600', fontSize: 13 }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedSlot && (
                <Card style={{ marginTop: spacing.lg }}>
                  <Subtitle style={{ marginBottom: spacing.md }}>{t('venue.bookingData')}</Subtitle>
                  <Input label={t('venue.guestNameLabel')} value={guestName} onChangeText={setGuestName} placeholder={t('venue.guestNamePlaceholder')} />
                  <Input label={t('auth.phone')} value={guestPhone} onChangeText={setGuestPhone} keyboardType="phone-pad" placeholder="+998901112233" />
                  <Input label={t('common.guests')} value={guestCount} onChangeText={setGuestCount} keyboardType="number-pad" />

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <View style={{ flex: 1, marginRight: spacing.md }}>
                      <Label>{t('venue.mBanquetToggleLabel')}</Label>
                      <Muted style={{ marginTop: 2 }}>{t('venue.mBanquetToggleHint')}</Muted>
                    </View>
                    <Switch value={isBanquet} onValueChange={setIsBanquet} trackColor={{ true: colors.primary }} />
                  </View>
                  {isBanquet && (
                    <>
                      <Input label={t('venue.mBanquetOccasionLabel')} value={banquetOccasion} onChangeText={setBanquetOccasion} placeholder={t('venue.mBanquetOccasionPlaceholder')} />
                      <Input label={t('venue.mBanquetWishesLabel')} value={banquetWishes} onChangeText={setBanquetWishes} multiline style={{ minHeight: 60, textAlignVertical: 'top' }} placeholder={t('venue.mBanquetWishesPlaceholder')} />
                    </>
                  )}

                  <Input label={t('venue.commentOptional')} value={comment} onChangeText={setComment} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
                  <Button title={t('venue.bookAtTime', { time: selectedSlot })} onPress={submitBooking} loading={submitting} />
                </Card>
              )}
            </>
          )}

          <SectionTitle>{t('venue.reviews')} ({reviews.length})</SectionTitle>
          {reviews.length === 0 && <EmptyState text={t('venue.noReviews')} />}
          {reviews.map((rv) => (
            <Card key={rv.id} style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{rv.clientName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="star" size={14} color={colors.gold} />
                  <Text style={{ color: colors.text, marginLeft: 4, fontWeight: '600' }}>{rv.rating}</Text>
                </View>
              </View>
              {rv.comment ? <Text style={{ color: colors.textMuted, marginTop: spacing.xs }}>{rv.comment}</Text> : null}
              {rv.adminReply ? (
                <View style={{ marginTop: spacing.sm, backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm }}>
                  <Label>{t('venue.venueReply')}</Label>
                  <Text style={{ color: colors.textMuted, marginTop: 2 }}>{rv.adminReply}</Text>
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.md }}>{children}</Text>;
}

const styles = StyleSheet.create({
  imageWrap: { height: 220, backgroundColor: colors.card },
  imageTopBar: {
    position: 'absolute', top: spacing.xl, left: spacing.lg, right: spacing.lg,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  roundBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.scrim,
    alignItems: 'center', justifyContent: 'center',
  },
  description: { color: colors.textMuted, marginTop: spacing.md, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  tableCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  tableCardActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
  dateChip: {
    width: 52, height: 60, borderRadius: radius.md, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  menuCard: {
    width: 160, marginRight: spacing.sm, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.md, padding: spacing.sm,
  },
  menuCardSignature: { borderColor: colors.gold, borderWidth: 2 },
  menuImageWrap: { height: 90, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.card },
  menuImage: { width: '100%', height: '100%' },
  menuBadge: {
    position: 'absolute', top: 6, left: 6, backgroundColor: colors.white,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  menuBadgeText: { fontSize: 10, fontWeight: '700', color: colors.text },
});
