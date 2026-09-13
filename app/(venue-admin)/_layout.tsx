import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';
import { LoadingView } from '@/components/UI';

export default function VenueAdminLayout() {
  const { t } = useTranslation();
  const { user, hydrated } = useAuth();
  if (!hydrated) return <LoadingView />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== 'VENUE_ADMIN') return <Redirect href="/" />;
  // Self-registered "restaurant owner" with no venue submitted yet (see
  // (auth)/register.tsx's account-type picker) — the tab bar below assumes a working venue
  // (bookings/halls/etc.), so send them to the submit-venue form instead. Once a venue exists,
  // pending.tsx is what checks whether it's been approved yet, not this layout — a stale
  // cached user with an already-attached-but-still-pending venueId should still reach the
  // normal Tabs below and let dashboard.tsx/pending.tsx sort that out with a fresh fetch.
  if (!user.venueId) return <Redirect href="/(venue-onboarding)/submit-venue" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.cardBorder },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: t('adminNav.dashboard'), tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} /> }} />
      <Tabs.Screen name="bookings/index" options={{ title: t('adminNav.bookings'), tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }} />
      <Tabs.Screen name="halls" options={{ title: t('adminNav.hallsTables'), tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="more/index" options={{ title: t('nav.more'), tabBarIcon: ({ color, size }) => <Ionicons name="menu" color={color} size={size} /> }} />

      <Tabs.Screen name="bookings/new" options={{ href: null }} />
      <Tabs.Screen name="bookings/scan" options={{ href: null }} />
      <Tabs.Screen name="more/clients" options={{ href: null }} />
      <Tabs.Screen name="more/reviews" options={{ href: null }} />
      <Tabs.Screen name="more/venue-settings" options={{ href: null }} />
      <Tabs.Screen name="more/stop-list" options={{ href: null }} />
      <Tabs.Screen name="more/support" options={{ href: null }} />
      <Tabs.Screen name="more/telegram" options={{ href: null }} />
    </Tabs>
  );
}
