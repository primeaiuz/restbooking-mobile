import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen, Title } from '@/components/UI';
import { SupportChatThread } from '@/components/SupportChat';
import { colors, spacing } from '@/lib/theme';

export default function SupportScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <View style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Title>{t('chat.mSupportTitle')}</Title>
      </View>
      <SupportChatThread />
    </Screen>
  );
}
