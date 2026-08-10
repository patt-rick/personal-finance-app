import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { BudgetView } from "../services/widgetData";
import { WidgetColors, budgetBarColor } from "../theme/widgetTheme";
import { MessageWidget } from "./WidgetStates";

const fmt = (symbol: string, n: number) =>
    `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function BudgetWidget({
    view,
    colors,
    clickAction,
}: {
    view: BudgetView;
    colors: WidgetColors;
    clickAction: string;
}) {
    if (view.noBudget) {
        return (
            <MessageWidget
                message={`${view.cashbookName}\nNo budget set — tap to create`}
                colors={colors}
                clickAction={clickAction}
            />
        );
    }
    const pct = Math.min(100, Math.max(0, view.percentage));
    const barColor = budgetBarColor(view.percentage, colors);
    return (
        <FlexWidget
            style={{
                height: "match_parent",
                width: "match_parent",
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 12,
                flexDirection: "column",
            }}
            clickAction={clickAction}
        >
            <TextWidget
                text={view.cashbookName}
                style={{ fontSize: 12, color: colors.onSurfaceVariant }}
            />
            <TextWidget
                text={view.periodLabel}
                style={{ fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 6 }}
            />
            <FlexWidget
                style={{
                    height: 10,
                    width: "match_parent",
                    backgroundColor: colors.outlineVariant,
                    borderRadius: 999,
                }}
            >
                <FlexWidget
                    style={{
                        height: 10,
                        // react-native-android-widget's SizeStyleProps only types width as
                        // 'wrap_content' | 'match_parent' | number — no percentage strings.
                        // Cast is required to compile; revisit at device-QA time and switch
                        // to a numeric/px-based fill (e.g. measured container width * pct/100)
                        // for correct native rendering.
                        width: `${pct}%` as unknown as number,
                        backgroundColor: barColor,
                        borderRadius: 999,
                    }}
                />
            </FlexWidget>
            <TextWidget
                text={`${fmt(view.currencySymbol, view.totalSpent)} of ${fmt(view.currencySymbol, view.totalLimit)}`}
                style={{ fontSize: 13, color: colors.onSurface, marginTop: 6 }}
            />
        </FlexWidget>
    );
}
