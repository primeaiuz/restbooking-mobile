import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, StyleSheet } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { cancelReminder } from '@/lib/reminders';
import type { Booking } from '@/lib/types';
import { Screen, Title, Muted, Badge, EmptyState, LoadingView, Card, Button, Input } from '@/components/UI';
import { colors, spacing, statusColor } from '@/lib/theme';

// Encoded into the check-in QR code so venue staff can scan a CONFIRMED booking
// and mark it complete without typing anything — see app/(venue-admin)/bookings/scan.tsx.
export function bookingQrPayload(b: Pick<Booking, 'id' | 'venueId'>) {
  return JSON.stringify({ type: 'restbooking-checkin', bookingId: b.id, venueId: b.venueId });
}

// The backend doesn't tell us whether a booking already has a review attached,
// so we track submitted-review booking ids locally to avoid offering a second
// review for the same booking (the server would just reject the duplicate).
const REVIEWED_KEY = 'restbooking_reviewed_booking_ids';

export default function MyBookingsScreen() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set());
  const [reviewFor, setReviewFor] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [qrFor, setQrFor] = useState<Booking | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(REVIEWED_KEY).then((raw) => {
      if (raw) {
        try { setReviewedIds(new Set(JSON.parse(raw))); } catch { /* ignore */ }
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.myBookings();
      data.sort((a, b) => dayjs(`${b.bookingDate}T${b.startTime}`).unix() - dayjs(`${a.bookingDate}T${a.startTime}`).unix());
      setBookings(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmCancel(b: Booking) {
    Alert.alert(t('myBookings.mCancelTitle'), `${b.venueName} · ${b.bookingDate} ${b.startTime}`, [
      { text: t('myBookings.mDontCancel'), style: 'cancel' },
      {
        text: t('common.cancel'), style: 'destructive', onPress: async () => {
          try {
            await api.cancelBooking(b.id);
            cancelReminder(b.id);
            load();
          } catch (e) {
            Alert.alert(t('common.error'), api.extractErrorMessage(e));
          }
        },
      },
    ]);
  }

  // "Rebook" pre-fills a new booking on the same venue with the same guest details —
  // there's no dedicated backend endpoint for this, we just deep-link into the venue
  // page with query params it already knows how to read.
  function rebook(b: Booking) {
    router.push({
      pathname: '/(client)/catalog/[id]',
      params: { id: String(b.venueId), prefillName: b.guestName, prefillPhone: b.guestPhone, prefillGuests: String(b.guestCount) },
    });
  }

  // "Reschedule" has no dedicated backend endpoint either — we cancel the existing
  // booking with a clear reason and drop the user back on the venue page to pick a
  // new date/time, pre-filled with the same guest details.
  function confirmReschedule(b: Booking) {
    Alert.alert(t('myBookings.mRescheduleTitle'), t('myBookings.mRescheduleMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('myBookings.mRescheduleConfirmButton'),
        onPress: async () => {
          try {
            await api.cancelBooking(b.id, t('myBookings.mRescheduleReason'));
            cancelReminder(b.id);
            rebook(b);
          } catch (e) {
            Alert.alert(t('common.error'), api.extractErrorMessage(e));
          }
        },
      },
    ]);
  }

  async function submitReview() {
    if (!reviewFor) return;
    setSubmitting(true);
    try {
      await api.createReview(reviewFor.id, rating, comment.trim() || undefined);
      const next = new Set(reviewedIds);
      next.add(reviewFor.id);
      setReviewedIds(next);
      AsyncStorage.setItem(REVIEWED_KEY, JSON.stringify(Array.from(next))).catch(() => {});
      setReviewFor(null);
      setComment('');
      setRating(5);
      Alert.alert(t('myBookings.mReviewThanksTitle'), t('myBookings.mReviewSentMessage'));
    } catch (e) {
      Alert.alert(t('myBookings.mReviewFailedTitle'), api.extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Title>{t('myBookings.title')}</Title>
      </View>
      <FlatList
        data={bookings}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, flex: 1 }}>{item.venueName}</Text>
              <Badge text={t(`status.${item.status}`)} color={statusColor[item.status] ?? colors.textMuted} />
            </View>
            <Muted style={{ marginTop: spacing.xs }}>{item.tableUnitName} · {item.guestCount} {t('common.guestsUnit')}</Muted>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Muted style={{ marginLeft: 6 }}>{item.bookingDate} · {item.startTime}–{item.endTime}</Muted>
            </View>
            {item.comment ? <Muted style={{ marginTop: spacing.xs }}>«{item.comment}»</Muted> : null}
            {(item.status === 'DECLINED' || item.status === 'CANCELLED') && item.cancelReason ? (
              <View style={{ marginTop: spacing.sm, backgroundColor: colors.bg, borderRadius: 10, padding: spacing.sm }}>
                <Text style={{ color: colors.textFaint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                  {t(item.status === 'DECLINED' ? 'myBookings.mDeclineReasonLabel' : 'myBookings.mCancelReasonLabel')}
                </Text>
                <Muted style={{ marginTop: 2 }}>{item.cancelReason}</Muted>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
              {item.status === 'CONFIRMED' && (
                <Button title={t('myBookings.mShowQr')} variant="accent" small onPress={() => setQrFor(item)} />
              )}
              {(item.status === 'PENDING' || item.status === 'CONFIRMED') && (
                <Button title={t('myBookings.mRescheduleButton')} variant="secondary" small onPress={() => confirmReschedule(item)} />
              )}
              {(item.status === 'PENDING' || item.status === 'CONFIRMED') && (
                <Button title={t('myBookings.cancelButton')} variant="secondary" small onPress={() => confirmCancel(item)} />
              )}
              {item.status === 'COMPLETED' && !reviewedIds.has(item.id) && (
                <Button title={t('myBookings.reviewButton')} variant="secondary" small onPress={() => setReviewFor(item)} />
              )}
              {(item.status === 'COMPLETED' || item.status === 'CANCELLED' || item.status === 'DECLINED' || item.status === 'NO_SHOW') && (
                <Button title={t('myBookings.mRebookButton')} variant="ghost" small onPress={() => rebook(item)} />
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={<EmptyState text={t('myBookings.empty')} />}
      />

      <Modal visible={!!reviewFor} transparent animationType="slide" onRequestClose={() => setReviewFor(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Title style={{ marginBottom: spacing.md }}>{t('myBookings.mReviewTitle')}</Title>
            <Muted style={{ marginBottom: spacing.md }}>{reviewFor?.venueName}</Muted>
            <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={30} color={colors.gold} style={{ marginRight: 6 }} />
                </TouchableOpacity>
              ))}
            </View>
            <Input placeholder={t('myBookings.reviewCommentPlaceholder')} value={comment} onChangeText={setComment} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
            <Button title={t('myBookings.mSend')} onPress={submitReview} loading={submitting} />
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setReviewFor(null)} style={{ marginTop: spacing.sm }} />
          </View>
        </View>
      </Modal>

      <Modal visible={!!qrFor} transparent animationType="slide" onRequestClose={() => setQrFor(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Title style={{ marginBottom: spacing.xs, textAlign: 'center' }}>{t('myBookings.mQrTitle')}</Title>
            <Muted style={{ marginBottom: spacing.lg, textAlign: 'center' }}>{qrFor?.venueName}</Muted>
            {qrFor && (
              <View style={{ alignItems: 'center', backgroundColor: colors.white, padding: spacing.lg, borderRadius: 16, alignSelf: 'center' }}>
                <QRCode value={bookingQrPayload(qrFor)} size={220} />
              </View>
            )}
            <Muted style={{ marginTop: spacing.lg, textAlign: 'center' }}>{t('myBookings.mQrHint')}</Muted>
            <Button title={t('common.close')} variant="ghost" onPress={() => setQrFor(null)} style={{ marginTop: spacing.lg }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl },
});
