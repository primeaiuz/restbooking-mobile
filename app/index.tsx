import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth, homeRouteForRole } from '@/lib/auth-context';
import { LoadingView } from '@/components/UI';

export default function Index() {
  const { user, hydrated } = useAuth();

  if (!hydrated) return <LoadingView />;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href={homeRouteForRole(user.role) as any} />;
}
