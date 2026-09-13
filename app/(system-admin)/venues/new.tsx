import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { CreateVenueRequest } from '@/lib/api';
import { Screen, Title, Muted } from '@/components/UI';
import { VenueForm } from '@/components/VenueForm';
import { colors, spacing } from '@/lib/theme';

export default function NewIndependentVenueScreen() {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  async function submit(req: CreateVenueRequest) {
    setSubmitting(true);
    try {
      await api.createIndependentVenue(req);
      Alert.alert(t('common.done'), t('mNewVenue.createdIndependent'), [{ text: t('common.ok'), onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Title>{t('mNewVenue.titleIndependent')}</Title>
        </View>
        <Muted style={{ marginBottom: spacing.lg, marginLeft: 34 }}>{t('mNewVenue.independentHint')}</Muted>
        <VenueForm onSubmit={submit} submitting={submitting} />
      </ScrollView>
    </Screen>
  );
}
