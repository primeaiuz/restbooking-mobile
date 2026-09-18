import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { captureException } from './monitoring';
import i18n from './i18n';
import type {
  AuthResponse, AuthUser, Booking, Review, VenueDetail, VenueSummary, VenueType, Hall, MenuItem,
  TableUnit, TableZoneType, DaySchedule, ConfirmationMode, ClientSummary, VenueStats,
  StopListEntry, City, District, ArticleCategory, ArticleSummary, Article, Banner,
  TariffPlan, BillingPeriod, ChatMessage, ChatThreadSummary, ChainVenue, VenueAdminAccount,
  ChainStats, PlatformOverview, ChainSummary, AdminVenue, PlatformReview,
  TariffAssignmentHistoryEntry, VenueModerationStatus, TelegramLinkInfo, ChatTurn,
  AiChatResponse, ReferralSummary, Waiter, ShiftStatus, TableOrder, WaiterHistory,
} from './types';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  'http://localhost:8080/api';

// The backend returns uploaded-photo URLs as a site-relative path ("/uploads/xxx.jpg") — on
// web that resolves fine on its own since the browser fills in the current origin, but native
// apps have no such context: an <Image> given a bare "/uploads/..." URI simply fails to load,
// with no error surfaced anywhere (this is why menu/venue photos looked "uploaded successfully"
// but never actually appeared). Every photoUrl/coverPhotoUrl from the API must go through this
// before being handed to <Image>. Absolute URLs (already http(s)://) pass through untouched.
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
export function resolveImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Access/refresh tokens are secrets, so they live in the platform keychain/keystore
// via expo-secure-store rather than plain AsyncStorage (which is unencrypted on-disk
// storage that any app with filesystem access, or a rooted/jailbroken device, can read).
// The user profile is not a credential, so it stays in AsyncStorage for simplicity.
const ACCESS_TOKEN_KEY = 'restbooking_access_token';
const REFRESH_TOKEN_KEY = 'restbooking_refresh_token';
const USER_STORAGE_KEY = 'restbooking_auth_user';

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
}
const EMPTY_STATE: AuthState = { accessToken: null, refreshToken: null, user: null };

let state: AuthState = EMPTY_STATE;
let hydrated = false;
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

async function persistAuth(next: AuthState) {
  const tokenWrites: Promise<void>[] = [];
  tokenWrites.push(
    next.accessToken ? SecureStore.setItemAsync(ACCESS_TOKEN_KEY, next.accessToken) : SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
  );
  tokenWrites.push(
    next.refreshToken ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, next.refreshToken) : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  );
  await Promise.all(tokenWrites);
  if (next.user) {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next.user));
  } else {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  }
}

export const authStore = {
  getState: (): AuthState => state,
  isHydrated: () => hydrated,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  hydrate: async () => {
    try {
      const [accessToken, refreshToken, rawUser] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(USER_STORAGE_KEY),
      ]);
      const user = rawUser ? (JSON.parse(rawUser) as AuthUser) : null;
      // Only treat the session as logged-in if we have a complete, consistent set —
      // a partially-written state (e.g. app killed mid-write) should fall back to logged-out.
      if (accessToken && refreshToken && user) {
        state = { accessToken, refreshToken, user };
      } else {
        state = EMPTY_STATE;
      }
    } catch {
      // ignore corrupted storage
      state = EMPTY_STATE;
    }
    hydrated = true;
    emit();
  },
  setAuth: async (next: AuthState) => {
    state = next;
    await persistAuth(state);
    emit();
  },
  clear: async () => {
    state = EMPTY_STATE;
    await persistAuth(state);
    emit();
  },
  setPreferredLanguage: async (language: string) => {
    if (!state.user) return;
    state = { ...state, user: { ...state.user, preferredLanguage: language } };
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(state.user));
    emit();
  },
};

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = authStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = authStore.getState().refreshToken;
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    const { accessToken, refreshToken: newRefresh, user } = res.data;
    await authStore.setAuth({ accessToken, refreshToken: newRefresh, user });
    return accessToken;
  } catch {
    await authStore.clear();
    return null;
  }
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as any).Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }
    // Server-side failures (5xx) are worth surfacing to crash reporting — client
    // errors (4xx: validation, auth, not-found) are expected/handled UI states,
    // not bugs, so we don't spam Sentry with those.
    if (error.response && error.response.status >= 500) {
      captureException(error);
    }
    return Promise.reject(error);
  },
);

export interface ApiErrorBody { message?: string; fieldErrors?: Record<string, string>; }
export function extractErrorMessage(error: unknown, fallback = i18n.t('common.genericError')): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.message) return body.message;
  }
  return fallback;
}

// ============ Auth ============
export function login(phone: string, password: string) {
  return apiClient.post<AuthResponse>('/auth/login', { phone, password }).then((r) => r.data);
}
export function register(
  phone: string,
  password: string,
  fullName: string,
  verificationRequestId: string,
  email?: string,
  referralCode?: string,
  accountType?: 'CLIENT' | 'VENUE_ADMIN',
) {
  return apiClient
    .post<AuthResponse>('/auth/register', {
      phone, password, fullName, email, verificationRequestId,
      referralCode: referralCode?.trim() || undefined,
      accountType,
    })
    .then((r) => r.data);
}
export function me() { return apiClient.get<AuthUser>('/auth/me').then((r) => r.data); }
export function updateLanguage(language: 'ru' | 'uz' | 'en') {
  return apiClient.patch<AuthUser>('/auth/me/language', { language }).then((r) => r.data);
}
// Required by Google Play / App Store review policy: a logged-in user must be able to
// delete their own account from inside the app, not just via a support request.
// Backend does a soft delete (scrubs phone/name/email, revokes login) — see AuthService.deleteAccount.
export function deleteMyAccount() { return apiClient.delete<void>('/auth/me'); }
// Push notifications: register this device's Expo push token so the backend can
// send booking-status/chat-reply notifications (see PushTokenController + ExpoPushSender).
export function registerPushToken(token: string, platform: 'ios' | 'android') {
  return apiClient.post<void>('/notifications/push-token', { token, platform });
}

// ============ Referral program ============
// Every account has its own invite code (see ReferralService on the backend). Sharing it earns
// a reward once the invited friend's first booking is confirmed by a venue — see referral.tsx.
export function getMyReferral() {
  return apiClient.get<ReferralSummary>('/referrals/me').then((r) => r.data);
}
// Public — no auth required, used to preview "you were invited by <name>" before the user
// finishes typing/pasting a code on the registration screen.
export function validateReferralCode(code: string) {
  return apiClient.get<{ referrerName: string; code: string }>(`/referrals/validate/${encodeURIComponent(code)}`).then((r) => r.data);
}

// ============ Phone verification via Telegram (registration + password reset) ============
export interface StartVerificationResult { requestId: string; deepLink: string | null; botConfigured: boolean }
export function startPhoneVerification(phone: string, purpose: 'REGISTRATION' | 'PASSWORD_RESET') {
  return apiClient
    .post<StartVerificationResult>('/auth/verification/start', { phone, purpose, channel: 'TELEGRAM' })
    .then((r) => r.data);
}
export function startPasswordReset(phone: string) {
  return startPhoneVerification(phone, 'PASSWORD_RESET');
}
export function confirmVerificationCode(requestId: string, code: string) {
  return apiClient
    .post<{ verified: boolean }>('/auth/verification/confirm-code', { requestId, code })
    .then((r) => r.data);
}
// The TELEGRAM channel (the only one this app uses — see startPhoneVerification above) never
// generates a typed code: tapping the bot's deep link confirms the phone instantly server-side.
// So confirmation here means polling this status endpoint until `verified` flips to true, not
// asking the person to type a code that was never sent (confirmVerificationCode is only for the
// SMS channel, which isn't wired up in this app).
export function getVerificationStatus(requestId: string) {
  return apiClient.get<{ verified: boolean }>(`/auth/verification/status/${requestId}`).then((r) => r.data);
}
export function resetPassword(phone: string, newPassword: string, verificationRequestId: string) {
  return apiClient
    .post<void>('/auth/reset-password', { phone, newPassword, verificationRequestId })
    .then((r) => r.data);
}

// ============ Public: venues / catalog ============
export type VenueSortOrder = 'POPULAR' | 'NEWEST' | 'RATING' | 'DISTANCE';
export interface CatalogFilters {
  city?: string; type?: VenueType; district?: string; cuisine?: string; search?: string;
  date?: string; time?: string; guests?: number; sort?: VenueSortOrder;
  lat?: number; lng?: number; limit?: number;
}
export function searchVenues(filters: CatalogFilters) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''));
  return apiClient.get<VenueSummary[]>('/venues', { params }).then((r) => r.data);
}
export function getVenue(id: number) { return apiClient.get<VenueDetail>(`/venues/${id}`).then((r) => r.data); }
export function getFreeSlots(venueId: number, tableId: number, date: string) {
  return apiClient.get<string[]>(`/venues/${venueId}/tables/${tableId}/slots`, { params: { date } }).then((r) => r.data);
}
export function getVenueReviews(venueId: number) {
  return apiClient.get<Review[]>(`/venues/${venueId}/reviews`).then((r) => r.data);
}

// ============ Bookings (client) ============
export interface BookingCreateRequest {
  venueId: number; tableUnitId: number; guestName: string; guestPhone: string;
  guestCount: number; bookingDate: string; startTime: string; comment?: string;
}
export function createBooking(req: BookingCreateRequest) {
  return apiClient.post<Booking>('/bookings', req).then((r) => r.data);
}
export function myBookings() { return apiClient.get<Booking[]>('/bookings/me').then((r) => r.data); }
export function cancelBooking(id: number, reason?: string) {
  return apiClient.patch<Booking>(`/bookings/${id}/cancel`, { reason }).then((r) => r.data);
}

// ============ Favorites ============
export function listFavorites() { return apiClient.get<VenueSummary[]>('/favorites').then((r) => r.data); }
export function addFavorite(venueId: number) { return apiClient.post(`/favorites/${venueId}`); }
export function removeFavorite(venueId: number) { return apiClient.delete(`/favorites/${venueId}`); }

// ============ Locations ============
export function listCities() { return apiClient.get<City[]>('/locations/cities').then((r) => r.data); }
export function listDistricts(cityId: number | null | undefined) {
  if (!cityId) return Promise.resolve<District[]>([]);
  return apiClient.get<District[]>(`/locations/cities/${cityId}/districts`).then((r) => r.data);
}

// ============ Reviews ============
export function createReview(bookingId: number, rating: number, comment?: string) {
  return apiClient.post<Review>('/reviews', { bookingId, rating, comment }).then((r) => r.data);
}

// ============ AI Assistant ============
export interface AiChatRequest { venueId?: number; history: ChatTurn[]; message: string; }
export function sendAiChatMessage(req: AiChatRequest) {
  return apiClient.post<AiChatResponse>('/ai/chat', req).then((r) => r.data);
}

// ============ Articles ============
export function listPublishedArticles(categoryId?: number) {
  return apiClient.get<ArticleSummary[]>('/articles', { params: categoryId ? { categoryId } : undefined }).then((r) => r.data);
}
export function getPublishedArticle(id: number) { return apiClient.get<Article>(`/articles/${id}`).then((r) => r.data); }
export function listArticleCategories() { return apiClient.get<ArticleCategory[]>('/article-categories').then((r) => r.data); }

// ============ Banners (public) ============
export function listActiveBanners() { return apiClient.get<Banner[]>('/banners').then((r) => r.data); }

// ============ Tariffs (public) ============
export function listActiveTariffs() { return apiClient.get<TariffPlan[]>('/tariffs').then((r) => r.data); }

// ============ Telegram ============
export function getTelegramLink() { return apiClient.get<TelegramLinkInfo>('/telegram/link').then((r) => r.data); }
export function disconnectTelegram() { return apiClient.delete('/telegram/link'); }

// ============ Venue Admin ============
export interface VenueUpdateRequest {
  name: string; description?: string; city: string; district?: string; address?: string;
  cuisine?: string; phone?: string; coverPhotoUrl?: string; latitude?: number | null;
  longitude?: number | null; photos: string[]; workingHours: DaySchedule[];
  confirmationMode: ConfirmationMode; confirmationTimeoutMinutes: number;
  cancellationCutoffHours: number; slotDurationMinutes: number; eveningStartTime: string;
  eveningSlotDurationMinutes: number; bufferMinutes: number; active: boolean;
}
export function getMyVenue() { return apiClient.get<VenueDetail>('/venue-admin/venue').then((r) => r.data); }
export function updateMyVenue(req: VenueUpdateRequest) {
  return apiClient.put<VenueDetail>('/venue-admin/venue', req).then((r) => r.data);
}
// For a VENUE_ADMIN account with no venue yet (self-registered as "restaurant owner" — see
// register() below). Creates the venue at PENDING moderation status; see submit-venue.tsx.
export interface SubmitVenueRequest {
  name: string; type: VenueType; city: string; district?: string; address?: string;
  cuisine?: string; phone?: string; description?: string;
  latitude?: number | null; longitude?: number | null;
}
export function submitVenue(req: SubmitVenueRequest) {
  return apiClient.post<VenueDetail>('/venue-admin/venue/submit', req).then((r) => r.data);
}
export function listHalls() { return apiClient.get<Hall[]>('/venue-admin/halls').then((r) => r.data); }
export function createHall(name: string, description?: string) {
  return apiClient.post<Hall>('/venue-admin/halls', { name, description }).then((r) => r.data);
}
export function updateHall(id: number, name: string, description?: string) {
  return apiClient.put<Hall>(`/venue-admin/halls/${id}`, { name, description }).then((r) => r.data);
}
export function deleteHall(id: number) { return apiClient.delete(`/venue-admin/halls/${id}`); }

export interface TableUnitRequest {
  hallId: number; name: string; description?: string; zoneType: TableZoneType;
  capacityMin: number; capacityMax: number; photos: string[]; active: boolean;
}
export function listTables() { return apiClient.get<TableUnit[]>('/venue-admin/tables').then((r) => r.data); }
export function createTable(req: TableUnitRequest) {
  return apiClient.post<TableUnit>('/venue-admin/tables', req).then((r) => r.data);
}
export function updateTable(id: number, req: TableUnitRequest) {
  return apiClient.put<TableUnit>(`/venue-admin/tables/${id}`, req).then((r) => r.data);
}
export function deleteTable(id: number) { return apiClient.delete(`/venue-admin/tables/${id}`); }

export interface MenuItemRequest {
  category: string; name: string; description?: string; priceSum: number;
  photoUrl?: string; signature: boolean; sortOrder: number;
}
export function listMenuItems() { return apiClient.get<MenuItem[]>('/venue-admin/menu-items').then((r) => r.data); }
export function createMenuItem(req: MenuItemRequest) {
  return apiClient.post<MenuItem>('/venue-admin/menu-items', req).then((r) => r.data);
}
export function updateMenuItem(id: number, req: MenuItemRequest) {
  return apiClient.put<MenuItem>(`/venue-admin/menu-items/${id}`, req).then((r) => r.data);
}
export function deleteMenuItem(id: number) { return apiClient.delete(`/venue-admin/menu-items/${id}`); }

export function listStopList() { return apiClient.get<StopListEntry[]>('/venue-admin/stop-list').then((r) => r.data); }
export function addStopListEntry(date: string, reason?: string) {
  return apiClient.post('/venue-admin/stop-list', { date, reason });
}
export function deleteStopListEntry(id: number) { return apiClient.delete(`/venue-admin/stop-list/${id}`); }

export function listVenueBookings() { return apiClient.get<Booking[]>('/venue-admin/bookings').then((r) => r.data); }
export interface ManualBookingRequest {
  tableUnitId: number; guestName: string; guestPhone: string; guestCount: number;
  bookingDate: string; startTime: string; comment?: string;
}
export function createManualBooking(req: ManualBookingRequest) {
  return apiClient.post<Booking>('/venue-admin/bookings', req).then((r) => r.data);
}
export function confirmBooking(id: number) { return apiClient.patch<Booking>(`/venue-admin/bookings/${id}/confirm`).then((r) => r.data); }
export function declineBooking(id: number, reason?: string) {
  return apiClient.patch<Booking>(`/venue-admin/bookings/${id}/decline`, { reason }).then((r) => r.data);
}
export function cancelBookingAsAdmin(id: number, reason?: string) {
  return apiClient.patch<Booking>(`/venue-admin/bookings/${id}/cancel`, { reason }).then((r) => r.data);
}
export function completeBooking(id: number) { return apiClient.patch<Booking>(`/venue-admin/bookings/${id}/complete`).then((r) => r.data); }
export function markNoShow(id: number) { return apiClient.patch<Booking>(`/venue-admin/bookings/${id}/no-show`).then((r) => r.data); }

export function listClients() { return apiClient.get<ClientSummary[]>('/venue-admin/clients').then((r) => r.data); }
export function getStats() { return apiClient.get<VenueStats>('/venue-admin/stats').then((r) => r.data); }
export function listVenueReviews() { return apiClient.get<Review[]>('/venue-admin/reviews').then((r) => r.data); }
export function replyToReview(id: number, reply: string) {
  return apiClient.patch<Review>(`/venue-admin/reviews/${id}/reply`, { reply }).then((r) => r.data);
}

// ============ Chat (venue admin / aggregator <-> system admin) ============
export function getMyChatThread() { return apiClient.get<ChatMessage[]>('/chat/thread').then((r) => r.data); }
export function sendChatMessage(body: string) {
  return apiClient.post<ChatMessage>('/chat/thread/messages', { body }).then((r) => r.data);
}
export function listChatThreads() { return apiClient.get<ChatThreadSummary[]>('/system-admin/chat/threads').then((r) => r.data); }
export function getChatThreadMessages(threadId: number) {
  return apiClient.get<ChatMessage[]>(`/system-admin/chat/threads/${threadId}/messages`).then((r) => r.data);
}
export function sendChatThreadMessage(threadId: number, body: string) {
  return apiClient.post<ChatMessage>(`/system-admin/chat/threads/${threadId}/messages`, { body }).then((r) => r.data);
}

// ============ Aggregator (chain admin) ============
export interface CreateVenueRequest {
  name: string; type: VenueType; city: string; district?: string; address?: string;
  cuisine?: string; phone?: string; description?: string; latitude?: number; longitude?: number;
}
export interface CreateVenueAdminRequest {
  venueId: number; phone: string; password: string; fullName: string; email?: string;
}
export function listChainVenues() { return apiClient.get<ChainVenue[]>('/aggregator/venues').then((r) => r.data); }
export function createChainVenue(req: CreateVenueRequest) {
  return apiClient.post<ChainVenue>('/aggregator/venues', req).then((r) => r.data);
}
export function setVenueActive(venueId: number, active: boolean) {
  return apiClient.patch<ChainVenue>(`/aggregator/venues/${venueId}/active`, { active }).then((r) => r.data);
}
export function listVenueAdmins() { return apiClient.get<VenueAdminAccount[]>('/aggregator/admins').then((r) => r.data); }
export function createVenueAdmin(req: CreateVenueAdminRequest) {
  return apiClient.post<VenueAdminAccount>('/aggregator/admins', req).then((r) => r.data);
}
export function getChainStats() { return apiClient.get<ChainStats>('/aggregator/stats').then((r) => r.data); }

// ============ System Admin ============
export interface CreateChainRequest {
  name: string; adminPhone: string; adminPassword: string; adminFullName: string; adminEmail?: string;
}
export function getPlatformOverview() { return apiClient.get<PlatformOverview>('/system-admin/overview').then((r) => r.data); }
export function listAllChains() { return apiClient.get<ChainSummary[]>('/system-admin/chains').then((r) => r.data); }
export function createChain(req: CreateChainRequest) {
  return apiClient.post<ChainSummary>('/system-admin/chains', req).then((r) => r.data);
}
export function listAllVenues() { return apiClient.get<AdminVenue[]>('/system-admin/venues').then((r) => r.data); }
export function createIndependentVenue(req: CreateVenueRequest) {
  return apiClient.post<AdminVenue>('/system-admin/venues', req).then((r) => r.data);
}
export function createVenueAdminAnywhere(req: CreateVenueAdminRequest) {
  return apiClient.post<VenueAdminAccount>('/system-admin/venues/admins', req).then((r) => r.data);
}
export function moderateVenue(venueId: number, status: VenueModerationStatus) {
  return apiClient.patch<AdminVenue>(`/system-admin/venues/${venueId}/moderate`, { status }).then((r) => r.data);
}
export function setVenueActiveAnywhere(venueId: number, active: boolean) {
  return apiClient.patch<AdminVenue>(`/system-admin/venues/${venueId}/active`, { active }).then((r) => r.data);
}
export function assignVenueChain(venueId: number, chainId: number | null) {
  return apiClient.patch<AdminVenue>(`/system-admin/venues/${venueId}/chain`, { chainId }).then((r) => r.data);
}
export function assignVenueTariff(venueId: number, tariffPlanId: number | null) {
  return apiClient.patch<AdminVenue>(`/system-admin/venues/${venueId}/tariff`, { tariffPlanId }).then((r) => r.data);
}
export function getVenueTariffHistory(venueId: number) {
  return apiClient.get<TariffAssignmentHistoryEntry[]>(`/system-admin/venues/${venueId}/tariff-history`).then((r) => r.data);
}
export function listPlatformReviews() { return apiClient.get<PlatformReview[]>('/system-admin/reviews').then((r) => r.data); }
export function deletePlatformReview(reviewId: number) { return apiClient.delete(`/system-admin/reviews/${reviewId}`); }
export function createCity(name: string) { return apiClient.post('/system-admin/cities', { name }); }
export function deleteCity(cityId: number) { return apiClient.delete(`/system-admin/cities/${cityId}`); }
export function createDistrict(cityId: number, name: string) {
  return apiClient.post('/system-admin/districts', { cityId, name });
}
export function deleteDistrict(districtId: number) { return apiClient.delete(`/system-admin/districts/${districtId}`); }

export function listAllArticles() { return apiClient.get<Article[]>('/system-admin/articles').then((r) => r.data); }
export interface ArticleRequest {
  title: string; coverImageUrl?: string; categoryId?: number | null; content: string; published: boolean;
}
export function createArticle(req: ArticleRequest) { return apiClient.post<Article>('/system-admin/articles', req).then((r) => r.data); }
export function updateArticle(id: number, req: ArticleRequest) {
  return apiClient.put<Article>(`/system-admin/articles/${id}`, req).then((r) => r.data);
}
export function deleteArticle(id: number) { return apiClient.delete(`/system-admin/articles/${id}`); }
export function listAllArticleCategories() { return apiClient.get<ArticleCategory[]>('/system-admin/article-categories').then((r) => r.data); }
export function createArticleCategory(name: string) {
  return apiClient.post<ArticleCategory>('/system-admin/article-categories', { name }).then((r) => r.data);
}
export function deleteArticleCategory(id: number) { return apiClient.delete(`/system-admin/article-categories/${id}`); }

export function listAllBanners() { return apiClient.get<Banner[]>('/system-admin/banners').then((r) => r.data); }
export interface BannerRequest {
  venueId: number; title: string; subtitle?: string; imageUrl: string; active: boolean; sortOrder: number;
}
export function createBanner(req: BannerRequest) { return apiClient.post<Banner>('/system-admin/banners', req).then((r) => r.data); }
export function updateBanner(id: number, req: BannerRequest) {
  return apiClient.put<Banner>(`/system-admin/banners/${id}`, req).then((r) => r.data);
}
export function deleteBanner(id: number) { return apiClient.delete(`/system-admin/banners/${id}`); }

export function listAllTariffs() { return apiClient.get<TariffPlan[]>('/system-admin/tariffs').then((r) => r.data); }
export interface TariffPlanRequest {
  name: string; price: number; billingPeriod: BillingPeriod; description?: string; active: boolean; sortOrder: number;
}
export function createTariff(req: TariffPlanRequest) { return apiClient.post<TariffPlan>('/system-admin/tariffs', req).then((r) => r.data); }
export function updateTariff(id: number, req: TariffPlanRequest) {
  return apiClient.put<TariffPlan>(`/system-admin/tariffs/${id}`, req).then((r) => r.data);
}
export function deleteTariff(id: number) { return apiClient.delete(`/system-admin/tariffs/${id}`); }

// ============ Uploads ============
export function uploadImageAsync(uri: string): Promise<string> {
  const form = new FormData();
  const filename = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1] : 'jpg';
  form.append('file', { uri, name: filename, type: `image/${ext}` } as any);
  return apiClient
    .post<{ url: string }>('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data.url);
}

export { API_BASE_URL };

// ---- Waiter accounts (created/managed by venue-admin or aggregator, not self-registered) ----

export interface CreateWaiterRequest { phone: string; password: string; fullName: string; commissionPercent: number | null; }
export interface UpdateWaiterRequest { commissionPercent?: number | null; qrScanEnabled?: boolean; }

export function listWaiters() { return apiClient.get<Waiter[]>('/venue-admin/waiters').then((r) => r.data); }
export function createWaiter(req: CreateWaiterRequest) {
  return apiClient.post<Waiter>('/venue-admin/waiters', req).then((r) => r.data);
}
export function updateWaiter(id: number, req: UpdateWaiterRequest) {
  return apiClient.put<Waiter>(`/venue-admin/waiters/${id}`, req).then((r) => r.data);
}
export function deleteWaiter(id: number) { return apiClient.delete(`/venue-admin/waiters/${id}`); }

// Aggregator's chain-wide view/control over waiters (across all its venues)
export function listChainWaiters() { return apiClient.get<Waiter[]>('/aggregator/waiters').then((r) => r.data); }
export function setChainWaiterQrScan(id: number, enabled: boolean) {
  return apiClient.patch<Waiter>(`/aggregator/waiters/${id}/qr-scan`, { enabled }).then((r) => r.data);
}
export function aggregatorScanCheckIn(venueId: number, bookingId: number) {
  return apiClient.patch<void>(`/aggregator/venues/${venueId}/bookings/${bookingId}/check-in`);
}

// ---- The waiter's own actions ----

export function clockIn(latitude: number, longitude: number) {
  return apiClient.post<ShiftStatus>('/waiter/clock-in', { latitude, longitude }).then((r) => r.data);
}
export function clockOut() { return apiClient.post<ShiftStatus>('/waiter/clock-out').then((r) => r.data); }
export function getShiftStatus() { return apiClient.get<ShiftStatus>('/waiter/shift-status').then((r) => r.data); }

export function openOrder(tableUnitId: number, bookingId?: number) {
  return apiClient.post<TableOrder>('/waiter/orders', { tableUnitId, bookingId }).then((r) => r.data);
}
export function listMyOpenOrders() { return apiClient.get<TableOrder[]>('/waiter/orders').then((r) => r.data); }
export function getOrder(id: number) { return apiClient.get<TableOrder>(`/waiter/orders/${id}`).then((r) => r.data); }
export function addOrderItem(orderId: number, menuItemId: number, quantity: number) {
  return apiClient.post<TableOrder>(`/waiter/orders/${orderId}/items`, { menuItemId, quantity }).then((r) => r.data);
}
export function removeOrderItem(orderId: number, itemId: number) {
  return apiClient.delete(`/waiter/orders/${orderId}/items/${itemId}`);
}
export function closeOrder(orderId: number) {
  return apiClient.patch<TableOrder>(`/waiter/orders/${orderId}/close`).then((r) => r.data);
}
export function getWaiterHistory() { return apiClient.get<WaiterHistory>('/waiter/history').then((r) => r.data); }
export function waiterCheckIn(bookingId: number) {
  return apiClient.patch<void>(`/waiter/bookings/${bookingId}/check-in`);
}
