// Written once by app/_layout.tsx as soon as font loading settles (success or error), read by
// the login screen so the actual status is visible on-screen at any time — not just during the
// few seconds the loading screen is up, which is too easy to miss or too fast to screenshot.
// Temporary diagnostic tool: safe to delete once the tab-icon issue is confirmed fixed.
export const fontDebugState: {
  iconsLoaded: boolean;
  iconsError: string | null;
  loraLoaded: boolean;
  loraError: string | null;
} = {
  iconsLoaded: false,
  iconsError: null,
  loraLoaded: false,
  loraError: null,
};
