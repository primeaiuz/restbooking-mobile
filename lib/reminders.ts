import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import dayjs from 'dayjs';
import i18n from './i18n';

// Local (on-device) reminders for upcoming bookings — no backend/push infrastructure
// needed, since expo-notifications can schedule a device-local notification for a
// future timestamp. This is a stopgap for real push notifications (see lib/push.ts):
// it only works if the app has been opened at least once on this device to schedule
// the reminder, and it's lost if the user reinstalls the app.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const HOURS_BEFORE = 2;

function notificationIdFor(bookingId: number) {
  return `booking-reminder-${bookingId}`;
}

export async function ensureReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function scheduleBookingReminder(params: {
  bookingId: number;
  venueName: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
}) {
  try {
    const granted = await ensureReminderPermission();
    if (!granted) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('booking-reminders', {
        name: i18n.t('common.mReminderChannelName'),
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const visitAt = dayjs(`${params.bookingDate}T${params.startTime}`);
    const fireAt = visitAt.subtract(HOURS_BEFORE, 'hour');
    if (!fireAt.isValid() || fireAt.isBefore(dayjs())) return; // booking too soon / in the past — skip

    // Cancel any previous reminder for this booking id before scheduling a new one
    // (covers reschedules where the same id could theoretically be reused by callers).
    await cancelReminder(params.bookingId);

    await Notifications.scheduleNotificationAsync({
      identifier: notificationIdFor(params.bookingId),
      content: {
        title: i18n.t('reminders.title'),
        body: i18n.t('reminders.body', { venue: params.venueName, time: params.startTime }),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt.toDate(),
      },
    });
  } catch {
    // Best-effort only — a failure here (denied permission, unsupported platform,
    // simulator without notification support) must never block booking creation.
  }
}

export async function cancelReminder(bookingId: number) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationIdFor(bookingId));
  } catch {
    // ignore — nothing was scheduled, or the platform doesn't support it
  }
}
