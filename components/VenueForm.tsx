import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { VenueType } from '@/lib/types';
import { Input, Button, Muted } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';
import type { CreateVenueRequest } from '@/lib/api';

const TYPES: VenueType[] = ['RESTAURANT', 'TEAHOUSE', 'CAFE'];

export function VenueForm({ onSubmit, submitting }: { onSubmit: (req: CreateVenueRequest) => void; submitting: boolean }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState<VenueType>('RESTAURANT');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');

  function submit() {
    if (!name.trim() || !city.trim()) return;
    onSubmit({
      name: name.trim(), type, city: city.trim(), district: district.trim() || undefined,
      address: address.trim() || undefined, cuisine: cuisine.trim() || undefined,
      phone: phone.trim() || undefined, description: description.trim() || undefined,
    });
  }

  return (
    <View>
      <Input label={t('venueForm.name')} value={name} onChangeText={setName} />
      <Muted style={{ marginBottom: spacing.sm }}>{t('venueForm.type')}</Muted>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
        {TYPES.map((vt) => (
          <TouchableOpacity key={vt} onPress={() => setType(vt)} style={[styles.chip, type === vt && styles.chipActive]}>
            <Text style={{ color: type === vt ? colors.white : colors.text, fontWeight: '600', fontSize: 13 }}>{t(`venueType.${vt}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}><Input label={t('venueForm.city')} value={city} onChangeText={setCity} /></View>
        <View style={{ flex: 1 }}><Input label={t('venueForm.district')} value={district} onChangeText={setDistrict} /></View>
      </View>
      <Input label={t('venueForm.address')} value={address} onChangeText={setAddress} />
      <Input label={t('venueForm.cuisine')} value={cuisine} onChangeText={setCuisine} />
      <Input label={t('venueForm.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input label={t('venueForm.description')} value={description} onChangeText={setDescription} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
      <Button title={t('venueForm.submit')} onPress={submit} loading={submitting} />
    </View>
  );
}

const styles = {
  chip: { paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1 as const, borderColor: colors.cardBorder },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
};
