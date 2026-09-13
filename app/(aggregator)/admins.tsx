import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { VenueAdminAccount, ChainVenue } from '@/lib/types';
import { Screen, Title, Muted, Card, Input, Button, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function VenueAdminsScreen() {
  const { t } = useTranslation();
  const [admins, setAdmins] = useState<VenueAdminAccount[]>([]);
  const [venues, setVenues] = useState<ChainVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [venueId, setVenueId] = useState<number | null>(null);
  const [phone, setPhone] = useState('+998');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    Promise.all([api.listVenueAdmins(), api.listChainVenues()])
      .then(([a, v]) => { setAdmins(a); setVenues(v); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function submit() {
    if (!venueId || !phone.trim() || !password.trim() || !fullName.trim()) {
      Alert.alert(t('common.fillFields'), t('aggregatorAdmins.mFillRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await api.createVenueAdmin({ venueId, phone: phone.trim(), password: password.trim(), fullName: fullName.trim(), email: email.trim() || undefined });
      setModalOpen(false);
      setPhone('+998'); setPassword(''); setFullName(''); setEmail(''); setVenueId(null);
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
      <View style={{ padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title>{t('aggregatorAdmins.title')}</Title>
        <TouchableOpacity onPress={() => setModalOpen(true)}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('common.addPrefix')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={admins}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: spacing.sm }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item.fullName}</Text>
            <Muted style={{ marginTop: 2 }}>{item.phone}</Muted>
            <Muted style={{ marginTop: 2 }}>{item.venueName}</Muted>
          </Card>
        )}
        ListEmptyComponent={<EmptyState text={t('aggregatorAdmins.mEmpty')} />}
      />

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.modalCard}>
            <Title style={{ marginBottom: spacing.lg }}>{t('aggregatorAdmins.mNewAdmin')}</Title>
            <Muted style={{ marginBottom: spacing.sm }}>{t('aggregatorAdmins.mVenueLabel')}</Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
              {venues.map((v) => (
                <TouchableOpacity key={v.id} onPress={() => setVenueId(v.id)} style={[styles.chip, venueId === v.id && styles.chipActive]}>
                  <Text style={{ color: venueId === v.id ? colors.white : colors.text, fontSize: 13, fontWeight: '600' }}>{v.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input label={t('aggregatorAdmins.mFullName')} value={fullName} onChangeText={setFullName} />
            <Input label={t('aggregatorAdmins.mPhone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Input label={t('aggregatorAdmins.mPassword')} value={password} onChangeText={setPassword} secureTextEntry />
            <Input label={t('aggregatorAdmins.mEmail')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Button title={t('aggregatorAdmins.mCreate')} onPress={submit} loading={submitting} />
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
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
