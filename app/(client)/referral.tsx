import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Share } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import type { ReferralSummary } from '@/lib/types';
import { Screen, Title, Muted, Card, Button, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function ReferralScreen() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyReferral()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  async function share() {
    if (!summary) return;
    await Share.share({
      message: t('referral.mShareMessage', { code: summary.code, url: summary.siteRegisterUrl }),
    });
  }

  if (loading) return <LoadingView />;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: t('referral.mScreenTitle') }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Title style={{ marginBottom: spacing.xs }}>{t('referral.mHeadline')}</Title>
        <Muted style={{ marginBottom: spacing.lg }}>{t('referral.mSubtitle')}</Muted>

        {summary ? (
          <>
            <Card style={{ marginBottom: spacing.lg, alignItems: 'center', paddingVertical: spacing.xl }}>
              <Muted>{t('referral.mYourCode')}</Muted>
              <Text style={{ color: colors.primary, fontSize: 32, fontWeight: '800', letterSpacing: 4, marginTop: spacing.xs }}>
                {summary.code}
              </Text>
            </Card>

            <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
              <Card style={{ flex: 1, marginRight: spacing.sm, alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{summary.invitedCount}</Text>
                <Muted style={{ textAlign: 'center' }}>{t('referral.mInvitedCount')}</Muted>
              </Card>
              <Card style={{ flex: 1, marginHorizontal: spacing.sm, alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{summary.rewardedCount}</Text>
                <Muted style={{ textAlign: 'center' }}>{t('referral.mRewardedCount')}</Muted>
              </Card>
              <Card style={{ flex: 1, marginLeft: spacing.sm, alignItems: 'center' }}>
                <Text style={{ color: colors.success, fontSize: 24, fontWeight: '800' }}>{summary.rewardPoints}</Text>
                <Muted style={{ textAlign: 'center' }}>{t('referral.mRewardPoints')}</Muted>
              </Card>
            </View>

            <Muted style={{ marginBottom: spacing.lg }}>{t('referral.mHowItWorks')}</Muted>

            <Button title={t('referral.mShareButton')} onPress={share} style={{ marginBottom: spacing.md }} />
          </>
        ) : (
          <Muted>{t('referral.mLoadFailed')}</Muted>
        )}
      </ScrollView>
    </Screen>
  );
}
