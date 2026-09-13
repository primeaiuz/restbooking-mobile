import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, ScrollView, Switch, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { TariffPlan, BillingPeriod } from '@/lib/types';
import { Screen, Title, Muted, Card, Input, Button, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

interface Draft {
  id?: number; name: string; price: string; billingPeriod: BillingPeriod; description: string; active: boolean; sortOrder: string;
}

export default function TariffsScreen() {
  const { t } = useTranslation();
  const [tariffs, setTariffs] = useState<TariffPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.listAllTariffs().then(setTariffs).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function save() {
    if (!draft?.name.trim()) return;
    setSaving(true);
    try {
      const req = {
        name: draft.name.trim(), price: Number(draft.price) || 0, billingPeriod: draft.billingPeriod,
        description: draft.description.trim() || undefined, active: draft.active, sortOrder: Number(draft.sortOrder) || 0,
      };
      if (draft.id) await api.updateTariff(draft.id, req);
      else await api.createTariff(req);
      setDraft(null);
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(id: number) {
    Alert.alert(t('systemAdminTariffs.mDeleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await api.deleteTariff(id); load(); } catch (e) { Alert.alert(t('common.error'), api.extractErrorMessage(e)); } } },
    ]);
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Title>{t('systemAdminTariffs.title')}</Title>
        </View>
        <TouchableOpacity onPress={() => setDraft({ name: '', price: '', billingPeriod: 'MONTHLY', description: '', active: true, sortOrder: '0' })}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('systemAdminTariffs.mAddButton')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={tariffs}
        keyExtractor={(tf) => String(tf.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <TouchableOpacity onPress={() => setDraft({
                  id: item.id, name: item.name, price: String(item.price), billingPeriod: item.billingPeriod,
                  description: item.description ?? '', active: item.active, sortOrder: String(item.sortOrder),
                })}>
                  <Ionicons name="pencil" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
            <Muted style={{ marginTop: 4 }}>
              {item.price.toLocaleString('ru-RU')} {t('systemAdminTariffs.currency')} / {item.billingPeriod === 'MONTHLY' ? t('systemAdminTariffs.mPerMonth') : t('systemAdminTariffs.mPerYear')} · {item.active ? t('common.active') : t('common.inactive')}
            </Muted>
            {item.description ? <Muted style={{ marginTop: 4 }}>{item.description}</Muted> : null}
          </Card>
        )}
        ListEmptyComponent={<EmptyState text={t('systemAdminTariffs.mEmpty')} />}
      />

      <Modal visible={!!draft} transparent animationType="slide" onRequestClose={() => setDraft(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard}>
            <Title style={{ marginBottom: spacing.lg }}>{draft?.id ? t('systemAdminTariffs.mEditTariff') : t('systemAdminTariffs.mNewTariff')}</Title>
            <Input label={t('systemAdminTariffs.mNameLabel')} value={draft?.name ?? ''} onChangeText={(v) => setDraft((d) => d && { ...d, name: v })} />
            <Input label={t('systemAdminTariffs.mPriceLabel')} value={draft?.price ?? ''} onChangeText={(v) => setDraft((d) => d && { ...d, price: v })} keyboardType="number-pad" />
            <Muted style={{ marginBottom: spacing.sm }}>{t('systemAdminTariffs.mBillingPeriod')}</Muted>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
              <TouchableOpacity onPress={() => setDraft((d) => d && { ...d, billingPeriod: 'MONTHLY' })} style={[styles.chip, draft?.billingPeriod === 'MONTHLY' && styles.chipActive]}>
                <Text style={{ color: draft?.billingPeriod === 'MONTHLY' ? colors.white : colors.text }}>{t('systemAdminTariffs.mMonthly')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDraft((d) => d && { ...d, billingPeriod: 'YEARLY' })} style={[styles.chip, draft?.billingPeriod === 'YEARLY' && styles.chipActive]}>
                <Text style={{ color: draft?.billingPeriod === 'YEARLY' ? colors.white : colors.text }}>{t('systemAdminTariffs.mYearly')}</Text>
              </TouchableOpacity>
            </View>
            <Input label={t('systemAdminTariffs.mDescriptionLabel')} value={draft?.description ?? ''} onChangeText={(v) => setDraft((d) => d && { ...d, description: v })} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
            <Input label={t('systemAdminTariffs.mSortOrder')} value={draft?.sortOrder ?? '0'} onChangeText={(v) => setDraft((d) => d && { ...d, sortOrder: v })} keyboardType="number-pad" />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Muted>{t('systemAdminTariffs.mActive')}</Muted>
              <Switch value={draft?.active ?? true} onValueChange={(v) => setDraft((d) => d && { ...d, active: v })} trackColor={{ true: colors.primary }} />
            </View>
            <Button title={t('systemAdminTariffs.mSaveButton')} onPress={save} loading={saving} />
            <Button title={t('systemAdminTariffs.mCancelButton')} variant="ghost" onPress={() => setDraft(null)} style={{ marginTop: spacing.sm, marginBottom: spacing.xl }} />
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '88%' },
  chip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
