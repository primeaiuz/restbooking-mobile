import React from 'react';
import { Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { Screen, Title } from '@/components/UI';
import { colors, spacing, radius } from '@/lib/theme';

const ITEMS: { icon: any; labelKey: string; href: string }[] = [
  { icon: 'git-network-outline', labelKey: 'more.chains', href: '/(system-admin)/more/chains' },
  { icon: 'star-outline', labelKey: 'more.platformReviews', href: '/(system-admin)/more/reviews' },
  { icon: 'location-outline', labelKey: 'more.locations', href: '/(system-admin)/more/locations' },
  { icon: 'image-outline', labelKey: 'more.banners', href: '/(system-admin)/more/banners' },
  { icon: 'pricetags-outline', labelKey: 'more.tariffs', href: '/(system-admin)/more/tariffs' },
  { icon: 'newspaper-outline', labelKey: 'more.articles', href: '/(system-admin)/more/articles' },
];

export default function SystemAdminMoreScreen() {
  const { t } = useTranslation();
  const { logout } = useAuth();

  function handleLogout() {
    Alert.alert(t('common.logoutConfirmTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.logout'), style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Title style={{ marginBottom: spacing.lg }}>{t('more.title')}</Title>
        {ITEMS.map((item) => (
          <TouchableOpacity key={item.href} style={styles.row} onPress={() => router.push(item.href as any)}>
            <Ionicons name={item.icon} size={20} color={colors.textMuted} />
            <Text style={styles.rowText}>{t(item.labelKey)}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.row, { marginTop: spacing.xl }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[styles.rowText, { color: colors.danger }]}>{t('common.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = {
  row: {
    flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.card,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginBottom: spacing.sm, gap: spacing.md,
  },
  rowText: { color: colors.text, fontSize: 15, fontWeight: '600' as const, flex: 1 },
};
