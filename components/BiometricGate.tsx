import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { isBiometricLockEnabled, promptBiometricUnlock } from '@/lib/biometricLock';
import { Button, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

// Sits just inside AuthProvider, wrapping the whole navigator. Once per cold start,
// if the user previously opted into the biometric lock (see profile screen) and a
// session is already stored, this blocks rendering the app until Face ID/fingerprint
// succeeds. It does nothing for logged-out users or users who never enabled the lock.
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, hydrated } = useAuth();
  const [checked, setChecked] = useState(false);
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { setChecked(true); return; }
    isBiometricLockEnabled().then((enabled) => {
      setLocked(enabled);
      setChecked(true);
    });
    // Only re-evaluate on cold start / login transitions, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, !!user]);

  async function unlock() {
    setChecking(true);
    const ok = await promptBiometricUnlock(t('biometric.mPromptReason'));
    setChecking(false);
    if (ok) setLocked(false);
  }

  if (!hydrated || !checked) return <LoadingView />;

  if (locked) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Ionicons name="finger-print" size={56} color={colors.primary} style={{ marginBottom: spacing.lg }} />
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, marginBottom: spacing.sm, textAlign: 'center' }}>
          {t('biometric.mLockedTitle')}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: spacing.xl, textAlign: 'center' }}>
          {t('biometric.mLockedMessage')}
        </Text>
        <Button title={t('biometric.mUnlockButton')} onPress={unlock} loading={checking} />
      </View>
    );
  }

  return <>{children}</>;
}
