import 'react-native-gesture-handler';
import '@/lib/i18n';
import React, { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Lora_500Medium,
  Lora_500Medium_Italic,
  Lora_600SemiBold,
  Lora_700Bold,
} from '@expo-google-fonts/lora';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/auth-context';
import { initMonitoring } from '@/lib/monitoring';
import { colors } from '@/lib/theme';
import { LoadingView } from '@/components/UI';
import { BiometricGate } from '@/components/BiometricGate';

initMonitoring();

// Previously this only ran as a side effect of importing lib/reminders.ts, which only two
// client-only screens ((client)/bookings.tsx and (client)/catalog/[id].tsx) ever imported. That
// meant venue-admin/waiter/aggregator sessions never configured this at all (those screens never
// load for them), and even client sessions only got it after visiting one of those two screens —
// any push arriving before that, or to any non-client account, had no explicit foreground display
// behavior configured. Setting it here means it's always in place the moment the app starts,
// for every role, before any push can possibly arrive.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  // Split into two independent useFonts() calls rather than one combined map: expo-font
  // reports fontsError/fontsLoaded for the WHOLE batch it's given, so if the Lora variants
  // (used only for serif headings) ever fail or are slow to resolve in a given build, that
  // was silently taking Ionicons down with them too — even though Ionicons (used for every
  // tab bar icon in the app) had nothing wrong with it. Decoupled, a Lora hiccup can no
  // longer cause invisible tab icons app-wide.
  const [iconsLoaded, iconsError] = useFonts({ ...Ionicons.font });
  const [loraLoaded, loraError] = useFonts({
    Lora_500Medium,
    Lora_500Medium_Italic,
    Lora_600SemiBold,
    Lora_700Bold,
  });
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    // Errors were previously swallowed entirely — surfaced here (console only, picked up by
    // Sentry's breadcrumbs via initMonitoring) so a real failure is diagnosable instead of
    // just silently falling back to the timeout every single time.
    if (iconsError) console.error('[fonts] Ionicons failed to load:', iconsError);
    if (loraError) console.error('[fonts] Lora failed to load:', loraError);
  }, [iconsLoaded, iconsError, loraLoaded, loraError]);

  const fontsSettled = (iconsLoaded || iconsError) && (loraLoaded || loraError);
  // Never block the whole app forever — if fonts fail, error, or simply never resolve within
  // the timeout, render anyway (glyphs may fall back) rather than getting stuck on a loading
  // screen permanently.
  if (!fontsSettled && !timedOut) return <LoadingView />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <BiometricGate>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(client)" />
              <Stack.Screen name="(venue-admin)" />
              <Stack.Screen name="(aggregator)" />
              <Stack.Screen name="(system-admin)" />
            </Stack>
          </BiometricGate>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
