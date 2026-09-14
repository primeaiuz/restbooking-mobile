import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, ScrollView, Switch, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { Article, ArticleCategory } from '@/lib/types';
import { Screen, Title, Muted, Card, Input, Button, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

interface Draft {
  id?: number; title: string; coverImageUrl: string; categoryId: number | null; content: string; published: boolean;
}

export default function ArticlesAdminScreen() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [catModalOpen, setCatModalOpen] = useState(false);

  function load() {
    Promise.all([api.listAllArticles(), api.listAllArticleCategories()])
      .then(([a, c]) => { setArticles(a); setCategories(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('systemAdminArticles.mNoAccessTitle'), t('systemAdminArticles.mNoAccessMessage'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(true);
    try {
      const url = await api.uploadImageAsync(res.assets[0].uri);
      setDraft((d) => d && { ...d, coverImageUrl: url });
    } catch (e) {
      Alert.alert(t('systemAdminArticles.mUploadErrorTitle'), api.extractErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!draft?.title.trim() || !draft.content.trim()) {
      Alert.alert(t('common.fillFields'), t('systemAdminArticles.mFillRequired'));
      return;
    }
    setSaving(true);
    try {
      const req = {
        title: draft.title.trim(), coverImageUrl: draft.coverImageUrl || undefined,
        categoryId: draft.categoryId, content: draft.content.trim(), published: draft.published,
      };
      if (draft.id) await api.updateArticle(draft.id, req);
      else await api.createArticle(req);
      setDraft(null);
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(id: number) {
    Alert.alert(t('systemAdminArticles.mDeleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await api.deleteArticle(id); load(); } catch (e) { Alert.alert(t('common.error'), api.extractErrorMessage(e)); } } },
    ]);
  }

  async function addCategory() {
    if (!newCategory.trim()) return;
    try {
      await api.createArticleCategory(newCategory.trim());
      setNewCategory('');
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    }
  }

  function confirmDeleteCategory(id: number) {
    Alert.alert(t('systemAdminArticles.mDeleteCategoryConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await api.deleteArticleCategory(id); load(); } catch (e) { Alert.alert(t('common.error'), api.extractErrorMessage(e)); } } },
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
          <Title>{t('systemAdminArticles.title')}</Title>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.lg }}>
          <TouchableOpacity onPress={() => setCatModalOpen(true)}>
            <Text style={{ color: colors.textMuted, fontWeight: '700' }}>{t('systemAdminArticles.mCategoriesButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDraft({ title: '', coverImageUrl: '', categoryId: null, content: '', published: false })}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('systemAdminArticles.mAddButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={articles}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.md, flexDirection: 'row' }}>
            {item.coverImageUrl ? <Image source={{ uri: api.resolveImageUrl(item.coverImageUrl) }} style={{ width: 56, height: 56, borderRadius: radius.sm, marginRight: spacing.md }} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{item.title}</Text>
              <Muted style={{ marginTop: 2 }}>{item.categoryName ?? t('systemAdminArticles.mNoCategory')} · {item.published ? t('systemAdminArticles.mPublishedStatus') : t('systemAdminArticles.mDraft')}</Muted>
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                <TouchableOpacity onPress={() => setDraft({
                  id: item.id, title: item.title, coverImageUrl: item.coverImageUrl ?? '',
                  categoryId: item.categoryId, content: item.content, published: item.published,
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
        ListEmptyComponent={<EmptyState text={t('systemAdminArticles.mEmpty')} />}
      />

      <Modal visible={!!draft} transparent animationType="slide" onRequestClose={() => setDraft(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard}>
            <Title style={{ marginBottom: spacing.lg }}>{draft?.id ? t('systemAdminArticles.mEditArticle') : t('systemAdminArticles.mNewArticle')}</Title>
            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
              {draft?.coverImageUrl ? <Image source={{ uri: api.resolveImageUrl(draft.coverImageUrl) }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
              <View style={styles.imageOverlay}><Text style={{ color: colors.white }}>{uploading ? t('common.uploading') : t('systemAdminArticles.mCoverLabel')}</Text></View>
            </TouchableOpacity>
            <Input label={t('systemAdminArticles.mTitleLabel')} value={draft?.title ?? ''} onChangeText={(v) => setDraft((d) => d && { ...d, title: v })} />
            <Muted style={{ marginBottom: spacing.sm }}>{t('systemAdminArticles.mCategoryLabel')}</Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
              <TouchableOpacity onPress={() => setDraft((d) => d && { ...d, categoryId: null })} style={[styles.chip, !draft?.categoryId && styles.chipActive]}>
                <Text style={{ color: !draft?.categoryId ? colors.white : colors.text, fontSize: 12 }}>{t('systemAdminArticles.mNoCategory')}</Text>
              </TouchableOpacity>
              {categories.map((c) => (
                <TouchableOpacity key={c.id} onPress={() => setDraft((d) => d && { ...d, categoryId: c.id })} style={[styles.chip, draft?.categoryId === c.id && styles.chipActive]}>
                  <Text style={{ color: draft?.categoryId === c.id ? colors.white : colors.text, fontSize: 12 }}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input label={t('systemAdminArticles.mContentLabel')} value={draft?.content ?? ''} onChangeText={(v) => setDraft((d) => d && { ...d, content: v })} multiline style={{ minHeight: 140, textAlignVertical: 'top' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Muted>{t('systemAdminArticles.mPublished')}</Muted>
              <Switch value={draft?.published ?? false} onValueChange={(v) => setDraft((d) => d && { ...d, published: v })} trackColor={{ true: colors.primary }} />
            </View>
            <Button title={t('systemAdminArticles.mSaveButton')} onPress={save} loading={saving} />
            <Button title={t('systemAdminArticles.mCancelButton')} variant="ghost" onPress={() => setDraft(null)} style={{ marginTop: spacing.sm, marginBottom: spacing.xl }} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={catModalOpen} transparent animationType="slide" onRequestClose={() => setCatModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard}>
            <Title style={{ marginBottom: spacing.lg }}>{t('systemAdminArticles.mCategoriesTitle')}</Title>
            {categories.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
                <Text style={{ color: colors.text }}>{c.name}</Text>
                <TouchableOpacity onPress={() => confirmDeleteCategory(c.id)}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.xl }}>
              <Input value={newCategory} onChangeText={setNewCategory} placeholder={t('systemAdminArticles.mNewCategoryPlaceholder')} style={{ flex: 1, marginBottom: 0 }} />
              <Button title={t('common.add')} small onPress={addCategory} />
            </View>
            <Button title={t('systemAdminArticles.mCloseButton')} variant="ghost" onPress={() => setCatModalOpen(false)} style={{ marginBottom: spacing.xl }} />
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
