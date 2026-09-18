import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';
import { LoadingView } from '@/components/UI';

export default function WaiterLayout() {
  const { t } = useTranslation();
  const { user, hydrated } = useAuth();
  if (!hydrated) return <LoadingView />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== 'WAITER') return <Redirect href="/" />;

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
        name="dashboard"
        options={{ title: t('waiter.tabDashboard'), tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{ title: t('waiter.tabOrders'), tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: t('waiter.tabScan'), tabBarIcon: ({ color, size }) => <Ionicons name="qr-code-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: t('waiter.tabHistory'), tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen name="orders/[id]" options={{ href: null }} />
    </Tabs>
  );
}
