import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen, Title } from '@/components/UI';
import { SupportChatThread } from '@/components/SupportChat';
import { spacing } from '@/lib/theme';

export default function AggregatorSupportScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <View style={{ padding: spacing.lg }}>
        <Title>{t('chat.mSupportTitle')}</Title>
      </View>
      <SupportChatThread />
    </Screen>
  );
}
