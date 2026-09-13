import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { LoadingView } from '@/components/UI';

// Full-screen stack, deliberately outside the (venue-admin) Tabs group — a person with no
// approved venue yet shouldn't see the venue-admin tab bar (bookings/halls/etc. that don't
// apply to them yet). See (venue-admin)/_layout.tsx for the redirect into this group.
export default function VenueOnboardingLayout() {
  const { user, hydrated } = useAuth();
  if (!hydrated) return <LoadingView />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== 'VENUE_ADMIN') return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
