import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';
import { LoadingView } from '@/components/UI';

export default function AggregatorLayout() {
  const { t } = useTranslation();
  const { user, hydrated } = useAuth();
  if (!hydrated) return <LoadingView />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== 'AGGREGATOR_ADMIN') return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.cardBorder },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: t('aggregatorNav.dashboard'), tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} /> }} />
      <Tabs.Screen name="venues/index" options={{ title: t('aggregatorNav.venues'), tabBarIcon: ({ color, size }) => <Ionicons name="business" color={color} size={size} /> }} />
      <Tabs.Screen name="admins" options={{ title: t('aggregatorNav.admins'), tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }} />
      <Tabs.Screen name="support" options={{ title: t('aggregatorNav.support'), tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color} size={size} /> }} />

      <Tabs.Screen name="venues/new" options={{ href: null }} />
      <Tabs.Screen name="venues/import" options={{ href: null }} />
    </Tabs>
  );
}
