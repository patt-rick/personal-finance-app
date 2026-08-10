import React from "react";
import { FlexWidget, TextWidget, SvgWidget } from "react-native-android-widget";
import { BudgetView } from "../services/widgetData";
import { WidgetColors, budgetBarColor } from "../theme/widgetTheme";
import { MessageWidget } from "./WidgetStates";
import { cashbookIconSvg } from "../../cashbooks/appearance/iconSvg";
import { withAlpha } from "../../cashbooks/appearance/resolve";

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
                    flexDirection: "row",
                }}
            >
                <FlexWidget
                    style={{
                        height: 10,
                        flex: Math.max(0, Math.round(pct)),
                        backgroundColor: barColor,
                        borderRadius: 999,
                    }}
                />
                <FlexWidget
                    style={{
                        height: 10,
                        flex: Math.max(0, Math.round(100 - pct)),
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
