import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { StopListEntry } from '@/lib/types';
import { Screen, Title, Muted, Card, Input, Button, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function StopListScreen() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<StopListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(''); // optional — fills a whole date range at once (vacation, renovation, etc.)
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    api.listStopList().then(setEntries).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []);

  // dayjs's strict-format parsing needs the customParseFormat plugin, which isn't
  // loaded elsewhere in this app — a plain regex + calendar-validity check is enough
  // here and avoids adding a new dayjs plugin dependency just for this screen.
  function parseStrictDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = dayjs(value);
    return d.isValid() && d.format('YYYY-MM-DD') === value ? d : null;
  }

  async function add() {
    const start = parseStrictDate(date);
    if (!start) {
      Alert.alert(t('common.error'), t('mStopList.mInvalidDate'));
      return;
    }
    let end = start;
    if (endDate.trim()) {
      const parsedEnd = parseStrictDate(endDate);
      if (!parsedEnd) {
        Alert.alert(t('common.error'), t('mStopList.mInvalidDate'));
        return;
      }
      end = parsedEnd;
      if (end.isBefore(start)) {
        Alert.alert(t('common.error'), t('mStopList.mRangeOrderError'));
        return;
      }
      if (end.diff(start, 'day') > 90) {
        Alert.alert(t('common.error'), t('mStopList.mRangeTooLong'));
        return;
      }
    }

    const dates: string[] = [];
    for (let d = start; d.isSame(end) || d.isBefore(end); d = d.add(1, 'day')) {
      dates.push(d.format('YYYY-MM-DD'));
    }

    setSaving(true);
    try {
      const results = await Promise.allSettled(dates.map((d) => api.addStopListEntry(d, reason.trim() || undefined)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      setReason('');
      setEndDate('');
      load();
      if (failed > 0) {
        Alert.alert(t('common.error'), t('mStopList.mPartialFailure', { failed, total: dates.length }));
      }
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function remove(id: number) {
    Alert.alert(t('mStopList.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await api.deleteStopListEntry(id); load(); } catch (e) { Alert.alert(t('common.error'), api.extractErrorMessage(e)); } } },
    ]);
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Title>{t('mStopList.title')}</Title>
      </View>
      <Muted style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        {t('mStopList.hint')}
      </Muted>

      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <Input label={t('mStopList.dateLabel')} value={date} onChangeText={setDate} placeholder="ГГГГ-ММ-ДД" />
        <Input label={t('mStopList.endDateLabel')} value={endDate} onChangeText={setEndDate} placeholder="ГГГГ-ММ-ДД" />
        <Input label={t('mStopList.reasonLabel')} value={reason} onChangeText={setReason} />
        <Button title={t('mStopList.addButton')} onPress={add} loading={saving} small style={{ alignSelf: 'flex-start' }} />
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.date}</Text>
              {item.reason ? <Muted style={{ marginTop: 2 }}>{item.reason}</Muted> : null}
            </View>
            <TouchableOpacity onPress={() => remove(item.id)}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </Card>
        )}
        ListEmptyComponent={<EmptyState text={t('mStopList.empty')} />}
      />
    </Screen>
  );
}
