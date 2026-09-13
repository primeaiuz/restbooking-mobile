import React, { useEffect, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert, Linking } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { startPasswordReset, getVerificationStatus, resetPassword, extractErrorMessage } from '@/lib/api';
import { Screen, Title, Muted, Input, Button } from '@/components/UI';
import { colors, spacing, fonts } from '@/lib/theme';

type Step = 'phone' | 'code' | 'password';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+998');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestId, setRequestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  async function handleStart() {
    if (!phone.trim()) {
      Alert.alert(t('auth.mEnterPhoneTitle'), t('auth.mEnterRegisteredPhone'));
      return;
    }
    setLoading(true);
    try {
      const result = await startPasswordReset(phone.trim());
      setRequestId(result.requestId);
      if (!result.botConfigured) {
        Alert.alert(t('auth.mBotUnavailableTitle'), t('auth.mContactSupportReset'));
        return;
      }
      if (result.deepLink) {
        Linking.openURL(result.deepLink).catch(() => {
          Alert.alert(t('auth.mOpenTelegramFailedTitle'), t('auth.mOpenTelegramFailedMessage'));
        });
      }
      setStep('code');
    } catch (e) {
      Alert.alert(t('auth.mResetStartFailed'), extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  // Same as registration: the bot confirms the phone the instant the deep link is tapped, no
  // code is ever sent to type in. Poll for it, with a manual recheck button as a fallback.
  async function handleCheckStatus(silent = false) {
    if (!requestId) return;
    setCheckingStatus(true);
    try {
      const result = await getVerificationStatus(requestId);
      if (result.verified) {
        setStep('password');
      } else if (!silent) {
        Alert.alert(t('auth.mNotConfirmedYetTitle'), t('auth.mNotConfirmedYetMessage'));
      }
    } catch (e) {
      if (!silent) Alert.alert(t('auth.mResetStartFailed'), extractErrorMessage(e));
    } finally {
      setCheckingStatus(false);
    }
  }

  useEffect(() => {
    if (step !== 'code' || !requestId) return;
    const interval = setInterval(() => { handleCheckStatus(true); }, 2500);
    return () => clearInterval(interval);
  }, [step, requestId]);

  async function handleResetPassword() {
    if (newPassword.length < 6) {
      Alert.alert(t('auth.mPasswordTooShortTitle'), t('auth.mMinPasswordHint'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('auth.mPasswordMismatchTitle'), t('auth.mPasswordMismatchMessage'));
      return;
    }
    setLoading(true);
    try {
      await resetPassword(phone.trim(), newPassword, requestId);
      Alert.alert(t('auth.mPasswordChangedTitle'), t('auth.resetPasswordDone'), [
        { text: t('auth.loginButton'), onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e) {
      Alert.alert(t('auth.resetPasswordError'), extractErrorMessage(e));
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
            <Muted style={{ marginTop: spacing.xs }}>{t('auth.mResetTagline')}</Muted>
          </View>

          {step === 'phone' && (
            <>
              <Title style={{ marginBottom: spacing.sm }}>{t('auth.forgotPasswordLink')}</Title>
              <Muted style={{ marginBottom: spacing.lg }}>
                {t('auth.mResetStep1Subtitle')}
              </Muted>
              <Input
                label={t('auth.phone')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
                placeholder="+998901112233"
              />
              <Button title={t('auth.mGetCode')} onPress={handleStart} loading={loading} style={{ marginTop: spacing.sm }} />
            </>
          )}

          {step === 'code' && (
            <>
              <Title style={{ marginBottom: spacing.sm }}>{t('auth.mEnterCodeTitle')}</Title>
              <Muted style={{ marginBottom: spacing.lg }}>
                {t('auth.mWaitingForTelegramHint')}
              </Muted>
              <Button title={t('auth.mCheckStatusButton')} onPress={() => handleCheckStatus(false)} loading={checkingStatus} style={{ marginTop: spacing.sm }} />
            </>
          )}

          {step === 'password' && (
            <>
              <Title style={{ marginBottom: spacing.sm }}>{t('auth.newPassword')}</Title>
              <Muted style={{ marginBottom: spacing.lg }}>{t('auth.mPhoneConfirmedSetPassword')}</Muted>
              <Input
                label={t('auth.newPassword')}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="••••••••"
              />
              <Input
                label={t('auth.mRepeatPassword')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="••••••••"
              />
              <Button title={t('auth.resetPasswordButton')} onPress={handleResetPassword} loading={loading} style={{ marginTop: spacing.sm }} />
            </>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg }}>
            <Link href="/(auth)/login" style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
              {t('auth.backToLogin')}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
