import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, StyleSheet, Switch, Image } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { MenuItem } from '@/lib/types';
import { Screen, Title, Muted, Card, Button, Input, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

interface MenuItemFormState {
  id?: number;
  category: string;
  name: string;
  description: string;
  priceSum: string;
  photoUrl: string;
  signature: boolean;
}

const EMPTY_FORM: MenuItemFormState = { category: '', name: '', description: '', priceSum: '', photoUrl: '', signature: false };

export default function MenuScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<MenuItemFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api.listMenuItems());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('adminMenu.mNoAccessTitle'), t('adminMenu.mNoAccessMessage'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(true);
    try {
      const url = await api.uploadImageAsync(res.assets[0].uri);
      setModal((m) => m && { ...m, photoUrl: url });
    } catch (e) {
      Alert.alert(t('adminMenu.mUploadErrorTitle'), api.extractErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function saveItem() {
    if (!modal?.name.trim() || !modal?.category.trim()) return;
    setSaving(true);
    try {
      const req: api.MenuItemRequest = {
        category: modal.category.trim(),
        name: modal.name.trim(),
        description: modal.description.trim() || undefined,
        priceSum: Number(modal.priceSum) || 0,
        photoUrl: modal.photoUrl || undefined,
        signature: modal.signature,
        sortOrder: 0,
      };
      if (modal.id) await api.updateMenuItem(modal.id, req);
      else await api.createMenuItem(req);
      setModal(null);
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(id: number) {
    Alert.alert(t('adminMenu.mDeleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await api.deleteMenuItem(id); load(); } catch (e) { Alert.alert(t('common.error'), api.extractErrorMessage(e)); } } },
    ]);
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <Title>{t('adminMenu.title')}</Title>
          <TouchableOpacity onPress={() => setModal({ ...EMPTY_FORM })}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>+ {t('adminMenu.addItemButton')}</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 && <EmptyState text={t('adminMenu.mNoItemsYet')} />}

        {items.map((item) => (
          <Card key={item.id} style={{ marginBottom: spacing.md, flexDirection: 'row', gap: spacing.md }}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, { backgroundColor: colors.bg }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {item.signature && <Text style={{ color: colors.gold }}>★ </Text>}
                {item.name}
              </Text>
              <Muted style={{ marginTop: 2 }}>
                {item.category} · {t('venue.menuPriceLabel', { value: item.priceSum.toLocaleString('ru-RU') })}
              </Muted>
            </View>
            <View style={{ gap: spacing.md, justifyContent: 'center' }}>
              <TouchableOpacity onPress={() => setModal({
                id: item.id, category: item.category, name: item.name,
                description: item.description ?? '', priceSum: String(item.priceSum),
                photoUrl: item.photoUrl ?? '', signature: item.signature,
              })}>
                <Ionicons name="pencil" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>

      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard}>
            <Title style={{ marginBottom: spacing.lg }}>{modal?.id ? t('adminMenu.editItem') : t('adminMenu.addItem')}</Title>

            <TouchableOpacity onPress={pickPhoto} style={styles.photoPicker} disabled={uploading}>
              {modal?.photoUrl ? (
                <Image source={{ uri: modal.photoUrl }} style={styles.photoPreview} />
              ) : (
                <Ionicons name={uploading ? 'hourglass-outline' : 'camera-outline'} size={28} color={colors.textMuted} />
              )}
            </TouchableOpacity>

            <Input label={t('adminMenu.categoryPlaceholder')} value={modal?.category ?? ''} onChangeText={(v) => setModal((m) => m && { ...m, category: v })} />
            <Input label={t('adminMenu.namePlaceholder')} value={modal?.name ?? ''} onChangeText={(v) => setModal((m) => m && { ...m, name: v })} />
            <Input label={t('adminMenu.pricePlaceholder')} value={modal?.priceSum ?? ''} onChangeText={(v) => setModal((m) => m && { ...m, priceSum: v })} keyboardType="number-pad" />
            <Input
              label={t('adminMenu.descriptionPlaceholder')}
              value={modal?.description ?? ''}
              onChangeText={(v) => setModal((m) => m && { ...m, description: v })}
              multiline
              style={{ minHeight: 70, textAlignVertical: 'top' }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.lg }}>
              <Muted>{t('adminMenu.signature')}</Muted>
              <Switch value={modal?.signature ?? false} onValueChange={(v) => setModal((m) => m && { ...m, signature: v })} trackColor={{ true: colors.primary }} />
            </View>

            <Button title={t('adminMenu.saveItem')} onPress={saveItem} loading={saving} />
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setModal(null)} style={{ marginTop: spacing.sm, marginBottom: spacing.xl }} />
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 56, height: 56, borderRadius: radius.sm },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '85%' },
  photoPicker: {
    height: 100, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
});
