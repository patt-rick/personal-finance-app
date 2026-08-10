# Cashbook Appearance (Color + Icon) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each cashbook a color + icon for quick identification, and reuse that styling in the three Android widgets.

**Architecture:** A shared, framework-agnostic appearance module (`src/features/cashbooks/appearance/`) holds a curated color palette, icon data derived from Lucide's own `iconNode` arrays, and pure resolver helpers. The app renders icons with Lucide's generic `Icon` component; the widget renders the identical glyph by converting the same `iconNode` to an SVG string for `SvgWidget`. `Business` gains optional `color`/`icon`; unset cashbooks resolve deterministically at read time.

**Tech Stack:** TypeScript, React Native (Expo SDK 54), `lucide-react-native@0.562`, `react-native-android-widget@0.22`, Jest (ts-jest, node env). Package manager: **npm** (per prior user decision for this repo).

---

## File Structure

**New files**
- `src/features/cashbooks/appearance/palette.ts` — curated `CASHBOOK_COLORS`.
- `scripts/genCashbookIcons.mjs` — dev codegen: reads Lucide `iconNode` arrays → generates `icons.data.ts`.
- `src/features/cashbooks/appearance/icons.data.ts` — **auto-generated** `CASHBOOK_ICON_NODES` + `CASHBOOK_ICON_KEYS`.
- `src/features/cashbooks/appearance/iconSvg.ts` — pure `iconNodeToSvg` + `cashbookIconSvg`.
- `src/features/cashbooks/appearance/resolve.ts` — pure `resolveCashbookColor`, `resolveCashbookIconKey`, `withAlpha`, `DEFAULT_CASHBOOK_ICON`.
- `src/features/cashbooks/appearance/icons.tsx` — app-only `CashbookIcon` (wraps Lucide `Icon`).
- `src/components/CashbookIconBadge.tsx` — reusable app badge (tinted square + icon).
- `src/components/CashbookAppearancePicker.tsx` — reusable color+icon picker.
- `__tests__/cashbooks/resolve.test.ts`, `__tests__/cashbooks/iconSvg.test.ts`, `__tests__/cashbooks/registry.test.ts`.

**Modified files**
- `src/types.ts` — add `color?`, `icon?` to `Business`.
- `src/features/widgets/services/widgetData.ts` — add `accent`/`iconKey` to views + `buildQuickAddView`.
- `src/features/widgets/components/{BalanceWidget,BudgetWidget,QuickAddWidget}.tsx` — icon badges.
- `src/features/widgets/services/widgetSync.ts`, `src/features/widgets/widgetTaskHandler.tsx`, `src/features/widgets/screens/WidgetConfigScreen.tsx` — quick-add uses `buildQuickAddView`.
- `__tests__/widgets/widgetData.test.ts` — update expectations for new fields.
- `src/components/CreateCashbookModal.tsx`, `src/components/CashbookDetailSheet.tsx`, `src/components/BusinessItem.tsx`, `src/screens/BusinessesScreen.tsx` — wire picker/badge.

---

## Task 1: Data model — `Business.color` + `Business.icon`

**Files:**
- Modify: `src/types.ts:1-9`

- [ ] **Step 1: Add optional fields**

In `src/types.ts`, change the `Business` interface to:

```ts
export interface Business {
    id: string;
    name: string;
    createdAt: string;
    memberCount?: number;
    hasNewActivity?: boolean;
    lastUpdated?: string;
    currency?: string; // e.g., 'USD', 'GHS', 'EUR'
    color?: string; // hex, e.g. "#7E57C2"
    icon?: string; // icon key, e.g. "shopping-cart"
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc -b`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add optional color and icon to Business"
```

---

## Task 2: Color palette + `resolveCashbookColor` (TDD)

**Files:**
- Create: `src/features/cashbooks/appearance/palette.ts`
- Create: `src/features/cashbooks/appearance/resolve.ts`
- Test: `__tests__/cashbooks/resolve.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/cashbooks/resolve.test.ts`:

```ts
import { CASHBOOK_COLORS } from "../../src/features/cashbooks/appearance/palette";
import {
    resolveCashbookColor,
    resolveCashbookIconKey,
    DEFAULT_CASHBOOK_ICON,
    withAlpha,
} from "../../src/features/cashbooks/appearance/resolve";

describe("resolveCashbookColor", () => {
    it("returns the stored color when it is a valid hex", () => {
        expect(resolveCashbookColor({ id: "x", color: "#123456" })).toBe("#123456");
    });

    it("ignores an invalid stored color and falls back deterministically", () => {
        const a = resolveCashbookColor({ id: "b1", color: "not-a-color" });
        const b = resolveCashbookColor({ id: "b1", color: undefined });
        expect(a).toBe(b);
        expect(CASHBOOK_COLORS).toContain(a);
    });

    it("is deterministic per id and varies across ids", () => {
        expect(resolveCashbookColor({ id: "b1" })).toBe(resolveCashbookColor({ id: "b1" }));
        // Two ids that hash to different buckets
        expect(resolveCashbookColor({ id: "aaaa" })).not.toBe(
            resolveCashbookColor({ id: "aaab" }),
        );
    });
});

describe("resolveCashbookIconKey", () => {
    it("defaults to wallet when unset", () => {
        expect(resolveCashbookIconKey({})).toBe(DEFAULT_CASHBOOK_ICON);
        expect(DEFAULT_CASHBOOK_ICON).toBe("wallet");
    });
});

describe("withAlpha", () => {
    it("prefixes an alpha byte and keeps the last 6 hex digits", () => {
        expect(withAlpha("#7E57C2", "22")).toBe("#227E57C2");
        expect(withAlpha("#FF7E57C2", "22")).toBe("#227E57C2");
    });
});
```

Note: `resolveCashbookIconKey`'s "known key" behavior is covered in Task 4 (after `icons.data.ts` exists). Here it only needs the default.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/cashbooks/resolve.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create the palette**

Create `src/features/cashbooks/appearance/palette.ts`:

```ts
import type { HexColor } from "react-native-android-widget";

// Curated, mid-tone palette chosen to stay legible as an icon stroke on both
// light and dark app surfaces and on the widget. This is feature DATA (a
// cashbook's chosen color), not UI chrome — analogous to Category colors.
export const CASHBOOK_COLORS: HexColor[] = [
    "#EF5350",
    "#EC407A",
    "#AB47BC",
    "#7E57C2",
    "#5C6BC0",
    "#42A5F5",
    "#26A69A",
    "#66BB6A",
    "#9CCC65",
    "#FFA726",
    "#8D6E63",
    "#78909C",
];
```

- [ ] **Step 4: Create the resolver (color + default icon + alpha)**

Create `src/features/cashbooks/appearance/resolve.ts`:

```ts
import type { HexColor } from "react-native-android-widget";
import { Business } from "../../../types";
import { CASHBOOK_COLORS } from "./palette";

export const DEFAULT_CASHBOOK_ICON = "wallet";

const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const hashToIndex = (seed: string, mod: number): number => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = (h * 31 + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % mod;
};

export const resolveCashbookColor = (
    business: Pick<Business, "id" | "color">,
): HexColor => {
    if (business.color && HEX_RE.test(business.color)) {
        return business.color as HexColor;
    }
    return CASHBOOK_COLORS[hashToIndex(business.id || "", CASHBOOK_COLORS.length)];
};

// Overridden in Task 4 to also validate against the icon registry. For now it
// only needs the default so the palette task can land independently.
export const resolveCashbookIconKey = (
    _business: Pick<Business, "icon">,
): string => DEFAULT_CASHBOOK_ICON;

// Produce an #AARRGGBB color from a 6- or 8-digit hex, using the last 6 digits.
export const withAlpha = (hex: string, alpha2: string): HexColor =>
    `#${alpha2}${hex.slice(-6)}` as HexColor;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/cashbooks/resolve.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/cashbooks/appearance/palette.ts src/features/cashbooks/appearance/resolve.ts __tests__/cashbooks/resolve.test.ts
git commit -m "feat: cashbook color palette and deterministic color resolver"
```

---

## Task 3: Icon data codegen from Lucide `iconNode`

**Files:**
- Create: `scripts/genCashbookIcons.mjs`
- Create (generated): `src/features/cashbooks/appearance/icons.data.ts`

- [ ] **Step 1: Write the codegen script**

Create `scripts/genCashbookIcons.mjs`:

```js
// Generates src/features/cashbooks/appearance/icons.data.ts from the iconNode
// arrays that lucide-react-native already ships. This guarantees the widget SVG
// and the app's Lucide component render the exact same glyph, with no runtime
// dependency on lucide-static. Re-run after changing ICON_KEYS.
import fs from "fs";
import path from "path";

const ICON_KEYS = [
    "wallet",
    "shopping-cart",
    "home",
    "briefcase",
    "car",
    "utensils",
    "plane",
    "heart",
    "gift",
    "graduation-cap",
    "piggy-bank",
    "building-2",
    "smartphone",
    "dumbbell",
];

const ICONS_DIR = "node_modules/lucide-react-native/dist/esm/icons";

const nodes = {};
for (const key of ICON_KEYS) {
    const file = path.join(ICONS_DIR, `${key}.js`);
    const src = fs.readFileSync(file, "utf8");
    const m = src.match(/createLucideIcon\(\s*"[^"]+"\s*,\s*(\[[\s\S]*?\])\s*\)\s*;/);
    if (!m) throw new Error(`Could not extract iconNode for "${key}" from ${file}`);
    // The literal uses unquoted keys (d:, key:), so evaluate it in a sandboxed
    // Function rather than JSON.parse. Source is a trusted installed package.
    const raw = new Function(`return ${m[1]};`)();
    // Drop the React "key" prop; keep only SVG attributes.
    nodes[key] = raw.map(([tag, attrs]) => [
        tag,
        Object.fromEntries(Object.entries(attrs).filter(([k]) => k !== "key")),
    ]);
}

const out =
    `// AUTO-GENERATED by scripts/genCashbookIcons.mjs — do not edit by hand.\n` +
    `// Regenerate with: node scripts/genCashbookIcons.mjs\n` +
    `import type { IconNode } from "lucide-react-native";\n\n` +
    `export const CASHBOOK_ICON_NODES: Record<string, IconNode> = ${JSON.stringify(
        nodes,
        null,
        4,
    )} as unknown as Record<string, IconNode>;\n\n` +
    `export const CASHBOOK_ICON_KEYS: string[] = Object.keys(CASHBOOK_ICON_NODES);\n`;

const dest = "src/features/cashbooks/appearance/icons.data.ts";
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out);
console.log(`Wrote ${dest} with ${ICON_KEYS.length} icons`);
```

- [ ] **Step 2: Run the codegen**

Run: `node scripts/genCashbookIcons.mjs`
Expected: `Wrote src/features/cashbooks/appearance/icons.data.ts with 14 icons`. If it throws "Could not extract"/ENOENT for a key, that Lucide name differs — fix the key in `ICON_KEYS` (check `ls node_modules/lucide-react-native/dist/esm/icons/ | grep <name>`) and re-run.

- [ ] **Step 3: Sanity-check the generated file**

Run: `head -20 src/features/cashbooks/appearance/icons.data.ts`
Expected: exports `CASHBOOK_ICON_NODES` with a `"wallet": [ ["path", { "d": "..." }], ... ]` entry and `CASHBOOK_ICON_KEYS`.

- [ ] **Step 4: Verify types compile**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add scripts/genCashbookIcons.mjs src/features/cashbooks/appearance/icons.data.ts
git commit -m "feat: generate cashbook icon data from lucide iconNode arrays"
```

---

## Task 4: `iconNodeToSvg` + `cashbookIconSvg` + icon-key validation (TDD)

**Files:**
- Create: `src/features/cashbooks/appearance/iconSvg.ts`
- Modify: `src/features/cashbooks/appearance/resolve.ts`
- Test: `__tests__/cashbooks/iconSvg.test.ts`
- Modify test: `__tests__/cashbooks/resolve.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/cashbooks/iconSvg.test.ts`:

```ts
import { iconNodeToSvg, cashbookIconSvg } from "../../src/features/cashbooks/appearance/iconSvg";

describe("iconNodeToSvg", () => {
    it("wraps nodes in a Lucide-style svg with the given stroke", () => {
        const svg = iconNodeToSvg([["path", { d: "M1 2" }]], "#FF0000", 20);
        expect(svg).toContain('stroke="#FF0000"');
        expect(svg).toContain('viewBox="0 0 24 24"');
        expect(svg).toContain('width="20"');
        expect(svg).toContain('<path d="M1 2" />');
        expect(svg.startsWith("<svg")).toBe(true);
    });
});

describe("cashbookIconSvg", () => {
    it("renders a known icon with the stroke color", () => {
        const svg = cashbookIconSvg("wallet", "#26A69A");
        expect(svg).toContain('stroke="#26A69A"');
        expect(svg).toContain("<path");
    });

    it("falls back to the default icon for an unknown key", () => {
        expect(cashbookIconSvg("does-not-exist", "#000000")).toBe(
            cashbookIconSvg("wallet", "#000000"),
        );
    });
});
```

Add to `__tests__/cashbooks/resolve.test.ts` inside the `resolveCashbookIconKey` describe:

```ts
    it("returns a stored key that exists in the registry", () => {
        expect(resolveCashbookIconKey({ icon: "shopping-cart" })).toBe("shopping-cart");
    });

    it("falls back to the default for an unknown stored key", () => {
        expect(resolveCashbookIconKey({ icon: "totally-unknown" })).toBe(DEFAULT_CASHBOOK_ICON);
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/cashbooks/iconSvg.test.ts __tests__/cashbooks/resolve.test.ts`
Expected: FAIL — `iconSvg` module missing; `resolveCashbookIconKey("shopping-cart")` currently returns `"wallet"`.

- [ ] **Step 3: Upgrade `resolveCashbookIconKey` to validate against the registry**

In `src/features/cashbooks/appearance/resolve.ts`, add the import at the top:

```ts
import { CASHBOOK_ICON_NODES } from "./icons.data";
```

and replace the placeholder `resolveCashbookIconKey` with:

```ts
export const resolveCashbookIconKey = (
    business: Pick<Business, "icon">,
): string => {
    if (business.icon && business.icon in CASHBOOK_ICON_NODES) {
        return business.icon;
    }
    return DEFAULT_CASHBOOK_ICON;
};
```

- [ ] **Step 4: Create `iconSvg.ts`**

Create `src/features/cashbooks/appearance/iconSvg.ts`:

```ts
import type { IconNode } from "lucide-react-native";
import { CASHBOOK_ICON_NODES } from "./icons.data";
import { resolveCashbookIconKey } from "./resolve";

// Rebuild the exact Lucide SVG wrapper so the widget glyph matches the app's
// <Icon> component. Lucide markup uses stroke="currentColor", which does not
// resolve inside SvgWidget, so callers pass an explicit hex stroke.
export const iconNodeToSvg = (
    nodes: IconNode,
    stroke: string,
    size = 24,
): string => {
    const inner = nodes
        .map(([tag, attrs]) => {
            const a = Object.entries(attrs)
                .map(([k, v]) => `${k}="${v}"`)
                .join(" ");
            return `<${tag} ${a} />`;
        })
        .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
};

export const cashbookIconSvg = (
    iconKey: string,
    stroke: string,
    size = 24,
): string => {
    const key = resolveCashbookIconKey({ icon: iconKey });
    return iconNodeToSvg(CASHBOOK_ICON_NODES[key], stroke, size);
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/cashbooks/iconSvg.test.ts __tests__/cashbooks/resolve.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/cashbooks/appearance/iconSvg.ts src/features/cashbooks/appearance/resolve.ts __tests__/cashbooks/iconSvg.test.ts __tests__/cashbooks/resolve.test.ts
git commit -m "feat: icon-node to SVG conversion and registry-validated icon keys"
```

---

## Task 5: Registry integrity test

**Files:**
- Test: `__tests__/cashbooks/registry.test.ts`

- [ ] **Step 1: Write the test**

Create `__tests__/cashbooks/registry.test.ts`:

```ts
import { CASHBOOK_COLORS } from "../../src/features/cashbooks/appearance/palette";
import {
    CASHBOOK_ICON_NODES,
    CASHBOOK_ICON_KEYS,
} from "../../src/features/cashbooks/appearance/icons.data";
import { DEFAULT_CASHBOOK_ICON } from "../../src/features/cashbooks/appearance/resolve";

describe("cashbook appearance registry", () => {
    it("palette entries are all valid 6-digit hex and unique", () => {
        const seen = new Set<string>();
        for (const c of CASHBOOK_COLORS) {
            expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(seen.has(c)).toBe(false);
            seen.add(c);
        }
        expect(CASHBOOK_COLORS.length).toBeGreaterThanOrEqual(8);
    });

    it("every icon key maps to a non-empty iconNode", () => {
        expect(CASHBOOK_ICON_KEYS.length).toBeGreaterThanOrEqual(8);
        for (const key of CASHBOOK_ICON_KEYS) {
            const nodes = CASHBOOK_ICON_NODES[key];
            expect(Array.isArray(nodes)).toBe(true);
            expect(nodes.length).toBeGreaterThan(0);
        }
    });

    it("includes the default icon", () => {
        expect(CASHBOOK_ICON_KEYS).toContain(DEFAULT_CASHBOOK_ICON);
    });
});
```

- [ ] **Step 2: Run the test**

Run: `npx jest __tests__/cashbooks/registry.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add __tests__/cashbooks/registry.test.ts
git commit -m "test: cashbook appearance registry integrity"
```

---

## Task 6: Widget view builders carry `accent` + `iconKey` (TDD)

**Files:**
- Modify: `src/features/widgets/services/widgetData.ts`
- Modify test: `__tests__/widgets/widgetData.test.ts`

- [ ] **Step 1: Update the existing tests first (they will fail)**

In `__tests__/widgets/widgetData.test.ts`, add this import near the top:

```ts
import {
    resolveCashbookColor,
    resolveCashbookIconKey,
} from "../../src/features/cashbooks/appearance/resolve";
```

Update the `buildBalanceView` "builds name, currency symbol, balance, and month flows" expectation to include the two new fields:

```ts
        expect(buildBalanceView(business(), txns, now)).toEqual({
            cashbookName: "Personal",
            currencySymbol: "₵",
            balance: 180,
            monthIncome: 300,
            monthExpense: 120,
            accent: resolveCashbookColor(business()),
            iconKey: resolveCashbookIconKey(business()),
        });
```

Add a new test for the quick-add builder at the end of the file:

```ts
describe("buildQuickAddView", () => {
    it("carries the cashbook name, accent, and icon key", () => {
        const b = business({ color: "#26A69A", icon: "shopping-cart" });
        expect(buildQuickAddView(b)).toEqual({
            cashbookName: "Personal",
            accent: "#26A69A",
            iconKey: "shopping-cart",
        });
    });
});
```

And extend the import from `widgetData` to include `buildQuickAddView`:

```ts
import {
    buildBalanceView,
    buildBudgetView,
    budgetDataForCashbook,
    buildQuickAddView,
} from "../../src/features/widgets/services/widgetData";
```

Also update any existing `buildBudgetView` `toEqual` assertions in this file: add `accent: resolveCashbookColor(business())` and `iconKey: resolveCashbookIconKey(business())` to each expected object (both the `noBudget:false` and `noBudget:true` cases). If a budget assertion uses a `business({...})` with a custom id/color, pass that same object to the resolvers.

- [ ] **Step 2: Run to verify failure**

Run: `npx jest __tests__/widgets/widgetData.test.ts`
Expected: FAIL — new fields missing, `buildQuickAddView` undefined.

- [ ] **Step 3: Implement the builder changes**

In `src/features/widgets/services/widgetData.ts`:

Add imports:

```ts
import type { HexColor } from "react-native-android-widget";
import { resolveCashbookColor, resolveCashbookIconKey } from "../../cashbooks/appearance/resolve";
```

Add `accent` + `iconKey` to `BalanceView`:

```ts
export interface BalanceView {
    cashbookName: string;
    currencySymbol: string;
    balance: number;
    monthIncome: number;
    monthExpense: number;
    accent: HexColor;
    iconKey: string;
}
```

Add `accent` + `iconKey` to **both** arms of `BudgetView`:

```ts
export type BudgetView =
    | {
          cashbookName: string;
          currencySymbol: string;
          periodLabel: string;
          totalSpent: number;
          totalLimit: number;
          percentage: number;
          noBudget: false;
          accent: HexColor;
          iconKey: string;
      }
    | {
          cashbookName: string;
          currencySymbol: string;
          noBudget: true;
          accent: HexColor;
          iconKey: string;
      };
```

Add a quick-add view type + builder:

```ts
export interface QuickAddView {
    cashbookName: string;
    accent: HexColor;
    iconKey: string;
}

export const buildQuickAddView = (business: Business): QuickAddView => ({
    cashbookName: business.name,
    accent: resolveCashbookColor(business),
    iconKey: resolveCashbookIconKey(business),
});
```

In `buildBalanceView`, add the two fields to the returned object:

```ts
    return {
        cashbookName: business.name,
        currencySymbol: getCurrencySymbol(business.currency),
        balance: computeCashbookBalance(transactions, business.id),
        monthIncome: income,
        monthExpense: expense,
        accent: resolveCashbookColor(business),
        iconKey: resolveCashbookIconKey(business),
    };
```

In `buildBudgetView`, add them to **both** returns:

```ts
    const accent = resolveCashbookColor(business);
    const iconKey = resolveCashbookIconKey(business);
    if (!budget) {
        return { cashbookName: business.name, currencySymbol, noBudget: true, accent, iconKey };
    }
    // ...
    return {
        cashbookName: business.name,
        currencySymbol,
        periodLabel: getPeriodDisplayName(budget.period),
        totalSpent,
        totalLimit,
        percentage,
        noBudget: false,
        accent,
        iconKey,
    };
```

- [ ] **Step 4: Run to verify pass**

Run: `npx jest __tests__/widgets/widgetData.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/widgets/services/widgetData.ts __tests__/widgets/widgetData.test.ts
git commit -m "feat: widget views carry cashbook accent and icon key"
```

---

## Task 7: Widget components render the icon badge

**Files:**
- Modify: `src/features/widgets/components/BalanceWidget.tsx`
- Modify: `src/features/widgets/components/BudgetWidget.tsx`
- Modify: `src/features/widgets/components/QuickAddWidget.tsx`

Use the frontend-design skill for these UI edits. No unit tests (RN widget primitives need a device to render); verify with `tsc` and on-device QA in Task 14. The budget bar keeps its usage-based color — accent is only for the header icon.

- [ ] **Step 1: Balance widget header with icon badge**

Replace `src/features/widgets/components/BalanceWidget.tsx` with:

```tsx
import React from "react";
import { FlexWidget, TextWidget, SvgWidget } from "react-native-android-widget";
import { BalanceView } from "../services/widgetData";
import { WidgetColors } from "../theme/widgetTheme";
import { cashbookIconSvg } from "../../cashbooks/appearance/iconSvg";
import { withAlpha } from "../../cashbooks/appearance/resolve";

const fmt = (symbol: string, n: number) =>
    `${symbol}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function BalanceWidget({
    view,
    colors,
    clickAction,
}: {
    view: BalanceView;
    colors: WidgetColors;
    clickAction: string;
}) {
    return (
        <FlexWidget
            style={{
                height: "match_parent",
                width: "match_parent",
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 12,
                flexDirection: "column",
                justifyContent: "center",
            }}
            clickAction={clickAction}
        >
            <FlexWidget style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                <FlexWidget
                    style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        backgroundColor: withAlpha(view.accent, "22"),
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 6,
                    }}
                >
                    <SvgWidget svg={cashbookIconSvg(view.iconKey, view.accent, 14)} style={{ width: 14, height: 14 }} />
                </FlexWidget>
                <TextWidget
                    text={view.cashbookName}
                    style={{ fontSize: 12, color: colors.onSurfaceVariant }}
                />
            </FlexWidget>
            <TextWidget
                text={`${view.balance < 0 ? "-" : ""}${fmt(view.currencySymbol, view.balance)}`}
                style={{ fontSize: 24, color: colors.onSurface }}
            />
            <FlexWidget style={{ flexDirection: "row", marginTop: 4 }}>
                <TextWidget
                    text={`↑ ${fmt(view.currencySymbol, view.monthIncome)}`}
                    style={{ fontSize: 12, color: colors.income, marginRight: 10 }}
                />
                <TextWidget
                    text={`↓ ${fmt(view.currencySymbol, view.monthExpense)}`}
                    style={{ fontSize: 12, color: colors.expense }}
                />
            </FlexWidget>
        </FlexWidget>
    );
}
```

- [ ] **Step 2: Budget widget header with icon badge**

In `src/features/widgets/components/BudgetWidget.tsx`, add imports:

```tsx
import { FlexWidget, TextWidget, SvgWidget } from "react-native-android-widget";
import { cashbookIconSvg } from "../../cashbooks/appearance/iconSvg";
import { withAlpha } from "../../cashbooks/appearance/resolve";
```

(the first line replaces the existing `import { FlexWidget, TextWidget } ...`). Then replace the standalone cashbook-name `TextWidget` (the first `TextWidget` after the outer `FlexWidget`, currently `text={view.cashbookName}`) with a header row:

```tsx
            <FlexWidget style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                <FlexWidget
                    style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        backgroundColor: withAlpha(view.accent, "22"),
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 6,
                    }}
                >
                    <SvgWidget svg={cashbookIconSvg(view.iconKey, view.accent, 13)} style={{ width: 13, height: 13 }} />
                </FlexWidget>
                <TextWidget
                    text={view.cashbookName}
                    style={{ fontSize: 12, color: colors.onSurfaceVariant }}
                />
            </FlexWidget>
```

Note: `view.accent`/`view.iconKey` are on both arms, but the `noBudget` early-return uses `MessageWidget` (no accent needed there) — leave that branch unchanged. Keep the existing `budgetBarColor` bar exactly as-is.

- [ ] **Step 3: Quick-add widget takes a view + shows the icon**

Replace `src/features/widgets/components/QuickAddWidget.tsx` with:

```tsx
import React from "react";
import { FlexWidget, TextWidget, SvgWidget } from "react-native-android-widget";
import { WidgetColors } from "../theme/widgetTheme";
import { QuickAddView } from "../services/widgetData";
import { cashbookIconSvg } from "../../cashbooks/appearance/iconSvg";

export function QuickAddWidget({
    view,
    colors,
    clickAction,
}: {
    view: QuickAddView;
    colors: WidgetColors;
    clickAction: string;
}) {
    return (
        <FlexWidget
            style={{
                height: "match_parent",
                width: "match_parent",
                backgroundColor: colors.primary,
                borderRadius: 16,
                padding: 12,
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
            }}
            clickAction={clickAction}
        >
            <SvgWidget svg={cashbookIconSvg(view.iconKey, colors.onPrimary, 20)} style={{ width: 20, height: 20 }} />
            <TextWidget text="+ Add expense" style={{ fontSize: 16, color: colors.onPrimary, marginTop: 4 }} />
            <TextWidget
                text={view.cashbookName}
                style={{ fontSize: 11, color: colors.onPrimary, marginTop: 2 }}
            />
        </FlexWidget>
    );
}
```

- [ ] **Step 4: Verify types compile (call sites will still be broken — expected)**

Run: `npx tsc -b`
Expected: errors ONLY about `QuickAddWidget` being called with `cashbookName` in `widgetSync.ts`, `widgetTaskHandler.tsx`, `WidgetConfigScreen.tsx` (fixed in Task 8). No errors inside the three component files.

- [ ] **Step 5: Commit**

```bash
git add src/features/widgets/components/BalanceWidget.tsx src/features/widgets/components/BudgetWidget.tsx src/features/widgets/components/QuickAddWidget.tsx
git commit -m "feat: widgets render the cashbook icon badge"
```

---

## Task 8: Update quick-add render call sites

**Files:**
- Modify: `src/features/widgets/services/widgetSync.ts:renderQuickAdd`
- Modify: `src/features/widgets/widgetTaskHandler.tsx` (QUICK_ADD branch)
- Modify: `src/features/widgets/screens/WidgetConfigScreen.tsx` (QUICK_ADD branch)

- [ ] **Step 1: `widgetSync.ts`**

Add `buildQuickAddView` to the `widgetData` import:

```ts
import { buildBalanceView, buildBudgetView, budgetDataForCashbook, buildQuickAddView } from "./widgetData";
```

Replace the `QuickAddWidget` creation inside `renderQuickAdd`:

```ts
    return React.createElement(QuickAddWidget, {
        view: buildQuickAddView(business),
        colors: snap.colors,
        clickAction: WIDGET_CLICK.OPEN_QUICK_ADD,
    });
```

- [ ] **Step 2: `widgetTaskHandler.tsx`**

Add `buildQuickAddView` to the `widgetData` import:

```ts
import { buildBalanceView, buildBudgetView, budgetDataForCashbook, buildQuickAddView } from "./services/widgetData";
```

Replace the QUICK_ADD render:

```tsx
    if (widgetName === WIDGET_NAMES.QUICK_ADD) {
        props.renderWidget(
            <QuickAddWidget view={buildQuickAddView(business)} colors={colors} clickAction={WIDGET_CLICK.OPEN_QUICK_ADD} />,
        );
        return;
    }
```

- [ ] **Step 3: `WidgetConfigScreen.tsx`**

Add `buildQuickAddView` to the `widgetData` import (line 11):

```ts
import { buildBalanceView, buildBudgetView, budgetDataForCashbook, buildQuickAddView } from "../services/widgetData";
```

Replace the QUICK_ADD render inside `renderInitialFrame`:

```tsx
    if (widgetName === WIDGET_NAMES.QUICK_ADD) {
        props.renderWidget(
            <QuickAddWidget
                view={buildQuickAddView(business)}
                colors={colors}
                clickAction={WIDGET_CLICK.OPEN_QUICK_ADD}
            />,
        );
        return;
    }
```

- [ ] **Step 4: Verify everything compiles + widget tests pass**

Run: `npx tsc -b && npx jest __tests__/widgets`
Expected: no type errors; all widget tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/widgets/services/widgetSync.ts src/features/widgets/widgetTaskHandler.tsx src/features/widgets/screens/WidgetConfigScreen.tsx
git commit -m "feat: pass quick-add view (name+accent+icon) to the quick-add widget"
```

---

## Task 9: App `CashbookIcon` + `CashbookIconBadge`

**Files:**
- Create: `src/features/cashbooks/appearance/icons.tsx`
- Create: `src/components/CashbookIconBadge.tsx`

Use the frontend-design skill. No unit test (RN rendering); verified via `tsc` + on-device.

- [ ] **Step 1: `CashbookIcon` (app, Lucide generic Icon)**

Create `src/features/cashbooks/appearance/icons.tsx`:

```tsx
import React from "react";
import { Icon } from "lucide-react-native";
import { CASHBOOK_ICON_NODES } from "./icons.data";
import { resolveCashbookIconKey } from "./resolve";

export function CashbookIcon({
    iconKey,
    color,
    size = 20,
    strokeWidth = 2,
}: {
    iconKey: string;
    color: string;
    size?: number;
    strokeWidth?: number;
}) {
    const key = resolveCashbookIconKey({ icon: iconKey });
    return (
        <Icon iconNode={CASHBOOK_ICON_NODES[key]} color={color} size={size} strokeWidth={strokeWidth} />
    );
}
```

If `tsc` reports that `Icon` is not exported from `lucide-react-native`, use the fallback: `import { Icon } from "lucide-react-native/dist/lucide-react-native"` is NOT needed — instead build the component with `createLucideIcon`:

```tsx
import createLucideIcon from "lucide-react-native/dist/esm/createLucideIcon";
// then: const Cmp = createLucideIcon(key, CASHBOOK_ICON_NODES[key]); return <Cmp color={color} size={size} strokeWidth={strokeWidth} />;
```

Prefer the `Icon` generic; only use the fallback if the import fails to type-check.

- [ ] **Step 2: `CashbookIconBadge` (tinted square + icon)**

Create `src/components/CashbookIconBadge.tsx`:

```tsx
import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Business } from "../types";
import { resolveCashbookColor, resolveCashbookIconKey } from "../features/cashbooks/appearance/resolve";
import { CashbookIcon } from "../features/cashbooks/appearance/icons";

export default function CashbookIconBadge({
    business,
    size = 40,
}: {
    business: Pick<Business, "id" | "color" | "icon">;
    size?: number;
}) {
    const color = resolveCashbookColor(business);
    const iconKey = resolveCashbookIconKey(business);
    const iconSize = Math.round(size * 0.5);
    const styles = useMemo(
        () =>
            StyleSheet.create({
                badge: {
                    width: size,
                    height: size,
                    borderRadius: size * 0.28,
                    alignItems: "center",
                    justifyContent: "center",
                    // Tint derived from the cashbook's own color (feature data).
                    backgroundColor: `${color}22`,
                },
            }),
        [size, color],
    );
    return (
        <View style={styles.badge}>
            <CashbookIcon iconKey={iconKey} color={color} size={iconSize} />
        </View>
    );
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/cashbooks/appearance/icons.tsx src/components/CashbookIconBadge.tsx
git commit -m "feat: app cashbook icon component and tinted icon badge"
```

---

## Task 10: Reusable `CashbookAppearancePicker`

**Files:**
- Create: `src/components/CashbookAppearancePicker.tsx`

Use the frontend-design skill. Chrome uses theme tokens; swatches use the palette (feature data).

- [ ] **Step 1: Create the picker**

Create `src/components/CashbookAppearancePicker.tsx`:

```tsx
import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { CASHBOOK_COLORS } from "../features/cashbooks/appearance/palette";
import { CASHBOOK_ICON_KEYS } from "../features/cashbooks/appearance/icons.data";
import { CashbookIcon } from "../features/cashbooks/appearance/icons";

export default function CashbookAppearancePicker({
    color,
    iconKey,
    onChangeColor,
    onChangeIcon,
}: {
    color: string;
    iconKey: string;
    onChangeColor: (color: string) => void;
    onChangeIcon: (iconKey: string) => void;
}) {
    const theme = useTheme();
    const s = useMemo(() => createStyles(theme), [theme]);

    return (
        <View>
            <Text style={s.label}>Color</Text>
            <View style={s.grid}>
                {CASHBOOK_COLORS.map((c) => {
                    const selected = c.toLowerCase() === color.toLowerCase();
                    return (
                        <TouchableOpacity
                            key={c}
                            style={[s.swatch, { backgroundColor: c }, selected && s.swatchSelected]}
                            onPress={() => onChangeColor(c)}
                            activeOpacity={0.8}
                        >
                            {selected && <Check size={16} color="#FFFFFF" />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Text style={s.label}>Icon</Text>
            <View style={s.grid}>
                {CASHBOOK_ICON_KEYS.map((k) => {
                    const selected = k === iconKey;
                    return (
                        <TouchableOpacity
                            key={k}
                            style={[
                                s.iconCell,
                                {
                                    backgroundColor: selected
                                        ? `${color}22`
                                        : theme.colors.surfaceContainerHigh,
                                    borderColor: selected ? color : "transparent",
                                },
                            ]}
                            onPress={() => onChangeIcon(k)}
                            activeOpacity={0.8}
                        >
                            <CashbookIcon
                                iconKey={k}
                                color={selected ? color : theme.colors.onSurfaceVariant}
                                size={20}
                            />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        label: {
            fontSize: 12,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
            marginTop: 12,
        },
        grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
        swatch: {
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "transparent",
        },
        swatchSelected: { borderColor: theme.colors.onSurface },
        iconCell: {
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
        },
    });
```

Note: the two literal `"#FFFFFF"` / `${color}22` values are tied to the feature's color data (a checkmark on a colored swatch, and a tint of the selected cashbook color), not theme chrome. All chrome colors use theme tokens.

- [ ] **Step 2: Verify types compile**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/CashbookAppearancePicker.tsx
git commit -m "feat: reusable cashbook color+icon picker"
```

---

## Task 11: Wire picker into create flow

**Files:**
- Modify: `src/components/CreateCashbookModal.tsx`
- Modify: `src/screens/BusinessesScreen.tsx:307-318` (`handleCreateCashbook`) and the `<CreateCashbookModal>` usage (~line 525)

Use the frontend-design skill.

- [ ] **Step 1: Extend `CreateCashbookModal`**

In `src/components/CreateCashbookModal.tsx`:

Add imports:

```tsx
import CashbookAppearancePicker from "./CashbookAppearancePicker";
import { CASHBOOK_COLORS } from "../features/cashbooks/appearance/palette";
import { DEFAULT_CASHBOOK_ICON } from "../features/cashbooks/appearance/resolve";
```

Change the props type:

```tsx
interface CreateCashbookModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (name: string, currency: string, color: string, iconKey: string) => void;
}
```

Add state (below `selectedCurrency`):

```tsx
    const [color, setColor] = useState<string>(CASHBOOK_COLORS[0]);
    const [iconKey, setIconKey] = useState<string>(DEFAULT_CASHBOOK_ICON);
```

Update `handleSubmit`:

```tsx
    const handleSubmit = () => {
        if (!businessName.trim()) {
            Alert.alert("Error", "Please enter a business name");
            return;
        }
        onSubmit(businessName.trim(), selectedCurrency, color, iconKey);
        setBusinessName("");
        setSelectedCurrency("USD");
        setColor(CASHBOOK_COLORS[0]);
        setIconKey(DEFAULT_CASHBOOK_ICON);
    };
```

Insert the picker between the currency grid and the submit button (after the closing `</View>` of `s.currencyGrid`, before `<TouchableOpacity style={s.submitBtn} ...>`):

```tsx
            <CashbookAppearancePicker
                color={color}
                iconKey={iconKey}
                onChangeColor={setColor}
                onChangeIcon={setIconKey}
            />
```

- [ ] **Step 2: Update `handleCreateCashbook` in `BusinessesScreen.tsx`**

```tsx
    const handleCreateCashbook = (
        name: string,
        currency: string,
        color: string,
        iconKey: string,
    ) => {
        const newBusiness: Business = {
            id: Date.now().toString(),
            name,
            createdAt: new Date().toISOString(),
            currency,
            color,
            icon: iconKey,
            memberCount: 1,
        };
        saveBusinesses([...businesses, newBusiness]);
        hapticSuccess();
        setCreateModalVisible(false);
    };
```

The existing `<CreateCashbookModal onSubmit={handleCreateCashbook} ... />` usage needs no change (signature matches).

- [ ] **Step 3: Verify compile**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/CreateCashbookModal.tsx src/screens/BusinessesScreen.tsx
git commit -m "feat: pick color and icon when creating a cashbook"
```

---

## Task 12: Wire picker into edit flow

**Files:**
- Modify: `src/components/CashbookDetailSheet.tsx`
- Modify: `src/screens/BusinessesScreen.tsx` (add `handleUpdateAppearance`, pass to sheet)

Use the frontend-design skill.

- [ ] **Step 1: Add `onUpdateAppearance` + picker state to `CashbookDetailSheet`**

In `src/components/CashbookDetailSheet.tsx`:

Add imports:

```tsx
import CashbookAppearancePicker from "./CashbookAppearancePicker";
import { resolveCashbookColor, resolveCashbookIconKey } from "../features/cashbooks/appearance/resolve";
```

Add to `CashbookDetailSheetProps`:

```tsx
    onUpdateAppearance: (businessId: string, color: string, iconKey: string) => void;
```

Destructure it in the component params (alongside `onUpdateCurrency`).

Add picker state (next to `currencyValue`):

```tsx
    const [colorValue, setColorValue] = useState("#7E57C2");
    const [iconValue, setIconValue] = useState("wallet");
```

In the existing `React.useEffect(() => { if (business) {...} }, [business])`, add:

```tsx
            setColorValue(resolveCashbookColor(business));
            setIconValue(resolveCashbookIconKey(business));
```

Extend `handleSaveEdits` to persist appearance:

```tsx
    const handleSaveEdits = () => {
        if (!business || !renameValue.trim()) return;
        const trimmedName = renameValue.trim();
        if (trimmedName !== business.name) {
            onRename(business.id, trimmedName);
        }
        if (currencyValue !== (business.currency ?? "USD")) {
            onUpdateCurrency(business.id, currencyValue);
        }
        if (
            colorValue !== resolveCashbookColor(business) ||
            iconValue !== resolveCashbookIconKey(business)
        ) {
            onUpdateAppearance(business.id, colorValue, iconValue);
        }
        setIsRenaming(false);
    };
```

Pass the new state into `SheetHeader` (add props to the `<SheetHeader .../>` usage): `colorValue={colorValue} setColorValue={setColorValue} iconValue={iconValue} setIconValue={setIconValue}`.

In the `SheetHeader` function signature add `colorValue, setColorValue, iconValue, setIconValue` to the destructured `any` params, and inside the `if (isRenaming)` block, after the currency grid `</View>`, insert the picker:

```tsx
                <CashbookAppearancePicker
                    color={colorValue}
                    iconKey={iconValue}
                    onChangeColor={setColorValue}
                    onChangeIcon={setIconValue}
                />
```

Also show the badge in the non-renaming header: add `import CashbookIconBadge from "./CashbookIconBadge";` and, in the returned header `<View style={s.header}>`, place `<CashbookIconBadge business={business} size={40} />` before the `<View style={{ flex: 1 }}>` title block, with `marginRight: 12` (add a small wrapper style or inline `style={{ marginRight: 12 }}`).

- [ ] **Step 2: Add `handleUpdateAppearance` in `BusinessesScreen.tsx`**

After `handleUpdateCurrency` (line ~384):

```tsx
    const handleUpdateAppearance = (businessId: string, color: string, iconKey: string) => {
        const updated = businesses.map((b) =>
            b.id === businessId ? { ...b, color, icon: iconKey } : b,
        );
        saveBusinesses(updated);
        setSheetBusiness((prev) => (prev ? { ...prev, color, icon: iconKey } : null));
    };
```

Pass it to the sheet — update the `<CashbookDetailSheet ...>` usage (line ~512) to add:

```tsx
                onUpdateAppearance={handleUpdateAppearance}
```

- [ ] **Step 3: Verify compile + full widget test run**

Run: `npx tsc -b && npx jest`
Expected: no type errors; all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/CashbookDetailSheet.tsx src/screens/BusinessesScreen.tsx
git commit -m "feat: edit cashbook color and icon in the detail sheet"
```

---

## Task 13: Cashbook list row shows the badge

**Files:**
- Modify: `src/components/BusinessItem.tsx`

Use the frontend-design skill.

- [ ] **Step 1: Add the badge before the name**

In `src/components/BusinessItem.tsx`:

Add import:

```tsx
import CashbookIconBadge from "./CashbookIconBadge";
```

Inside the outer `<TouchableOpacity>`, before the `<View style={{ flex: 1 }}>`, add:

```tsx
      <CashbookIconBadge business={business} size={40} />
```

and add `marginRight: theme.spacing.m` to the `<View style={{ flex: 1 }}>` (wrap as `style={{ flex: 1, marginLeft: theme.spacing.m }}`), so the badge and text don't collide.

- [ ] **Step 2: Verify compile**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/BusinessItem.tsx
git commit -m "feat: show cashbook icon badge in the cashbook list"
```

---

## Task 14: Full verification + on-device QA

**Files:** none (verification only)

- [ ] **Step 1: Type check**

Run: `npx tsc -b`
Expected: clean.

- [ ] **Step 2: Full test suite**

Run: `npx jest`
Expected: all suites PASS (existing + new `__tests__/cashbooks/*`).

- [ ] **Step 3: Security/quality scan (per repo CLAUDE.md)**

Manually review the diff: no hardcoded secrets, no unsafe `new Function` on untrusted input (the codegen only reads the installed Lucide package — a build-time trusted source; note this in the commit if flagged), all user inputs (picker selections) constrained to the fixed palette/icon set.

- [ ] **Step 4: On-device QA matrix (preview build)**

Rebuild the preview APK (`npx eas-cli build --platform android --profile preview --non-interactive --no-wait`) and verify:
- Create a cashbook → pick a color + icon → it appears on the list row badge.
- Edit an existing cashbook (which had no color/icon) → it shows an auto color + wallet icon → change both → list + detail update.
- Add each widget → Balance/Budget show the icon badge in the accent color + name; Quick-add shows the icon + name; budget bar still green/amber/red by usage (not accent).
- Change a cashbook's color/icon → widgets refresh to the new styling.
- Light + dark mode: icon/accents legible in both.

- [ ] **Step 5: Commit any QA fixes, then final commit**

```bash
git add -A
git commit -m "chore: cashbook appearance QA fixes"
```

---

## Self-Review Notes

- **Spec coverage:** data model (T1), shared module palette/icons/resolve/iconSvg (T2–T5), reusable picker (T10), create wiring (T11), edit wiring (T12), app surfaces list+detail (T9,T12,T13), widget rendering (T6–T8), refresh (existing `saveBusinesses → refreshCashbookWidgets`, exercised in T14), tests (T2,T4,T5,T6). `BusinessChip` intentionally untouched. ✓
- **Type consistency:** `resolveCashbookColor`/`resolveCashbookIconKey`/`withAlpha`/`cashbookIconSvg`/`iconNodeToSvg`/`buildQuickAddView`/`QuickAddView` names used identically across tasks. `QuickAddWidget` prop changes from `cashbookName` to `view` are propagated to all three call sites in T8. ✓
- **No placeholders:** every code step shows full code; the one generated file (T3) is produced by a complete deterministic script. ✓
