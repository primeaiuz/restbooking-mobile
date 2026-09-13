import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { VenueDetail, DaySchedule, ConfirmationMode } from '@/lib/types';
import { Screen, Title, Muted, Input, Button, LoadingView, Label } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

export default function VenueSettingsScreen() {
  const { t } = useTranslation();
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [phone, setPhone] = useState('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | undefined>(undefined);
  const [workingHours, setWorkingHours] = useState<DaySchedule[]>([]);
  const [confirmationMode, setConfirmationMode] = useState<ConfirmationMode>('AUTO');
  const [confirmationTimeoutMinutes, setConfirmationTimeoutMinutes] = useState('30');
  const [cancellationCutoffHours, setCancellationCutoffHours] = useState('2');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState('90');
  const [eveningStartTime, setEveningStartTime] = useState('18:00');
  const [eveningSlotDurationMinutes, setEveningSlotDurationMinutes] = useState('120');
  const [bufferMinutes, setBufferMinutes] = useState('15');
  const [active, setActive] = useState(true);

  useEffect(() => {
    api.getMyVenue().then((v) => {
      setVenue(v);
      setName(v.name); setDescription(v.description ?? ''); setCity(v.city);
      setDistrict(v.district ?? ''); setAddress(v.address ?? ''); setCuisine(v.cuisine ?? '');
      setPhone(v.phone ?? ''); setCoverPhotoUrl(v.coverPhotoUrl ?? undefined);
      setWorkingHours(v.workingHours);
      setConfirmationMode(v.confirmationMode);
      setConfirmationTimeoutMinutes(String(v.confirmationTimeoutMinutes));
      setCancellationCutoffHours(String(v.cancellationCutoffHours));
      setSlotDurationMinutes(String(v.slotDurationMinutes));
      setEveningStartTime(v.eveningStartTime);
      setEveningSlotDurationMinutes(String(v.eveningSlotDurationMinutes));
      setBufferMinutes(String(v.bufferMinutes));
      setActive(v.active);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function updateDay(idx: number, patch: Partial<DaySchedule>) {
    setWorkingHours((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  async function pickCoverPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('adminVenueSettings.mNoAccessTitle'), t('adminVenueSettings.mNoAccessMessage'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(true);
    try {
      const url = await api.uploadImageAsync(res.assets[0].uri);
      setCoverPhotoUrl(url);
    } catch (e) {
      Alert.alert(t('adminVenueSettings.mUploadErrorTitle'), api.extractErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!venue) return;
    setSaving(true);
    try {
      await api.updateMyVenue({
        name: name.trim(), description: description.trim() || undefined, city: city.trim(),
        district: district.trim() || undefined, address: address.trim() || undefined,
        cuisine: cuisine.trim() || undefined, phone: phone.trim() || undefined,
        coverPhotoUrl, photos: venue.photos, workingHours,
        confirmationMode, confirmationTimeoutMinutes: Number(confirmationTimeoutMinutes) || 30,
        cancellationCutoffHours: Number(cancellationCutoffHours) || 2,
        slotDurationMinutes: Number(slotDurationMinutes) || 90,
        eveningStartTime, eveningSlotDurationMinutes: Number(eveningSlotDurationMinutes) || 120,
        bufferMinutes: Number(bufferMinutes) || 15, active,
      });
      Alert.alert(t('common.done'), t('adminVenueSettings.saved'));
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !venue) return <LoadingView />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Title>{t('adminVenueSettings.title')}</Title>
        </View>

        <TouchableOpacity onPress={pickCoverPhoto} style={styles.photoWrap}>
          {coverPhotoUrl ? <Image source={{ uri: coverPhotoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          <View style={styles.photoOverlay}>
            {uploading ? <Text style={{ color: colors.white }}>{t('common.uploading')}</Text> : (
              <>
                <Ionicons name="camera-outline" size={20} color={colors.white} />
                <Text style={{ color: colors.white, marginLeft: 6 }}>{t('adminVenueSettings.mChangeCover')}</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <Input label={t('adminVenueSettings.name')} value={name} onChangeText={setName} />
        <Input label={t('adminVenueSettings.description')} value={description} onChangeText={setDescription} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}><Input label={t('adminVenueSettings.city')} value={city} onChangeText={setCity} /></View>
          <View style={{ flex: 1 }}><Input label={t('adminVenueSettings.district')} value={district} onChangeText={setDistrict} /></View>
        </View>
        <Input label={t('adminVenueSettings.address')} value={address} onChangeText={setAddress} />
        <Input label={t('adminVenueSettings.cuisine')} value={cuisine} onChangeText={setCuisine} />
        <Input label={t('adminVenueSettings.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
          <Label>{t('adminVenueSettings.mActiveLabel')}</Label>
          <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.primary }} />
        </View>

        <Text style={styles.sectionTitle}>{t('adminVenueSettings.workingHours')}</Text>
        {workingHours.map((d, idx) => (
          <View key={d.dayOfWeek} style={styles.dayRow}>
            <Text style={{ color: colors.text, width: 32, fontWeight: '600' }}>{t(`weekdayShort.${d.dayOfWeek}`)}</Text>
            {!d.closed ? (
              <>
                <Input value={d.openTime ?? ''} onChangeText={(v) => updateDay(idx, { openTime: v })} placeholder="09:00" style={{ flex: 1, marginBottom: 0, marginRight: spacing.sm }} />
                <Input value={d.closeTime ?? ''} onChangeText={(v) => updateDay(idx, { closeTime: v })} placeholder="23:00" style={{ flex: 1, marginBottom: 0, marginRight: spacing.sm }} />
              </>
            ) : (
              <Muted style={{ flex: 1 }}>{t('venue.closed')}</Muted>
            )}
            <Switch value={!d.closed} onValueChange={(v) => updateDay(idx, { closed: !v })} trackColor={{ true: colors.primary }} />
          </View>
        ))}

        <Text style={styles.sectionTitle}>{t('adminVenueSettings.mBookingRulesTitle')}</Text>
        <Muted style={{ marginBottom: spacing.sm }}>{t('adminVenueSettings.mConfirmationModeLabel')}</Muted>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <TouchableOpacity onPress={() => setConfirmationMode('AUTO')} style={[styles.modeChip, confirmationMode === 'AUTO' && styles.modeChipActive]}>
            <Text style={{ color: confirmationMode === 'AUTO' ? colors.white : colors.text, fontWeight: '600' }}>{t('adminVenueSettings.mConfirmationAuto')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setConfirmationMode('MANUAL')} style={[styles.modeChip, confirmationMode === 'MANUAL' && styles.modeChipActive]}>
            <Text style={{ color: confirmationMode === 'MANUAL' ? colors.white : colors.text, fontWeight: '600' }}>{t('adminVenueSettings.mConfirmationManual')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}><Input label={t('adminVenueSettings.mTimeoutMinutes')} value={confirmationTimeoutMinutes} onChangeText={setConfirmationTimeoutMinutes} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Input label={t('adminVenueSettings.mCancelHours')} value={cancellationCutoffHours} onChangeText={setCancellationCutoffHours} keyboardType="number-pad" /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}><Input label={t('adminVenueSettings.mDayDuration')} value={slotDurationMinutes} onChangeText={setSlotDurationMinutes} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Input label={t('adminVenueSettings.mBuffer')} value={bufferMinutes} onChangeText={setBufferMinutes} keyboardType="number-pad" /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}><Input label={t('adminVenueSettings.mEveningStart')} value={eveningStartTime} onChangeText={setEveningStartTime} placeholder="18:00" /></View>
          <View style={{ flex: 1 }}><Input label={t('adminVenueSettings.mEveningDuration')} value={eveningSlotDurationMinutes} onChangeText={setEveningSlotDurationMinutes} keyboardType="number-pad" /></View>
        </View>

        <Button title={t('adminVenueSettings.saveButton')} onPress={save} loading={saving} style={{ marginTop: spacing.lg }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoWrap: { height: 140, borderRadius: radius.lg, backgroundColor: colors.card, marginBottom: spacing.lg, overflow: 'hidden' },
  photoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.scrim, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 16, marginTop: spacing.lg, marginBottom: spacing.md },
  dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  modeChip: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' },
  modeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
