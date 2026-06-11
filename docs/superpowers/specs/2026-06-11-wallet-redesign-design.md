# Wallet Redesign — Design Spec

Date: 2026-06-11
Status: Approved (brainstormed via visual companion; mockups in `.superpowers/brainstorm/15168-1781214310/content/`)

## Goal

Evolve the app from the current Material You look to a distinctive "Wallet" visual language: M3 token architecture underneath, premium-fintech typography and restraint on top, warmth from a paper-tinted palette and human microcopy. No generic-AI tells: no emojis in UI chrome, no blue-purple gradients, no decorative glass chips.

## 1. Design language

### Palette

Light:

| Token (existing role) | Value |
|---|---|
| background | `#F7F4EF` |
| surfaceContainerLowest (cards) | `#FFFFFF` |
| outlineVariant (hairlines) | `#E7E2D8` |
| separator inside cards | `#F0ECE3` |
| onSurface (ink) | `#26231D` |
| onSurfaceVariant | `#6E6A61` |
| placeholder / muted | `#9B968B` |
| primary | `#0066FF` (unchanged) |
| income | `#3E7049` (container `#DDF0E0`) |
| food amber icon | `#A8702E` on `#F6E8D8` |
| transport/mobile rust icon | `#B85C38` on `#FCE4D6` |

Dark:

| Token | Value |
|---|---|
| background | `#15130F` |
| card | `#1D1B16` |
| hairline | `#2B2820` |
| separator | `#26231D` |
| ink | `#F2EFE8` |
| muted | `#A6A095` / `#6E695F` |
| primary (on-dark accent for links/dots) | `#7FA9FF`; FAB/card keep `#0066FF` |
| income | `#7FB389` (container `#1F3324`) |

Rules:
- `#0066FF` is the only saturated color outside icon containers and the payment cards.
- All M3 role names in `theme.ts` are preserved; values are re-seeded warm. Legacy aliases keep working but shrink over time (see §4).
- Warmth via palette + microcopy, never emojis. One factual-warm insight line per screen max (e.g. "Up ₵940 this week — steady.").

### Typography

- Family: **Manrope** via `@expo-google-fonts/manrope` + `expo-font`, weights 300/400/600/700, bundled offline.
- `theme.ts` typescale recipes gain `fontFamily`; display/headline weight drops 800→600.
- Money: tabular numerals everywhere (`fontVariant: ["tabular-nums"]`), decimals rendered smaller and muted (`.00` at ~55% size, low-contrast color).

### Iconography

- `lucide-react-native`, strokeWidth 2.
- Category icons sit in 34px tonal circles tinted per category (muted warm tints, not saturated).
- Auto-logged transactions: small `#0066FF` lightning badge bottom-right of the icon circle, 2px border in card background color.

### Elevation

- Cards: flat, 1px hairline border, radius 14.
- Real shadow only on: payment card (tinted `rgba(0,70,180,.25)`), modals, tab bar.

## 2. Components

### PaymentCard (rebuilds `src/components/dashboard/BalanceCard.tsx`)

- Credit-card aspect ratio 1.586:1, radius 14–16.
- Anatomy: currency name top-left (uppercase, letterspaced); contactless arcs (SVG) top-right; gold chip (`#E8D9A8`→`#C9B26E` gradient rect); balance in embossed-number position, weight 600 tabular with subtle emboss text-shadow; bottom row = `IN ₵x · OUT ₵y` (cardholder-name position) + generic two-overlapping-circles roundel (NOT Mastercard's trademarked mark).
- Subtle card art: one large circle arc outline at ~5% white, top-right. Nothing else.
- Pager behavior preserved: horizontal snap scroll, next-card peek, animated dots.
- Per-currency colors: GHS `#0066FF→#0047B8`, NGN `#0E7C52→#085C3B`, USD graphite `#3A3F4A→#23272F`, fallback cycle: plum `#6D3FA0`, teal `#0E6E7C`, maroon `#8C3A4B`.
- Growth pill and insight line move OFF the card onto the page.

### StatChip

Icon in 30px tonal rounded-square + label (10–11pt muted) + value (14–15pt, 600, tabular). Used on Dashboard, Budget, Reports.

### ListRow

Icon circle + title/subtitle + right-aligned tabular amount. Rows live inside one bordered card container with inset hairline separators (`marginHorizontal: 12`). Income amounts green; expenses plain ink (not red — red reserved for errors/overbudget).

### FloatingTabBar v2

- Ink pill: `#26231D` bg in light mode, `#F2EFE8` in dark (inverts).
- 4 lucide icons (home, book-open, pie-chart, sliders) + 4px active dot under the active icon; spring indicator animation kept.
- Integrated 30px `#0066FF` round `+` button at right; opens TransactionEntryModal as quick-add with cashbook picker.

### Buttons / inputs / modals

Restyle to warm tokens: filled = primary, tonal = warm container, outlined = hairline. Modals keep current sheet behavior, surfaces move to warm values, radius 20 top corners.

## 3. Phasing

1. **Foundation + core**: theme re-seed, font loading, PaymentCard, ListRow, StatChip, FloatingTabBar v2, DashboardScreen, BusinessesScreen, BudgetDashboardScreen, SettingsScreen, TransactionEntryModal, TransactionDetailModal.
2. **Detail screens**: BusinessDetailView, ReportsScreen (chart palette re-harmonized to warm), BudgetSetupScreen, DebtTrackerScreen, CategoryManagementScreen, RecurringTransactionsScreen, remaining modals.
3. **Auxiliary**: autoLogging screens (Onboarding, Settings, ReviewQueue, SenderMappings), LockScreen, PinSetupScreen, SplashScreen; update or retire `src/components/illustrations` to match.

Each phase gates on: `npx tsc -b` clean, jest suite green, visual pass in Expo.

## 4. Implementation approach

Re-seed in place: update values in `theme.ts` under existing token names; un-migrated screens stay coherent because they already read tokens. No parallel theme system.

Riding cleanup: as each screen is touched, migrate its legacy aliases (`card`, `sage`, `incomeBg`, `gradientStart`…) to proper M3 roles, shrinking the legacy block.

Font loading: `useFonts` in `App.tsx` root; splash holds until fonts ready (existing 3s minimum splash already covers this).

## 5. Testing & verification

- Existing jest suite must stay green (parser/business logic untouched).
- `npx tsc -b` after every phase.
- Visual verification in Expo Go/dev client per phase, light + dark.
- No new test bloat: theme values don't get unit tests; component behavior changes (e.g. PaymentCard pager) keep whatever tests exist.

## Out of scope

- New features, navigation changes (other than the quick-add FAB), data model changes.
- App icon / store assets (separate ASO effort).
