import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { ChainSummary } from '@/lib/types';
import { Screen, Title, Muted, Card, Input, Button, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function ChainsScreen() {
  const { t } = useTranslation();
  const [chains, setChains] = useState<ChainSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [adminPhone, setAdminPhone] = useState('+998');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.listAllChains().then(setChains).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function submit() {
    if (!name.trim() || !adminPhone.trim() || !adminPassword.trim() || !adminFullName.trim()) {
      Alert.alert(t('common.fillFields'), t('systemAdminChains.mFillRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await api.createChain({
        name: name.trim(), adminPhone: adminPhone.trim(), adminPassword: adminPassword.trim(),
        adminFullName: adminFullName.trim(), adminEmail: adminEmail.trim() || undefined,
      });
      setModalOpen(false);
      setName(''); setAdminPhone('+998'); setAdminPassword(''); setAdminFullName(''); setAdminEmail('');
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Title>{t('systemAdminChains.title')}</Title>
        </View>
        <TouchableOpacity onPress={() => setModalOpen(true)}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('common.createPrefix')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={chains}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.sm }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
            <Muted style={{ marginTop: 2 }}>{t('systemAdminChains.mVenueCount', { count: item.venueCount })}</Muted>
          </Card>
        )}
        ListEmptyComponent={<EmptyState text={t('systemAdminChains.mEmpty')} />}
      />

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard}>
            <Title style={{ marginBottom: spacing.lg }}>{t('systemAdminChains.mNewChain')}</Title>
            <Input label={t('systemAdminChains.mChainNameLabel')} value={name} onChangeText={setName} />
            <Muted style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>{t('systemAdminChains.mFirstAdmin')}</Muted>
            <Input label={t('systemAdminChains.mAdminName')} value={adminFullName} onChangeText={setAdminFullName} />
            <Input label={t('systemAdminChains.mPhone')} value={adminPhone} onChangeText={setAdminPhone} keyboardType="phone-pad" />
            <Input label={t('systemAdminChains.mPassword')} value={adminPassword} onChangeText={setAdminPassword} secureTextEntry />
            <Input label={t('systemAdminChains.mEmail')} value={adminEmail} onChangeText={setAdminEmail} keyboardType="email-address" autoCapitalize="none" />
            <Button title={t('systemAdminChains.mCreateChain')} onPress={submit} loading={submitting} />
            <Button title={t('common.cancel')} variant="ghost" onPress={() => setModalOpen(false)} style={{ marginTop: spacing.sm, marginBottom: spacing.xl }} />
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, maxHeight: '85%' },
});
