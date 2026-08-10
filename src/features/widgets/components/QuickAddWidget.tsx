import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { WidgetColors } from "../theme/widgetTheme";

export function QuickAddWidget({
    cashbookName,
    colors,
    clickAction,
}: {
    cashbookName: string;
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
            <TextWidget text="+ Add expense" style={{ fontSize: 16, color: colors.onPrimary }} />
            <TextWidget
                text={cashbookName}
                style={{ fontSize: 11, color: colors.onPrimary, marginTop: 2 }}
            />
        </FlexWidget>
    );
}
