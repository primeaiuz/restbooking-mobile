import React, { useCallback, useState } from 'react';
import { View, RefreshControl, ScrollView } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Screen, Title, Muted, Button, Card, LoadingView } from '@/components/UI';
import { colors, spacing } from '@/lib/theme';

export default function PendingVenueScreen() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approved, setApproved] = useState(false);

  const check = useCallback(async () => {
    try {
      const venue = await api.getMyVenue();
      if (venue.moderationStatus === 'APPROVED') {
        setApproved(true);
        router.replace('/(venue-admin)/dashboard');
        return;
      }
    } catch {
      // ignore — stay on this screen, the person can pull-to-refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Re-check every time this screen regains focus (e.g. coming back from the background after
  // an admin approved it) rather than only once on mount.
  useFocusEffect(useCallback(() => { check(); }, [check]));

  if (loading && !approved) return <LoadingView />;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, flexGrow: 1, justifyContent: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); check(); }} tintColor={colors.primary} />}
      >
        <Card style={{ alignItems: 'center', padding: spacing.xl }}>
          <Ionicons name="time-outline" size={48} color={colors.gold} />
          <Title style={{ marginTop: spacing.md, textAlign: 'center' }}>{t('venueOnboarding.pendingTitle')}</Title>
          <Muted style={{ marginTop: spacing.sm, textAlign: 'center' }}>{t('venueOnboarding.pendingBody')}</Muted>
          <Button
            title={t('venueOnboarding.pendingRefresh')}
            variant="secondary"
            onPress={() => { setRefreshing(true); check(); }}
            style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
          />
          <Button
            title={t('profile.logoutButton')}
            variant="secondary"
            onPress={logout}
            style={{ marginTop: spacing.sm, alignSelf: 'stretch' }}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
