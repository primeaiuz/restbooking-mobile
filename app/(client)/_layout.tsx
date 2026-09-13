import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';
import { LoadingView } from '@/components/UI';

export default function ClientLayout() {
  const { t } = useTranslation();
  const { user, hydrated } = useAuth();
  if (!hydrated) return <LoadingView />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== 'CLIENT') return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.cardBorder },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
      }}
    >
      <Tabs.Screen
        name="catalog/index"
        options={{ title: t('nav.catalog'), tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: t('nav.favorites'), tabBarIcon: ({ color, size }) => <Ionicons name="heart" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: t('nav.myBookings'), tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="assistant"
        options={{ title: t('nav.assistant'), tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('nav.profile'), tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
      <Tabs.Screen name="catalog/[id]" options={{ href: null }} />
      <Tabs.Screen name="articles/index" options={{ href: null }} />
      <Tabs.Screen name="articles/[id]" options={{ href: null }} />
      <Tabs.Screen name="referral" options={{ href: null }} />
    </Tabs>
  );
}
