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
