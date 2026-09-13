import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, ScrollView, Switch, StyleSheet } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { AdminVenue, ChainSummary, TariffPlan } from '@/lib/types';
import { Screen, Title, Muted, Card, Badge, Button, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing, statusColor } from '@/lib/theme';

export default function AllVenuesScreen() {
  const { t } = useTranslation();
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [chains, setChains] = useState<ChainSummary[]>([]);
  const [tariffs, setTariffs] = useState<TariffPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AdminVenue | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [v, c, t] = await Promise.all([api.listAllVenues(), api.listAllChains(), api.listAllTariffs()]);
      setVenues(v); setChains(c); setTariffs(t);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function moderate(status: 'APPROVED' | 'REJECTED') {
    if (!detail) return;
    setBusy(true);
    try {
      await api.moderateVenue(detail.id, status);
      setDetail(null);
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    if (!detail) return;
    setBusy(true);
    try {
      await api.setVenueActiveAnywhere(detail.id, !detail.active);
      setDetail((d) => d && { ...d, active: !d.active });
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function assignChain(chainId: number | null) {
    if (!detail) return;
    setBusy(true);
    try {
      await api.assignVenueChain(detail.id, chainId);
      setDetail(null);
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function assignTariff(tariffId: number | null) {
    if (!detail) return;
    setBusy(true);
    try {
      await api.assignVenueTariff(detail.id, tariffId);
      setDetail(null);
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title>{t('systemAdminVenues.title')}</Title>
        <TouchableOpacity onPress={() => router.push('/(system-admin)/venues/new')}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('common.addPrefix')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={venues}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setDetail(item)} activeOpacity={0.8}>
            <Card style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{item.name}</Text>
                <Badge text={t(`moderation.${item.moderationStatus}`)} color={statusColor[item.moderationStatus] ?? colors.textMuted} />
              </View>
              <Muted style={{ marginTop: 2 }}>{t(`venueType.${item.type}`)} · {item.city}</Muted>
              <Muted style={{ marginTop: 2 }}>
                {item.chainName ?? t('systemAdminVenues.mIndependent')} · {item.tariffPlanName ?? t('systemAdminVenues.mNoTariff')} · {item.active ? t('common.active') : t('common.inactive')}
              </Muted>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState text={t('systemAdminVenues.mEmpty')} />}
      />

      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard}>
            <Title style={{ marginBottom: spacing.xs }}>{detail?.name}</Title>
            <Muted style={{ marginBottom: spacing.lg }}>{detail && t(`venueType.${detail.type}`)} · {detail?.city}</Muted>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.sectionLabel}>{t('systemAdminVenues.mModerationTitle')}</Text>
              {detail && <Badge text={t(`moderation.${detail.moderationStatus}`)} color={statusColor[detail.moderationStatus] ?? colors.textMuted} />}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
              <Button
                title={t('systemAdminVenues.mApprove')}
                small
                onPress={() => moderate('APPROVED')}
                loading={busy}
                disabled={detail?.moderationStatus === 'APPROVED'}
              />
              <Button
                title={t('systemAdminVenues.mReject')}
                small
                variant="danger"
                onPress={() => moderate('REJECTED')}
                loading={busy}
                disabled={detail?.moderationStatus === 'REJECTED'}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={styles.sectionLabel}>{t('systemAdminVenues.mActiveTitle')}</Text>
              <Switch value={detail?.active ?? false} onValueChange={toggleActive} trackColor={{ true: colors.primary }} />
            </View>

            <Text style={styles.sectionLabel}>{t('systemAdminVenues.mChainTitle')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
              <TouchableOpacity onPress={() => assignChain(null)} style={[styles.chip, !detail?.chainId && styles.chipActive]}>
                <Text style={{ color: !detail?.chainId ? colors.white : colors.text, fontSize: 12 }}>{t('systemAdminVenues.mIndependent')}</Text>
              </TouchableOpacity>
              {chains.map((c) => (
                <TouchableOpacity key={c.id} onPress={() => assignChain(c.id)} style={[styles.chip, detail?.chainId === c.id && styles.chipActive]}>
                  <Text style={{ color: detail?.chainId === c.id ? colors.white : colors.text, fontSize: 12 }}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>{t('systemAdminVenues.mTariffTitle')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl }}>
              <TouchableOpacity onPress={() => assignTariff(null)} style={[styles.chip, !detail?.tariffPlanId && styles.chipActive]}>
                <Text style={{ color: !detail?.tariffPlanId ? colors.white : colors.text, fontSize: 12 }}>{t('systemAdminVenues.mNoTariff')}</Text>
              </TouchableOpacity>
              {tariffs.map((tf) => (
                <TouchableOpacity key={tf.id} onPress={() => assignTariff(tf.id)} style={[styles.chip, detail?.tariffPlanId === tf.id && styles.chipActive]}>
                  <Text style={{ color: detail?.tariffPlanId === tf.id ? colors.white : colors.text, fontSize: 12 }}>{tf.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title={t('systemAdminVenues.mCloseButton')} variant="ghost" onPress={() => setDetail(null)} style={{ marginBottom: spacing.xl }} />
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '85%' },
  sectionLabel: { color: colors.textFaint, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
