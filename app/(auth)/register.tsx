import React, { useEffect, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert, Linking, TouchableOpacity } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth, homeRouteForRole } from '@/lib/auth-context';
import { startPhoneVerification, getVerificationStatus, extractErrorMessage, validateReferralCode } from '@/lib/api';
import { Screen, Title, Muted, Input, Button } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { register } = useAuth();
  // Pre-filled when opened via a referral deep link — restbooking://register?ref=CODE (app),
  // the same ?ref= query param on restbooking.uz/register, or a code copy-pasted from the bot.
  const params = useLocalSearchParams<{ ref?: string }>();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+998');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestId, setRequestId] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [referralCode, setReferralCode] = useState(typeof params.ref === 'string' ? params.ref : '');
  const [referrerName, setReferrerName] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = referralCode.trim();
    if (trimmed.length < 4) {
      setReferrerName(null);
      return;
    }
    let cancelled = false;
    validateReferralCode(trimmed)
      .then((info) => { if (!cancelled) setReferrerName(info.referrerName); })
      .catch(() => { if (!cancelled) setReferrerName(null); });
    return () => { cancelled = true; };
  }, [referralCode]);

  async function handleSendCode() {
    if (!phone.trim()) {
      Alert.alert(t('auth.mEnterPhoneTitle'), t('auth.mEnterPhoneMessage'));
      return;
    }
    setSendingCode(true);
    try {
      const result = await startPhoneVerification(phone.trim(), 'REGISTRATION');
      setRequestId(result.requestId);
      if (!result.botConfigured) {
        Alert.alert(t('auth.mBotUnavailableTitle'), t('auth.mContactSupportRegister'));
        return;
      }
      if (result.deepLink) {
        Linking.openURL(result.deepLink).catch(() => {
          Alert.alert(t('auth.mOpenTelegramFailedTitle'), t('auth.mOpenTelegramFailedMessage'));
        });
      }
    } catch (e) {
      Alert.alert(t('auth.mSendCodeFailedTitle'), extractErrorMessage(e));
    } finally {
      setSendingCode(false);
    }
  }

  // The bot confirms the phone the instant the person taps the deep link (no code is ever sent —
  // there's nothing to type). So confirmation is either detected automatically by polling below,
  // or checked on demand with this button if someone comes back to the app before the poll ticks.
  async function handleCheckStatus(silent = false) {
    if (!requestId) return;
    setCheckingStatus(true);
    try {
      const result = await getVerificationStatus(requestId);
      if (result.verified) {
        setPhoneVerified(true);
      } else if (!silent) {
        Alert.alert(t('auth.mNotConfirmedYetTitle'), t('auth.mNotConfirmedYetMessage'));
      }
    } catch (e) {
      if (!silent) Alert.alert(t('auth.mSendCodeFailedTitle'), extractErrorMessage(e));
    } finally {
      setCheckingStatus(false);
    }
  }

  // Auto-poll while waiting so most people never need the manual "check" button at all —
  // it just turns green on its own a moment after they tap the bot link.
  useEffect(() => {
    if (!requestId || phoneVerified) return;
    const interval = setInterval(() => { handleCheckStatus(true); }, 2500);
    return () => clearInterval(interval);
  }, [requestId, phoneVerified]);

  async function handleRegister() {
    if (!fullName || !phone || !password) {
      Alert.alert(t('common.fillFields'), t('auth.mRegisterRequiredFields'));
      return;
    }
    if (!phoneVerified) {
      Alert.alert(t('auth.mConfirmPhoneFirstTitle'), t('auth.mConfirmPhoneFirstMessage'));
      return;
    }
    if (!agreedToPolicy) {
      Alert.alert(t('auth.mAgreePolicyTitle'), t('auth.mAgreePolicyMessage'));
      return;
    }
    setLoading(true);
    try {
      const user = await register(phone.trim(), password, fullName.trim(), requestId, email.trim() || undefined, referralCode.trim() || undefined);
      router.replace(homeRouteForRole(user.role) as any);
    } catch (e) {
      Alert.alert(t('auth.registerError'), extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl }}>
          <Title style={{ marginBottom: spacing.xs }}>{t('auth.registerTitle')}</Title>
          <Muted style={{ marginBottom: spacing.lg }}>{t('auth.mClientOnlyNote')}</Muted>
          <Input label={`${t('auth.mFullNameLabel')} *`} value={fullName} onChangeText={setFullName} placeholder={t('auth.mFullNamePlaceholder')} />

          <Input
            label={`${t('auth.phone')} *`}
            value={phone}
            onChangeText={(v) => { setPhone(v); setPhoneVerified(false); setRequestId(''); }}
            keyboardType="phone-pad"
            placeholder="+998901112233"
            editable={!phoneVerified}
          />

          {!phoneVerified && (
            <>
              <Button
                title={requestId ? t('auth.mResendCode') : t('auth.mGetCodeTelegram')}
                variant="secondary"
                onPress={handleSendCode}
                loading={sendingCode}
                style={{ marginTop: spacing.xs, marginBottom: spacing.sm }}
              />
              {requestId ? (
                <>
                  <Muted style={{ marginBottom: spacing.xs }}>{t('auth.mWaitingForTelegramHint')}</Muted>
                  <Button
                    title={t('auth.mCheckStatusButton')}
                    onPress={() => handleCheckStatus(false)}
                    loading={checkingStatus}
                    style={{ marginTop: spacing.xs }}
                  />
                </>
              ) : null}
            </>
          )}
          {phoneVerified && (
            <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13, marginTop: spacing.xs }}>
              {t('auth.mPhoneConfirmed')}
            </Text>
          )}

          <View style={{ marginTop: spacing.sm }}>
            <Input label={t('auth.emailOptional')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Input label={`${t('auth.password')} *`} value={password} onChangeText={setPassword} secureTextEntry placeholder={t('auth.mMinPasswordHint')} />
            <Input
              label={t('auth.mReferralCodeLabel')}
              value={referralCode}
              onChangeText={(v) => setReferralCode(v.toUpperCase())}
              autoCapitalize="characters"
              placeholder={t('auth.mReferralCodePlaceholder')}
            />
            {referrerName ? (
              <Text style={{ color: colors.success, fontSize: 12, marginTop: -spacing.xs, marginBottom: spacing.xs }}>
                {t('auth.mReferralCodeValid', { name: referrerName })}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => setAgreedToPolicy((v) => !v)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }}
          >
            <View
              style={{
                width: 22, height: 22, borderRadius: 5, marginRight: spacing.sm,
                borderWidth: 2, borderColor: agreedToPolicy ? colors.primary : colors.textMuted,
                backgroundColor: agreedToPolicy ? colors.primary : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {agreedToPolicy ? <Text style={{ color: colors.white, fontSize: 14, fontWeight: '800' }}>✓</Text> : null}
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 13, flex: 1, lineHeight: 18 }}>
              {t('auth.mAgreePolicySimple')}
            </Text>
          </TouchableOpacity>

          <Button title={t('auth.mCreateAccount')} onPress={handleRegister} loading={loading} disabled={!phoneVerified || !agreedToPolicy} style={{ marginTop: spacing.md }} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg }}>
            <Muted>{t('auth.mHaveAccount')}</Muted>
            <Link href="/(auth)/login" style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
              {t('auth.loginButton')}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
