export type Role = 'CLIENT' | 'WAITER' | 'VENUE_ADMIN' | 'AGGREGATOR_ADMIN' | 'SYSTEM_ADMIN';
export type VenueType = 'RESTAURANT' | 'TEAHOUSE' | 'CAFE';
export type ConfirmationMode = 'AUTO' | 'MANUAL';
export type TableZoneType =
  | 'STANDARD' | 'VIP' | 'VERANDA' | 'BANQUET'
  | 'TEAHOUSE_MALE' | 'TEAHOUSE_FAMILY' | 'TEAHOUSE_MIXED' | 'OTHER';

export type BookingStatus =
  | 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'EXPIRED';

export type BookingSource = 'WEB' | 'ADMIN_MANUAL';
export type BillingPeriod = 'MONTHLY' | 'YEARLY';
export type VenueModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AuthUser {
  id: number;
  phone: string;
  fullName: string;
  email?: string | null;
  role: Role;
  venueId?: number | null;
  chainId?: number | null;
  preferredLanguage?: string | null;
  referralCode?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface ReferralSummary {
  code: string;
  siteRegisterUrl: string;
  botDeepLink: string;
  invitedCount: number;
  rewardedCount: number;
  rewardPoints: number;
}

export interface DaySchedule {
  dayOfWeek: number;
  closed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface VenueSummary {
  id: number;
  name: string;
  type: VenueType;
  city: string;
  district: string | null;
  cuisine: string | null;
  coverPhotoUrl: string | null;
  avgRating: number | null;
  reviewsCount: number;
  distanceKm: number | null;
  /** live seating availability for today — populated by the catalog endpoint */
  freeTables?: number | null;
  totalTables?: number | null;
  /** cheapest average cheque, in so'm */
  priceFrom?: number | null;
}

export interface TableUnit {
  id: number;
  hallId: number;
  name: string;
  description: string | null;
  zoneType: TableZoneType;
  capacityMin: number;
  capacityMax: number;
  photos: string[];
  active: boolean;
}

export interface Hall {
  id: number;
  name: string;
  description: string | null;
  tables: TableUnit[];
}

export interface MenuItem {
  id: number;
  category: string;
  name: string;
  description: string | null;
  priceSum: number;
  photoUrl: string | null;
  signature: boolean;
  sortOrder: number;
}

export interface VenueDetail {
  id: number;
  name: string;
  type: VenueType;
  description: string | null;
  city: string;
  district: string | null;
  address: string | null;
  cuisine: string | null;
  phone: string | null;
  coverPhotoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  workingHours: DaySchedule[];
  confirmationMode: ConfirmationMode;
  confirmationTimeoutMinutes: number;
  cancellationCutoffHours: number;
  slotDurationMinutes: number;
  eveningStartTime: string;
  eveningSlotDurationMinutes: number;
  bufferMinutes: number;
  active: boolean;
  avgRating: number | null;
  reviewsCount: number;
  halls: Hall[];
  menuItems: MenuItem[];
  moderationStatus: VenueModerationStatus;
}

export interface Booking {
  id: number;
  venueId: number;
  venueName: string;
  tableUnitId: number;
  tableUnitName: string;
  clientUserId: number | null;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  comment: string | null;
  status: BookingStatus;
  source: BookingSource;
  createdAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface Review {
  id: number;
  venueId: number;
  bookingId: number;
  clientUserId: number;
  clientName: string;
  rating: number;
  comment: string | null;
  adminReply: string | null;
  createdAt: string;
}

export interface ClientSummary {
  guestPhone: string;
  guestName: string;
  visitsCount: number;
  noShowCount: number;
  cancelledCount: number;
  lastVisitDate: string | null;
}

export interface DailyCount { date: string; count: number; }

export interface VenueStats {
  totalBookingsLast30Days: number;
  byStatus: Record<string, number>;
  noShowRatePercent: number;
  avgRating: number | null;
  reviewsCount: number;
  occupancyRatePercent: number;
  dailySeriesLast30Days: DailyCount[];
}

export interface StopListEntry { id: number; date: string; reason: string | null; }

export interface City { id: number; name: string; }
export interface District { id: number; cityId: number; name: string; }

export interface ArticleCategory { id: number; name: string; }
export interface ArticleSummary {
  id: number; title: string; coverImageUrl: string | null;
  categoryId: number | null; categoryName: string | null;
  excerpt: string; createdAt: string;
}
export interface Article {
  id: number; title: string; coverImageUrl: string | null;
  categoryId: number | null; categoryName: string | null;
  content: string; published: boolean; createdAt: string;
}

export interface Banner {
  id: number; venueId: number; venueName: string; title: string;
  subtitle: string | null; imageUrl: string; active: boolean; sortOrder: number;
}

export interface TariffPlan {
  id: number; name: string; price: number; billingPeriod: BillingPeriod;
  description: string | null; active: boolean; sortOrder: number;
}

export interface ChatMessage {
  id: number; senderUserId: number; senderName: string; senderRole: Role;
  body: string; createdAt: string;
}
export interface ChatThreadSummary {
  id: number; adminUserId: number; adminName: string; adminRole: Role | null;
  contextLabel: string; lastMessagePreview: string | null;
  lastMessageAt: string | null; unreadCount: number;
}

export interface ChainVenue {
  id: number; name: string; type: VenueType; city: string; active: boolean;
  confirmationMode: ConfirmationMode; avgRating: number | null; adminCount: number;
}
export interface VenueAdminAccount {
  id: number; phone: string; fullName: string; venueId: number; venueName: string;
}
export interface VenueStatRow {
  venueId: number; venueName: string; bookingsLast30Days: number;
  noShowRatePercent: number; avgRating: number | null;
}
export interface ChainStats {
  totalVenues: number; totalBookingsLast30Days: number;
  avgRatingAcrossChain: number | null; perVenue: VenueStatRow[];
}

export interface PlatformOverview {
  totalChains: number; totalVenues: number; independentVenues: number;
  pendingModeration: number; totalBookingsLast30Days: number;
  avgRatingPlatform: number | null; usersByRole: Record<string, number>;
}
export interface ChainSummary { id: number; name: string; venueCount: number; }
export interface AdminVenue {
  id: number; name: string; type: VenueType; city: string;
  chainId: number | null; chainName: string | null;
  tariffPlanId: number | null; tariffPlanName: string | null;
  active: boolean; moderationStatus: VenueModerationStatus; avgRating: number | null;
}
export interface PlatformReview {
  id: number; venueId: number; venueName: string; clientName: string;
  rating: number; comment: string | null; adminReply: string | null; createdAt: string;
}
export interface TariffAssignmentHistoryEntry {
  id: number; oldTariffName: string | null; newTariffName: string | null;
  changedByName: string; changedAt: string;
}

export interface TelegramLinkInfo {
  deepLink: string | null; connected: boolean; botConfigured: boolean;
}

export interface ChatTurn { role: 'user' | 'model'; text: string; }
export interface AiChatResponse {
  reply: string; detectedLanguage: string | null; date: string | null;
  time: string | null; guests: number | null; wishes: string | null;
  mentionedVenueName: string | null; matchedVenueId: number | null; matchedVenueName: string | null;
}

export const TABLE_ZONE_TYPES: TableZoneType[] = [
  'STANDARD', 'VIP', 'VERANDA', 'BANQUET', 'TEAHOUSE_MALE', 'TEAHOUSE_FAMILY', 'TEAHOUSE_MIXED', 'OTHER',
];

// ---- Waiter role: accounts, attendance, table orders (lightweight POS), earnings ----

export interface Waiter {
  id: number; phone: string; fullName: string; venueId: number | null;
  commissionPercent: number | null; qrScanEnabled: boolean; onDuty: boolean;
}

export interface ShiftStatus { onDuty: boolean; since: string | null; }

export interface OrderItemLine {
  id: number; menuItemId: number; name: string; unitPriceSum: number; quantity: number; lineTotalSum: number;
}

export type TableOrderStatus = 'OPEN' | 'CLOSED';

export interface TableOrder {
  id: number; tableUnitId: number; tableUnitName: string | null; bookingId: number | null;
  status: TableOrderStatus; openedAt: string; closedAt: string | null;
  totalSum: number; waiterEarningSum: number | null; items: OrderItemLine[];
}

export interface WaiterShiftSummary { id: number; clockInAt: string; clockOutAt: string | null; }

export interface WaiterHistory {
  totalEarningsSum: number; totalRevenueSum: number; totalOrdersClosed: number;
  recentOrders: TableOrder[]; recentShifts: WaiterShiftSummary[];
}
