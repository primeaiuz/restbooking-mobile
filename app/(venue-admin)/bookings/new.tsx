import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { TableUnit } from '@/lib/types';
import { Screen, Title, Muted, Input, Button, LoadingView } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

export default function NewBookingScreen() {
  const { t } = useTranslation();
  const [tables, setTables] = useState<TableUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableId, setTableId] = useState<number | null>(null);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [time, setTime] = useState('19:00');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCount, setGuestCount] = useState('2');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.listTables().then((t) => { setTables(t.filter((x) => x.active)); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const next14Days = Array.from({ length: 14 }, (_, i) => dayjs().add(i, 'day'));

  async function submit() {
    if (!tableId || !guestName.trim() || !guestPhone.trim() || !time) {
      Alert.alert(t('common.fillFields'), t('adminBookings.mFillRequired'));
      return;
    }
    const count = Number(guestCount) || 1;
    const table = tables.find((tbl) => tbl.id === tableId);
    if (table && (count < table.capacityMin || count > table.capacityMax)) {
      Alert.alert(
        t('venue.invalidTitle'),
        t('adminBookings.mCapacityError', { min: table.capacityMin, max: table.capacityMax }),
      );
      return;
    }
    setSubmitting(true);
    try {
      await api.createManualBooking({
        tableUnitId: tableId, guestName: guestName.trim(), guestPhone: guestPhone.trim(),
        guestCount: count, bookingDate: date, startTime: time, comment: comment.trim() || undefined,
      });
      Alert.alert(t('common.done'), t('adminBookings.mCreatedMessage'), [{ text: t('common.ok'), onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Title style={{ marginBottom: spacing.lg }}>{t('adminBookings.mNewManualTitle')}</Title>

        <Muted style={{ marginBottom: spacing.sm }}>{t('adminBookings.mTableLabel')}</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
          {tables.map((tbl) => (
            <TouchableOpacity key={tbl.id} onPress={() => setTableId(tbl.id)} style={[styles.chip, tableId === tbl.id && styles.chipActive]}>
              <Text style={{ color: tableId === tbl.id ? colors.white : colors.text, fontWeight: '600', fontSize: 13 }}>{tbl.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Muted style={{ marginBottom: spacing.sm }}>{t('adminBookings.mDateLabel')}</Muted>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: spacing.lg }}>
          {next14Days.map((d) => {
            const key = d.format('YYYY-MM-DD');
            const active = key === date;
            return (
              <TouchableOpacity key={key} onPress={() => setDate(key)} style={[styles.dateChip, active && styles.chipActive]}>
                <Text style={{ color: active ? colors.white : colors.textFaint, fontSize: 11 }}>{d.format('dd')}</Text>
                <Text style={{ color: active ? colors.white : colors.text, fontWeight: '700' }}>{d.format('D')}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Input label={t('adminBookings.mTimeLabel')} value={time} onChangeText={setTime} placeholder="19:00" />
        <Input label={t('adminBookings.mGuestNameLabel')} value={guestName} onChangeText={setGuestName} />
        <Input label={t('adminBookings.mGuestPhoneLabel')} value={guestPhone} onChangeText={setGuestPhone} keyboardType="phone-pad" />
        <Input label={t('adminBookings.mGuestCountLabel')} value={guestCount} onChangeText={setGuestCount} keyboardType="number-pad" />
        <Input label={t('adminBookings.mCommentLabel')} value={comment} onChangeText={setComment} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
        <Button title={t('adminBookings.mCreateButton')} onPress={submit} loading={submitting} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateChip: { width: 52, height: 60, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
});
