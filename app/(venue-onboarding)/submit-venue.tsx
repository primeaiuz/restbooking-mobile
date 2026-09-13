import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { extractErrorMessage } from '@/lib/api';
import { Screen, Title, Muted, Input, Button, Pill } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';
import type { VenueType } from '@/lib/types';

const VENUE_TYPES: VenueType[] = ['RESTAURANT', 'CAFE', 'TEAHOUSE'];

export default function SubmitVenueScreen() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<VenueType>('RESTAURANT');
  const [city, setCity] = useState('Ташкент');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !city.trim()) {
      Alert.alert(t('common.fillFields'), t('venueOnboarding.mRequiredFields'));
      return;
    }
    setSubmitting(true);
    try {
      await api.submitVenue({
        name: name.trim(),
        type,
        city: city.trim(),
        district: district.trim() || undefined,
        address: address.trim() || undefined,
        cuisine: cuisine.trim() || undefined,
        phone: phone.trim() || undefined,
        description: description.trim() || undefined,
      });
      // The submitted venue's id is now on the user's own account (see backend
      // submitOwnVenue) — refresh the cached user so (venue-admin)/_layout.tsx's
      // venueId check picks it up and routes to the pending-review screen next.
      await refreshUser();
      router.replace('/(venue-onboarding)/pending');
    } catch (e) {
      Alert.alert(t('venueOnboarding.mSubmitFailedTitle'), extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
          <Title style={{ marginBottom: spacing.xs }}>{t('venueOnboarding.title')}</Title>
          <Muted style={{ marginBottom: spacing.lg }}>{t('venueOnboarding.subtitle')}</Muted>

          <Input label={`${t('venueOnboarding.nameLabel')} *`} value={name} onChangeText={setName} placeholder={t('venueOnboarding.namePlaceholder')} />

          <Muted style={{ marginTop: spacing.xs, marginBottom: spacing.xs }}>{t('venueOnboarding.typeLabel')}</Muted>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' }}>
            {VENUE_TYPES.map((vt) => (
              <Pill key={vt} label={t(`venueType.${vt}`)} active={type === vt} onPress={() => setType(vt)} />
            ))}
          </View>

          <Input label={`${t('venueOnboarding.cityLabel')} *`} value={city} onChangeText={setCity} />
          <Input label={t('venueOnboarding.districtLabel')} value={district} onChangeText={setDistrict} />
          <Input label={t('venueOnboarding.addressLabel')} value={address} onChangeText={setAddress} />
          <Input label={t('venueOnboarding.cuisineLabel')} value={cuisine} onChangeText={setCuisine} placeholder={t('venueOnboarding.cuisinePlaceholder')} />
          <Input label={t('auth.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+998901112233" />
          <Input
            label={t('venueOnboarding.descriptionLabel')}
            value={description}
            onChangeText={setDescription}
            multiline
            style={{ minHeight: 80, textAlignVertical: 'top' }}
            placeholder={t('venueOnboarding.descriptionPlaceholder')}
          />

          <Button title={t('venueOnboarding.submitButton')} onPress={handleSubmit} loading={submitting} style={{ marginTop: spacing.lg }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
