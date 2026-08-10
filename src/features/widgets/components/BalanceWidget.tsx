import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { BalanceView } from "../services/widgetData";
import { WidgetColors } from "../theme/widgetTheme";

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
            <TextWidget
                text={view.cashbookName}
                style={{ fontSize: 12, color: colors.onSurfaceVariant }}
            />
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
