# Wallet Redesign — Phase 2 Playbook

Spec: `docs/superpowers/specs/2026-06-11-wallet-redesign-design.md`. Phase 1 (merged) established the visual language; Phase 2 applies it to detail screens, remaining modals, and charts. Reference implementations: `src/screens/DashboardScreen.tsx`, `src/screens/SettingsScreen.tsx`, `src/screens/BusinessesScreen.tsx`, `src/components/TransactionDetailModal.tsx`.

## The conventions (apply to every file)

1. **Fonts — never `fontWeight` with text styles.** Replace every `fontWeight` with `fontFamily: theme.fonts.X`:
   - `"400"/"500"` → `theme.fonts.regular`
   - `"600"/"700"` → `theme.fonts.semibold`
   - `"800"` → `theme.fonts.semibold` (nothing heavier than 700 exists)
   - Large display money (≥28px) → `theme.fonts.light`
   - Money/stat values additionally get `fontVariant: ["tabular-nums"]` (in .ts style files: `as const`).
2. **Cards: flat + hairline.** `backgroundColor: theme.colors.card`, `borderColor: theme.colors.border`, `borderWidth: StyleSheet.hairlineWidth`, `borderRadius: 14` (16 for big feature cards). REMOVE `...theme.elevation.levelX` and `shadowColor` from cards. Elevation stays ONLY on: modals/sheets (level3), FABs (level3), bottom action bars (level2).
3. **Red is reserved** for errors/overbudget/destructive actions. Expense amounts and negative balances render `theme.colors.onSurface` (or `theme.colors.income` when positive). Expense icon containers → `theme.colors.surfaceContainerHigh` with `onSurfaceVariant` icon, NOT expenseContainer — except explicit type badges/toggles where expenseContainer (now warm clay) is fine.
4. **Money amounts** → render with `<MoneyText amount sign symbol size color />` (`src/components/MoneyText.tsx`) where the surrounding layout allows a drop-in; otherwise keep Text but apply font conventions.
5. **Transaction/category icons** → `<CategoryIcon category type autoLogged size />` (`src/components/CategoryIcon.tsx`) replaces letter-avatars in transaction rows.
6. **Headers**: screens get `fontSize: 22, fontFamily: theme.fonts.semibold` titles + optional 12px regular `onSurfaceVariant` subtitle. Remove `HeaderBackdrop` imports/usages and `headerDecoration` views. Detail screens keep their back-arrow header pattern but apply fonts.
7. **Legacy alias purge** in touched files: `colors.text`→`onSurface`, `textSecondary`→`onSurfaceVariant`, `textInverse`→`onPrimary`, `borderLight` stays (inset separators), `incomeBg/expenseBg`→`incomeContainer`/`surfaceContainerHigh`, `success`→`income`, `sage/sageSurface`→`surfaceContainerHigh`/`surfaceContainer`. (`colors.card`/`colors.border` are canonical for flat cards — keep.)
8. **Chips**: unselected = transparent + `outlineVariant` border + `onSurfaceVariant` regular text; selected = `inverseSurface` bg + `inverseOnSurface` semibold text (filter/selector chips) or `primary`/`onPrimary` (category pickers). Radius `theme.shape.full`.
9. **Inputs**: `surfaceContainerHigh` bg, radius 12, NO border, `fonts.regular`. Big amount inputs: `fonts.light` 34, tabular, bottom border `outlineVariant` 2px.
10. **Buttons**: filled = `primary`/`onPrimary` semibold, radius `shape.full`, no elevation. Tonal = `surfaceContainerHigh`/`onSurfaceVariant`.
11. **No emojis** in any UI string. No new hardcoded colors except white-ink-on-brand-gradient surfaces (PaymentCard pattern) and the literal `#0066FF` accent where spec demands.
12. **Charts** read `theme.colors.chart[]` (already re-seeded). Replace any old hardcoded chart hexes (`#7C4DFF`, `#00A877`, `chartBlue/chartPurple/chartGreen` aliases are fine) and red/green semantics per rule 3 (income series may stay green `theme.colors.income`; expense series use `theme.colors.chart[3]` rust or `onSurfaceVariant`, not error red).
13. **Do not change behavior** — props, handlers, navigation, data flow stay identical. Pure restyle except where this playbook says otherwise.

## File clusters

- **A (cashbook detail):** `src/screens/BusinessDetailView.tsx`, `src/components/CashbookDetailSheet.tsx`
- **B (reports + charts):** `src/screens/ReportsScreen.tsx`, `src/components/ChartCarousel.tsx`, `src/components/StatCard.tsx`, `src/components/dashboard/DonutChart.tsx`, `src/components/dashboard/WeeklyBarChart.tsx`, `src/components/dashboard/PairedBarChart.tsx`, `src/components/dashboard/StatsRow.tsx`, `src/components/dashboard/RecentTransactions.tsx`
- **C (budget setup + debt):** `src/screens/BudgetSetupScreen.tsx`, `src/screens/DebtTrackerScreen.tsx`, `src/components/DebtEntryModal.tsx`, `src/components/DebtPaymentModal.tsx`
- **D (categories + recurring):** `src/screens/CategoryManagementScreen.tsx`, `src/screens/RecurringTransactionsScreen.tsx`, `src/components/RecurringTransactionModal.tsx`
- **E (small modals + shared):** `src/components/CreateCashbookModal.tsx`, `src/components/TransferCashbookModal.tsx`, `src/components/DateRangePickerModal.tsx`, `src/components/BusinessChip.tsx`, `src/components/BusinessItem.tsx`, `src/components/TourOverlay.tsx`, `src/styles/globalStyles.ts`

Verification gate per cluster (run by the orchestrator, not agents): `npx tsc -b` clean, `npx jest` green, commit per cluster.
