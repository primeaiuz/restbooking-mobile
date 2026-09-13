import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { TelegramLinkInfo } from '@/lib/types';
import { Screen, Title, Muted, Card, Button, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function TelegramScreen() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<TelegramLinkInfo | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    api.getTelegramLink().then(setInfo).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function disconnect() {
    try {
      await api.disconnectTelegram();
      load();
    } catch (e) {
      Alert.alert(t('common.error'), api.extractErrorMessage(e));
    }
  }

  function confirmDisconnect() {
    Alert.alert(t('telegram.disconnect'), t('telegram.mDisconnectConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: disconnect },
    ]);
  }

  if (loading || !info) return <LoadingView />;

  return (
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Title>{t('mTelegramAdmin.title')}</Title>
      </View>
      <View style={{ padding: spacing.lg, paddingTop: 0 }}>
        <Card>
          {!info.botConfigured ? (
            <Muted>{t('telegram.mNotConfigured')}</Muted>
          ) : info.connected ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={{ color: colors.text, marginLeft: spacing.sm, fontWeight: '700' }}>{t('telegram.mConnected')}</Text>
              </View>
              <Muted style={{ marginBottom: spacing.lg }}>{t('telegram.mConnectedHint')}</Muted>
              <Button title={t('telegram.disconnect')} variant="danger" onPress={confirmDisconnect} />
            </>
          ) : (
            <>
              <Muted style={{ marginBottom: spacing.lg }}>{t('telegram.mConnectHint')}</Muted>
              {info.deepLink && <Button title={t('telegram.mOpenBot')} onPress={() => Linking.openURL(info.deepLink!)} />}
            </>
          )}
        </Card>
      </View>
    </Screen>
  );
}
