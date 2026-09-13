import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as api from './api';

// Client-side half of push notifications: request permission, get an Expo push
// token, and register it with the backend. The backend half (storing the token
// and actually sending a push when a booking is confirmed/declined, a chat reply
// arrives, etc.) doesn't exist yet — see api.registerPushToken. Until it does,
// this function still runs (so nothing needs to change here once the backend
// ships) but every step degrades silently: no projectId configured yet (EAS
// project not linked), permission denied, or the backend 404s.
export async function registerForPushNotifications(): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return; // set once `eas init` has linked this project to an EAS project

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await api.registerPushToken(tokenResponse.data, platform);
  } catch {
    // Best-effort — must never block login/app startup.
  }
}
