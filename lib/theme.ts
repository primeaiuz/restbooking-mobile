// Палитра портирована 1:1 с tailwind.config.js актуального сайта RestBooking
// (frontend-REDESIGNED-navy-gold) — редизайн по Figma: тёплая светлая «издательская»
// тема. Крем — фон, белый — карточки, золото (brand) — основное действие,
// олива (forest) — брендовая метка / кнопка «Забронировать» / бары занятости,
// приглушённый зелёный (accent) — подтверждения/успех, медь (gold/saffron) —
// рейтинги/ожидание, рубин (danger) — отмена/ошибка, сапфир — инфо/ИИ-помощник.

export const colors = {
  bg: '#fbf6ee', // cream-100 (фон экрана, тёплый кремовый)
  bgElevated: '#ffffff', // cream-50 (приподнятая поверхность / карточка)
  card: '#ffffff', // cream-50
  cardBorder: 'rgba(38,36,29,0.10)', // ink-900 @ ~10%
  band: '#f4ebda', // cream-200 (тёплая плашка-акцент)

  primary: '#c1912f', // brand-500 (золото — основное действие)
  primaryLight: '#cfa344', // brand-400
  primaryDark: '#a87b22', // brand-600
  primarySoft: 'rgba(193,145,47,0.14)', // brand-500 @ ~14%

  forest: '#455330', // forest-600 (олива — брендовая метка, header CTA)
  forestDark: '#374128', // forest-700
  forestSoft: 'rgba(69,83,48,0.12)',

  accent: '#3a7a56', // chaikhana-500 (приглушённый зелёный — успех/подтверждение)
  accentDark: '#274f3a', // chaikhana-700
  accentSoft: 'rgba(58,122,86,0.14)',

  gold: '#c2740e', // saffron-500 (медь — рейтинги/ожидание)
  goldDark: '#7d490b', // saffron-700

  text: '#26241d', // ink-900 (заголовки, тёмный тёплый графит)
  textMuted: '#6b6659', // ink-600
  textFaint: '#8c8677', // ink-500

  success: '#3a7a56', // chaikhana-500
  successSoft: 'rgba(58,122,86,0.14)',
  warning: '#c2740e', // saffron-500
  warningSoft: 'rgba(194,116,14,0.14)',
  warningDark: '#7d490b', // saffron-700
  danger: '#a3202f', // ruby-500
  dangerSoft: 'rgba(163,32,47,0.12)',
  white: '#ffffff',
  black: '#1b1a16', // тёмная «пилюля»-кнопка на светлых плашках

  // Затемнение поверх фотографий (кнопки-иконки, подписи баннеров) — тёплый ink,
  // а не холодный navy/slate из старой тёмной темы. Соответствует градиенту
  // `from-ink-900/80` на VenuePage.tsx сайта.
  scrim: 'rgba(38,36,29,0.6)', // ink-900 @ 60%
  scrimStrong: 'rgba(38,36,29,0.72)', // ink-900 @ 72%
  onScrimMuted: 'rgba(255,255,255,0.85)', // приглушённый текст поверх scrim (аналог text-white/90 на сайте)
};

// Serif дисплейный шрифт (Lora) — как на сайте: заголовки серифом, текст — системным.
export const fonts = {
  display: 'Lora_600SemiBold',
  displayMedium: 'Lora_500Medium',
  displayItalic: 'Lora_500Medium_Italic',
  displayBold: 'Lora_700Bold',
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32,
};

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 999,
};

// Соответствует StatusBadge.tsx на сайте — возвращаем насыщенный (читаемый на
// светлом фоне) цвет текста, Badge сам вычисляет мягкий фон с прозрачностью
export const statusColor: Record<string, string> = {
  PENDING: '#9e5d0c', // saffron-600
  CONFIRMED: '#2f6347', // chaikhana-600
  DECLINED: '#8a1b28', // ruby-600
  CANCELLED: '#6b6659', // ink-600
  COMPLETED: '#234c8a', // sapphire-600
  NO_SHOW: '#8a1b28', // ruby-600
  EXPIRED: '#6b6659', // ink-600
  APPROVED: '#2f6347', // chaikhana-600
  REJECTED: '#8a1b28', // ruby-600
};

// Градиенты по типу заведения — заглушка под фото в карточке (как TYPE_ACCENT
// в VenueCard.tsx на сайте). Приглушённые, под тёплую светлую тему.
export const venueTypeGradient: Record<string, [string, string]> = {
  RESTAURANT: ['#cfa344', '#a87b22'], // brand-400 -> brand-600 (золото)
  TEAHOUSE: ['#5c6f3e', '#374128'], // forest-500 -> forest-700 (олива)
  CAFE: ['#d17f2c', '#7d490b'], // saffron-400 -> saffron-700 (медь)
};
