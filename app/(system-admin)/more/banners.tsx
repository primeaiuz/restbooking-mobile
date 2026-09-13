import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, ScrollView, Switch, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { Banner, AdminVenue } from '@/lib/types';
import { Screen, Title, Muted, Card, Input, Button, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

interface Draft {
  id?: number; venueId: number | null; title: string; subtitle: string; imageUrl: string; active: boolean; sortOrder: string;
}

export default function BannersScreen() {
  const { t } = useTranslation();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [venues, setVenues] = useState<AdminVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function load() {
    Promise.all([api.listAllBanners(), api.listAllVenues()])
      .then(([b, v]) => { setBanners(b); setVenues(v); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('systemAdminBanners.mNoAccessTitle'), t('systemAdminBanners.mNoAccessMessage'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(true);
    try {
      const url = await api.uploadImageAsync(res.assets[0].uri);
      setDraft((d) => d && { ...d, imageUrl: url });
    } catch (e) {
      Alert.alert(t('systemAdminBanners.mUploadErrorTitle'), api.extractErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!draft?.venueId || !draft.title.trim() || !draft.imageUrl) {
      Alert.alert(t('common.fillFields'), t('systemAdminBanners.mFillRequired'));
      return;
    }
    setSaving(true);
    try {
      const req = {
        venueId: draft.venueId, title: draft.title.trim(), subtitle: draft.subtitle.trim() || undefined,
        imageUrl: draft.imageUrl, active: draft.active, sortOrder: Number(draft.sortOrder) || 0,
      };
      if (draft.id) await api.updateBanner(draft.id, req);
      else await api.createBanner(req);
      setDraft(null);
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(id: number) {
    Alert.alert(t('systemAdminBanners.mDeleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await api.deleteBanner(id); load(); } catch (e) { Alert.alert(t('common.error'), api.extractErrorMessage(e)); } } },
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
          <Title>{t('systemAdminBanners.title')}</Title>
        </View>
        <TouchableOpacity onPress={() => setDraft({ venueId: null, title: '', subtitle: '', imageUrl: '', active: true, sortOrder: '0' })}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('systemAdminBanners.mAddButton')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={banners}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md, flexDirection: 'row' }}>
            <Image source={{ uri: item.imageUrl }} style={{ width: 64, height: 64, borderRadius: radius.sm, marginRight: spacing.md }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.title}</Text>
              <Muted style={{ marginTop: 2 }}>{item.venueName} · {item.active ? t('common.active') : t('common.inactive')}</Muted>
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                <TouchableOpacity onPress={() => setDraft({
                  id: item.id, venueId: item.venueId, title: item.title, subtitle: item.subtitle ?? '',
                  imageUrl: item.imageUrl, active: item.active, sortOrder: String(item.sortOrder),
                })}>
                  <Ionicons name="pencil" size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={<EmptyState text={t('systemAdminBanners.mEmpty')} />}
      />

      <Modal visible={!!draft} transparent animationType="slide" onRequestClose={() => setDraft(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard}>
            <Title style={{ marginBottom: spacing.lg }}>{draft?.id ? t('systemAdminBanners.mEditBanner') : t('systemAdminBanners.mNewBanner')}</Title>

            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
              {draft?.imageUrl ? <Image source={{ uri: draft.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
              <View style={styles.imageOverlay}>
                <Text style={{ color: colors.white }}>{uploading ? t('common.uploading') : t('systemAdminBanners.mSelectImage')}</Text>
              </View>
            </TouchableOpacity>

            <Muted style={{ marginBottom: spacing.sm }}>{t('systemAdminBanners.mVenueLabel')}</Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
              {venues.map((v) => (
                <TouchableOpacity key={v.id} onPress={() => setDraft((d) => d && { ...d, venueId: v.id })} style={[styles.chip, draft?.venueId === v.id && styles.chipActive]}>
                  <Text style={{ color: draft?.venueId === v.id ? colors.white : colors.text, fontSize: 12 }}>{v.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label={t('systemAdminBanners.mTitleLabel')} value={draft?.title ?? ''} onChangeText={(v) => setDraft((d) => d && { ...d, title: v })} />
            <Input label={t('systemAdminBanners.mSubtitleLabel')} value={draft?.subtitle ?? ''} onChangeText={(v) => setDraft((d) => d && { ...d, subtitle: v })} />
            <Input label={t('systemAdminBanners.mSortOrder')} value={draft?.sortOrder ?? '0'} onChangeText={(v) => setDraft((d) => d && { ...d, sortOrder: v })} keyboardType="number-pad" />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Muted>{t('systemAdminBanners.mActive')}</Muted>
              <Switch value={draft?.active ?? true} onValueChange={(v) => setDraft((d) => d && { ...d, active: v })} trackColor={{ true: colors.primary }} />
            </View>
            <Button title={t('systemAdminBanners.mSaveButton')} onPress={save} loading={saving} />
            <Button title={t('systemAdminBanners.mCancelButton')} variant="ghost" onPress={() => setDraft(null)} style={{ marginTop: spacing.sm, marginBottom: spacing.xl }} />
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '88%' },
  imagePicker: { height: 120, borderRadius: radius.lg, backgroundColor: colors.card, marginBottom: spacing.lg, overflow: 'hidden' },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.scrim, alignItems: 'center' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
