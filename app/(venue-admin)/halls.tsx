import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, StyleSheet, Switch } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { Hall, TableUnit, TableZoneType } from '@/lib/types';
import { TABLE_ZONE_TYPES } from '@/lib/types';
import { Screen, Title, Muted, Card, Button, Input, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

export default function HallsScreen() {
  const { t } = useTranslation();
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [hallModal, setHallModal] = useState<{ id?: number; name: string; description: string } | null>(null);
  const [tableModal, setTableModal] = useState<{
    id?: number; hallId: number; name: string; description: string;
    zoneType: TableZoneType; capacityMin: string; capacityMax: string; active: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setHalls(await api.listHalls());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function saveHall() {
    if (!hallModal?.name.trim()) return;
    setSaving(true);
    try {
      if (hallModal.id) await api.updateHall(hallModal.id, hallModal.name.trim(), hallModal.description.trim() || undefined);
      else await api.createHall(hallModal.name.trim(), hallModal.description.trim() || undefined);
      setHallModal(null);
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteHall(id: number) {
    Alert.alert(t('adminHallsTables.mDeleteHallConfirm'), t('adminHallsTables.mDeleteHallHint'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await api.deleteHall(id); load(); } catch (e) { Alert.alert(t('common.error'), api.extractErrorMessage(e)); } } },
    ]);
  }

  async function saveTable() {
    if (!tableModal?.name.trim()) return;
    setSaving(true);
    try {
      const req = {
        hallId: tableModal.hallId, name: tableModal.name.trim(),
        description: tableModal.description.trim() || undefined,
        zoneType: tableModal.zoneType,
        capacityMin: Number(tableModal.capacityMin) || 1,
        capacityMax: Number(tableModal.capacityMax) || 1,
        photos: [], active: tableModal.active,
      };
      if (tableModal.id) await api.updateTable(tableModal.id, req);
      else await api.createTable(req);
      setTableModal(null);
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteTable(id: number) {
    Alert.alert(t('adminHallsTables.mDeleteTableConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await api.deleteTable(id); load(); } catch (e) { Alert.alert(t('common.error'), api.extractErrorMessage(e)); } } },
    ]);
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <Title>{t('adminHallsTables.title')}</Title>
          <TouchableOpacity onPress={() => setHallModal({ name: '', description: '' })}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>+ {t('adminHallsTables.mNewHall')}</Text>
          </TouchableOpacity>
        </View>

        {halls.length === 0 && <EmptyState text={t('adminHallsTables.mNoHallsYet')} />}

        {halls.map((hall) => (
          <Card key={hall.id} style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{hall.name}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <TouchableOpacity onPress={() => setHallModal({ id: hall.id, name: hall.name, description: hall.description ?? '' })}>
                  <Ionicons name="pencil" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDeleteHall(hall.id)}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
            {hall.description ? <Muted style={{ marginTop: 4 }}>{hall.description}</Muted> : null}

            {hall.tables.map((tbl) => (
              <View key={tbl.id} style={styles.tableRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{tbl.name} {!tbl.active && <Text style={{ color: colors.textFaint }}>{t('adminHallsTables.mHidden')}</Text>}</Text>
                  <Muted style={{ marginTop: 2 }}>{t(`zoneType.${tbl.zoneType}`)} · {tbl.capacityMin}–{tbl.capacityMax} {t('common.guestsUnit')}</Muted>
                </View>
                <TouchableOpacity onPress={() => setTableModal({
                  id: tbl.id, hallId: hall.id, name: tbl.name, description: tbl.description ?? '',
                  zoneType: tbl.zoneType, capacityMin: String(tbl.capacityMin), capacityMax: String(tbl.capacityMax), active: tbl.active,
                })}>
                  <Ionicons name="pencil" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDeleteTable(tbl.id)} style={{ marginLeft: spacing.md }}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}

            <Button
              title={t('adminHallsTables.mAddTable')}
              variant="secondary"
              small
              onPress={() => setTableModal({ hallId: hall.id, name: '', description: '', zoneType: 'STANDARD', capacityMin: '2', capacityMax: '4', active: true })}
              style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
            />
          </Card>
        ))}
      </ScrollView>

      <Modal visible={!!hallModal} transparent animationType="slide" onRequestClose={() => setHallModal(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Title style={{ marginBottom: spacing.lg }}>{hallModal?.id ? t('adminHallsTables.mEditHall') : t('adminHallsTables.mNewHall')}</Title>
            <Input label={t('adminVenueSettings.name')} value={hallModal?.name ?? ''} onChangeText={(v) => setHallModal((m) => m && { ...m, name: v })} />
            <Input label={t('adminVenueSettings.description')} value={hallModal?.description ?? ''} onChangeText={(v) => setHallModal((m) => m && { ...m, description: v })} />
            <Button title={t('common.save')} onPress={saveHall} loading={saving} />
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setHallModal(null)} style={{ marginTop: spacing.sm }} />
          </View>
        </View>
      </Modal>

      <Modal visible={!!tableModal} transparent animationType="slide" onRequestClose={() => setTableModal(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard}>
            <Title style={{ marginBottom: spacing.lg }}>{tableModal?.id ? t('adminHallsTables.mEditTable') : t('adminHallsTables.mNewTable')}</Title>
            <Input label={t('adminVenueSettings.name')} value={tableModal?.name ?? ''} onChangeText={(v) => setTableModal((m) => m && { ...m, name: v })} />
            <Muted style={{ marginBottom: spacing.sm }}>{t('adminHallsTables.mZoneType')}</Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
              {TABLE_ZONE_TYPES.map((z) => (
                <TouchableOpacity
                  key={z}
                  onPress={() => setTableModal((m) => m && { ...m, zoneType: z })}
                  style={[styles.zoneChip, tableModal?.zoneType === z && styles.zoneChipActive]}
                >
                  <Text style={{ color: tableModal?.zoneType === z ? colors.white : colors.text, fontSize: 12, fontWeight: '600' }}>{t(`zoneType.${z}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input label={t('adminHallsTables.mMinGuests')} value={tableModal?.capacityMin ?? ''} onChangeText={(v) => setTableModal((m) => m && { ...m, capacityMin: v })} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label={t('adminHallsTables.mMaxGuests')} value={tableModal?.capacityMax ?? ''} onChangeText={(v) => setTableModal((m) => m && { ...m, capacityMax: v })} keyboardType="number-pad" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Muted>{t('adminHallsTables.mActiveVisible')}</Muted>
              <Switch value={tableModal?.active ?? true} onValueChange={(v) => setTableModal((m) => m && { ...m, active: v })} trackColor={{ true: colors.primary }} />
            </View>
            <Button title={t('common.save')} onPress={saveTable} loading={saving} />
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setTableModal(null)} style={{ marginTop: spacing.sm, marginBottom: spacing.xl }} />
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.cardBorder, marginTop: spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '85%' },
  zoneChip: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  zoneChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
