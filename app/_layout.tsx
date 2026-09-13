import 'react-native-gesture-handler';
import '@/lib/i18n';
import React, { useEffect, useState } from 'react';
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

export default function RootLayout() {
  // @expo/vector-icons renders invisible glyphs until its font is explicitly
  // preloaded (native font linking alone isn't enough on Android release builds).
  // Lora is the serif display face used for headings, mirroring the website.
  const [fontsLoaded, fontsError] = useFonts({
    ...Ionicons.font,
    Lora_500Medium,
    Lora_500Medium_Italic,
    Lora_600SemiBold,
    Lora_700Bold,
  });
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, []);
  // Never block the whole app on this — if a font fails, errors, or simply never
  // resolves, render anyway (glyphs may fall back) rather than getting stuck forever.
  if (!fontsLoaded && !fontsError && !timedOut) return <LoadingView />;

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
