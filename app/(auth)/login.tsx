import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth, homeRouteForRole } from '@/lib/auth-context';
import { extractErrorMessage } from '@/lib/api';
import { Screen, Title, Muted, Input, Button } from '@/components/UI';
import { colors, spacing, fonts } from '@/lib/theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [phone, setPhone] = useState('+998');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!phone || !password) {
      Alert.alert(t('common.fillFields'), t('auth.mFillPhonePassword'));
      return;
    }
    setLoading(true);
    try {
      const user = await login(phone.trim(), password);
      router.replace(homeRouteForRole(user.role) as any);
    } catch (e) {
      Alert.alert(t('auth.mLoginFailedTitle'), extractErrorMessage(e, t('auth.mCheckPhonePassword')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl }}>
          <View style={{ marginBottom: spacing.xxl, alignItems: 'center' }}>
            <Text style={{ fontSize: 30, fontFamily: fonts.display, color: colors.text }}>RestBooking</Text>
            <Muted style={{ marginTop: spacing.xs }}>{t('auth.mTagline')}</Muted>
          </View>
          <Title style={{ marginBottom: spacing.lg }}>{t('auth.loginTitle')}</Title>
          <Input
            label={t('auth.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            placeholder="+998901112233"
          />
          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="••••••••"
          />
          <Button title={t('auth.loginButton')} onPress={handleLogin} loading={loading} style={{ marginTop: spacing.sm }} />
          <View style={{ alignItems: 'center', marginTop: spacing.md }}>
            <Link href="/(auth)/forgot-password" style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
              {t('auth.forgotPasswordLink')}
            </Link>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg }}>
            <Muted>{t('auth.mNoAccount')}</Muted>
            <Link href="/(auth)/register" style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
              {t('auth.registerButton')}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
