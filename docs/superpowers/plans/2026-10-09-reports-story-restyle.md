# Reports — "the story of your money" restyle

User ask (2026-10-09): restyle the Reports screen and use motion so the page tells a story.

## Concept

Reports today is a dashboard kit: chips, a chart carousel, three % cards, two lists. The restyle turns
it into a short narrative read top to bottom, each section answering the next natural question:

1. **What happened?** — hero: one plain sentence + a "money flow" bar.
2. **How did it unfold?** — month-by-month bars, latest month emphasised.
3. **Where did it go?** — ranked categories with share bars.
4. **Is it getting better?** — month-over-month as sentences, not % tiles.
5. **The big moments** — biggest expenses.

Stays inside the Wallet design language (memory: project_material_you_overhaul): warm paper tokens,
Manrope via `theme.fonts`, `MoneyText`, `CategoryIcon`, hairline flat cards, #0066FF single accent,
red only for overspend, no ALL-CAPS labels (current `statLabel` uppercase is removed), theme tokens only.

## Tokens

- Came in: `colors.income` on a `colors.incomeContainer` track.
- Went out: `colors.inverseSurface` (ink) — expenses render plain ink per Wallet rules.
- Overspend (expense > income): excess segment `colors.expense`.
- Text: `onSurface` / `onSurfaceVariant`; cards `card` + `border` hairline.
- Type: hero sentence `typescale.headlineSmall`-ish (Manrope semibold 24/32), hero net figure
  `MoneyText` 40 light; section titles semibold 15 sentence case.

## Layout (phone)

```
[<-] Reports
(All)(Biz A)(Biz B)            <- unchanged filters, chips restyled only lightly
(This month)(3 months)(6 months)(12 months)

Last 3 months
You kept GHS 1,240            <- count-up
of the GHS 5,800 that came in.
[==========ink=========|=green kept=]   <- flow bar
Came in 5,800 · Went out 4,560 · Kept 1,240   (three small columns, no dots in UI)
Includes GHS 82 in fees and taxes.    (only when fees > 0)

Month by month
Oct  in 2,100  out 1,600         <- detail line for selected month (default latest)
| |  | |  | |                    <- bars grow left->right, older months muted, tap to select
Aug  Sep  Oct

Where it went
Food took 34% of your spending.
(icon) Food        GHS 1,540  [=======   ]
...

Compared with last month
↓ Spending is 12% lower
↑ Income is 8% higher
↑ You kept 20% more

Biggest expenses
(icon) Rent  ·  Oct 1        GHS 1,200
```

## Motion (one orchestrated moment + responsive motion)

- **Opening sequence (the one moment)**: hero sentence fades in; net figure counts up (700ms,
  ease-out cubic); flow bar: track appears, ink "went out" segment sweeps in from the left
  (scaleX, transformOrigin left, native driver), then the kept remainder settles. ~1.1s total.
- **Below the fold**: trend bars rise staggered left→right (time passing, 40ms stagger, scaleY from
  bottom); category bars fill staggered top→bottom. These play once on mount — not on every scroll.
- **Response to user action**: changing period or cashbook replays the sequence (story re-told for
  the new slice) by keying the story container on `${period}:${businessId}`. Tapping a month bar
  swaps the detail line (instant, plus bar opacity transition).
- **Reduced motion**: `AccessibilityInfo.isReduceMotionEnabled` + change listener; when on, all
  values jump to final state, count-up shows final number.
- RN `Animated` only (no new deps; reanimated is not installed). All transform/opacity on native driver.

## Code structure

- `src/utils/reportStory.ts` (pure, unit-tested): `buildPeriodSummary(transactions, start, end)` →
  `{ income, expense, net, fees }`; `heroCopy(summary)` → `{ lead, amount, tail, tone }` covering
  kept / overspent / no income / break-even; `changeSentence(kind, pct)` → copy for MoM rows
  (handles 0 / no prior data → "No change from last month" / "Not enough history yet").
- `src/components/reports/useReducedMotion.ts`, `useCountUp.ts`.
- `src/components/reports/StoryHero.tsx`, `FlowBar.tsx`, `MonthTrend.tsx`, `CategoryStory.tsx`,
  `ComparisonStory.tsx`, `BiggestExpenses.tsx`.
- `ReportsScreen.tsx` keeps data derivation + filters, shrinks well under 500 lines.
- `PairedBarChart`, `DonutChart`, `ChartCarousel` untouched (still used by BusinessDetailView).

## Edge cases

- No data in period → existing EmptyScene (copy tweaked to direct action: "Add a transaction to see
  your report for this period.").
- Income 0, expense > 0; expense 0, income > 0; both equal; overspend.
- `getMonthComparison` returns 0 when last month had nothing → "Not enough history yet" wording only
  when last month is truly empty (needs raw totals: extend summary call for last month instead of
  changing getMonthComparison signature).
- 12-month period: 12 bar pairs must fit at 320dp width → bar width computed from measured width
  (onLayout), not `Dimensions` at import.
- "All" with mixed currencies: unchanged existing behaviour (symbol of first cashbook).

## Verification

jest (new reportStory tests + existing suite), `npx tsc -b` (fallback `npx tsc --noEmit`),
`expo export` bundle, Opus code review, fresh-eyes pass. Device check by user.

## As shipped (after device test + owner feedback, 2026-10-09)

- Owner asked to keep the old swipeable graphs: the custom month-by-month chart was dropped and the
  original `ChartCarousel` (Monthly Trends paired bars + Expense Breakdown donut) sits after the hero,
  drawn card-less via a new `bare` prop.
- Colours match the old graphs: expenses use `colors.chart[3]` (not ink); category share bars use the
  same per-category colours as the donut.
- Bottom padding 120 so the last section clears the floating tab bar.
- Verified on device (demo build): opening sequence, scroll-triggered reveals, period/cashbook replay,
  12-month compact labels, transfer + mixed-currency notes, `transformOrigin` scale on Android.
