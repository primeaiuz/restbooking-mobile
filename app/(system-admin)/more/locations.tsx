import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { City, District } from '@/lib/types';
import { Screen, Title, Muted, Card, Input, Button, EmptyState, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function LocationsScreen() {
  const { t } = useTranslation();
  const [cities, setCities] = useState<City[]>([]);
  const [districtsByCity, setDistrictsByCity] = useState<Record<number, District[]>>({});
  const [loading, setLoading] = useState(true);
  const [newCity, setNewCity] = useState('');
  const [newDistrictName, setNewDistrictName] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load() {
    try {
      const c = await api.listCities();
      setCities(c);
      const entries = await Promise.all(c.map(async (city) => [city.id, await api.listDistricts(city.id)] as const));
      setDistrictsByCity(Object.fromEntries(entries));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function addCity() {
    if (!newCity.trim()) return;
    try {
      await api.createCity(newCity.trim());
      setNewCity('');
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    }
  }

  function confirmDeleteCity(id: number) {
    Alert.alert(t('systemAdminLocations.mDeleteCityConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await api.deleteCity(id); load(); } catch (e) { Alert.alert(t('common.error'), api.extractErrorMessage(e)); } } },
    ]);
  }

  async function addDistrict(cityId: number) {
    const name = (newDistrictName[cityId] ?? '').trim();
    if (!name) return;
    try {
      await api.createDistrict(cityId, name);
      setNewDistrictName((prev) => ({ ...prev, [cityId]: '' }));
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    }
  }

  function confirmDeleteDistrict(id: number) {
    Alert.alert(t('systemAdminLocations.mDeleteDistrictConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { try { await api.deleteDistrict(id); load(); } catch (e) { Alert.alert(t('common.error'), api.extractErrorMessage(e)); } } },
    ]);
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Title>{t('systemAdminLocations.title')}</Title>
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <Input value={newCity} onChangeText={setNewCity} placeholder={t('systemAdminLocations.mNewCityPlaceholder')} style={{ flex: 1, marginBottom: 0 }} />
          <Button title={t('systemAdminLocations.mAddButton')} small onPress={addCity} />
        </View>

        {cities.length === 0 && <EmptyState text={t('systemAdminLocations.mNoCities')} />}

        {cities.map((city) => (
          <Card key={city.id} style={{ marginBottom: spacing.md }}>
            <TouchableOpacity onPress={() => setExpanded(expanded === city.id ? null : city.id)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{city.name}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => confirmDeleteCity(city.id)}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
                <Ionicons name={expanded === city.id ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>

            {expanded === city.id && (
              <View style={{ marginTop: spacing.md }}>
                {(districtsByCity[city.id] ?? []).map((d) => (
                  <View key={d.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                    <Muted>{d.name}</Muted>
                    <TouchableOpacity onPress={() => confirmDeleteDistrict(d.id)}>
                      <Ionicons name="close" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  <Input
                    value={newDistrictName[city.id] ?? ''}
                    onChangeText={(v) => setNewDistrictName((prev) => ({ ...prev, [city.id]: v }))}
                    placeholder={t('systemAdminLocations.mNewDistrictPlaceholder')}
                    style={{ flex: 1, marginBottom: 0 }}
                  />
                  <Button title="+" small onPress={() => addDistrict(city.id)} />
                </View>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
