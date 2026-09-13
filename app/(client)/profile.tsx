import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, Linking, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { authStore } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import i18n from '@/lib/i18n';
import { isBiometricSupported, isBiometricLockEnabled, setBiometricLockEnabled, promptBiometricUnlock } from '@/lib/biometricLock';
import { Screen, Title, Muted, Card, Button, Pill } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

const PRIVACY_POLICY_URL = 'https://restbooking.uz/privacy';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [lang, setLang] = useState<'ru' | 'uz' | 'en'>(
    user?.preferredLanguage === 'uz' ? 'uz' : user?.preferredLanguage === 'en' ? 'en' : 'ru',
  );
  const [savingLang, setSavingLang] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    isBiometricSupported().then(setBioSupported);
    isBiometricLockEnabled().then(setBioEnabled);
  }, []);

  async function toggleBiometric(next: boolean) {
    if (next) {
      // Require a successful biometric check before turning the lock on — otherwise
      // someone could enable a lock they can't actually pass and get stuck out.
      const ok = await promptBiometricUnlock(t('biometric.mPromptReason'));
      if (!ok) return;
    }
    setBioEnabled(next);
    await setBiometricLockEnabled(next);
  }

  async function changeLanguage(l: 'ru' | 'uz' | 'en') {
    setLang(l);
    i18n.changeLanguage(l);
    setSavingLang(true);
    try {
      await api.updateLanguage(l);
      await authStore.setPreferredLanguage(l);
    } catch {
      // non-critical
    } finally {
      setSavingLang(false);
    }
  }

  function handleLogout() {
    Alert.alert(t('common.logoutConfirmTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.logout'), style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(t('profile.mDeleteAccountConfirmTitle'), t('profile.mDeleteAccountConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.mDeleteAccountConfirmButton'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await api.deleteMyAccount();
            await logout();
            router.replace('/(auth)/login');
          } catch (e) {
            Alert.alert(t('common.error'), api.extractErrorMessage(e));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Title style={{ marginBottom: spacing.lg }}>{t('profile.title')}</Title>

        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.white, fontWeight: '800', fontSize: 20 }}>{user?.fullName?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View style={{ marginLeft: spacing.md }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{user?.fullName}</Text>
              <Muted>{user?.phone}</Muted>
            </View>
          </View>
          {user?.email ? <Muted style={{ marginTop: spacing.md }}>{user.email}</Muted> : null}
        </Card>

        <Text style={{ color: colors.textFaint, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.sm }}>{t('profile.languageLabel')}</Text>
        <View style={{ flexDirection: 'row', marginBottom: spacing.xl }}>
          <Pill label="Русский" active={lang === 'ru'} onPress={() => changeLanguage('ru')} />
          <Pill label="O'zbekcha" active={lang === 'uz'} onPress={() => changeLanguage('uz')} />
          <Pill label="English" active={lang === 'en'} onPress={() => changeLanguage('en')} />
        </View>

        {bioSupported && (
          <Card style={{ marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t('biometric.mToggleLabel')}</Text>
              <Muted style={{ marginTop: 2 }}>{t('biometric.mToggleHint')}</Muted>
            </View>
            <Switch value={bioEnabled} onValueChange={toggleBiometric} trackColor={{ true: colors.primary }} />
          </Card>
        )}

        <Button title={t('profile.mReferralButton')} onPress={() => router.push('/(client)/referral')} style={{ marginBottom: spacing.md }} />
        <Button title={t('profile.articlesButton')} variant="secondary" onPress={() => router.push('/(client)/articles')} style={{ marginBottom: spacing.md }} />
        <Button title={t('profile.mPrivacyPolicyButton')} variant="secondary" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} style={{ marginBottom: spacing.md }} />
        <Button title={t('profile.logoutButton')} variant="danger" onPress={handleLogout} style={{ marginBottom: spacing.md }} />
        <Button title={t('profile.mDeleteAccountButton')} variant="ghost" onPress={handleDeleteAccount} loading={deleting} />
      </ScrollView>
    </Screen>
  );
}
