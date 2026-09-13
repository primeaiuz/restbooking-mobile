import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';
import { LoadingView } from '@/components/UI';

export default function SystemAdminLayout() {
  const { t } = useTranslation();
  const { user, hydrated } = useAuth();
  if (!hydrated) return <LoadingView />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== 'SYSTEM_ADMIN') return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.cardBorder },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
      }}
    >
      <Tabs.Screen name="overview" options={{ title: t('systemAdminNav.overview'), tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} /> }} />
      <Tabs.Screen name="venues/index" options={{ title: t('systemAdminNav.venues'), tabBarIcon: ({ color, size }) => <Ionicons name="business" color={color} size={size} /> }} />
      <Tabs.Screen name="chat/index" options={{ title: t('systemAdminNav.chat'), tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color} size={size} /> }} />
      <Tabs.Screen name="more/index" options={{ title: t('nav.more'), tabBarIcon: ({ color, size }) => <Ionicons name="menu" color={color} size={size} /> }} />

      <Tabs.Screen name="venues/new" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="more/chains" options={{ href: null }} />
      <Tabs.Screen name="more/reviews" options={{ href: null }} />
      <Tabs.Screen name="more/locations" options={{ href: null }} />
      <Tabs.Screen name="more/banners" options={{ href: null }} />
      <Tabs.Screen name="more/tariffs" options={{ href: null }} />
      <Tabs.Screen name="more/articles" options={{ href: null }} />
    </Tabs>
  );
}
