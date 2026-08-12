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
                padding: 8,
                flexDirection: "column",
                justifyContent: "center",
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
                    <SvgWidget svg={cashbookIconSvg(view.iconKey, view.accent, 14)} style={{ width: 14, height: 14 }} />
                </FlexWidget>
                <TextWidget
                    text={view.cashbookName}
                    style={{ fontSize: 12, color: colors.onSurfaceVariant }}
                />
            </FlexWidget>
            <TextWidget
                text={`${view.balance < 0 ? "-" : ""}${fmt(view.currencySymbol, view.balance)}`}
                style={{ fontSize: 22, color: colors.onSurface }}
            />
            <FlexWidget style={{ flexDirection: "row", marginTop: 2 }}>
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
