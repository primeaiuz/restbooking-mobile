import * as Sentry from '@sentry/react-native';

// Crash reporting is opt-in via an env var so the app works out of the box
// without anyone having to touch this file: no DSN configured → Sentry.init
// is simply never called, and every Sentry.* call below becomes a no-op.
// To enable: create a project at sentry.io, then set
//   EXPO_PUBLIC_SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxx
// in your EAS build secrets / .env before building.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

let initialized = false;

export function initMonitoring() {
  if (!SENTRY_DSN || initialized) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    // Only report from real installs — skip local `expo start` dev sessions,
    // where every hot-reload warning would otherwise show up as a Sentry event.
    enabled: !__DEV__,
  });
  initialized = true;
}

export function captureException(error: unknown) {
  if (!initialized) return;
  Sentry.captureException(error);
}

export { Sentry };
