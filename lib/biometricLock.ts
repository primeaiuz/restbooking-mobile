import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Opt-in app-lock: gates the already-persisted session behind Face ID / fingerprint
// on cold start. This does NOT replace phone+password login — it only adds a local
// re-authentication step in front of a session that's already stored in SecureStore,
// so losing/forgetting your phone doesn't let a stranger open the app straight to
// someone else's bookings and personal data.
const ENABLED_KEY = 'restbooking_biometric_lock_enabled';

export async function isBiometricSupported(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

export async function isBiometricLockEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
}

export async function setBiometricLockEnabled(enabled: boolean) {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
}

export async function promptBiometricUnlock(reason: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      disableDeviceFallback: false, // allow device PIN/pattern as a fallback if biometrics fail
    });
    return result.success;
  } catch {
    return false;
  }
}
