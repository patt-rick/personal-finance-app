import React from "react";
import { FlexWidget, TextWidget, SvgWidget } from "react-native-android-widget";
import { WidgetColors } from "../theme/widgetTheme";
import { QuickAddView } from "../services/widgetData";
import { cashbookIconSvg } from "../../cashbooks/appearance/iconSvg";
import { readableOn } from "../../cashbooks/appearance/resolve";

export function QuickAddWidget({
    view,
    clickAction,
}: {
    view: QuickAddView;
    colors: WidgetColors;
    clickAction: string;
}) {
    const fg = readableOn(view.accent);
    return (
        <FlexWidget
            style={{
                height: "match_parent",
                width: "match_parent",
                backgroundColor: view.accent,
                borderRadius: 16,
                padding: 12,
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
            }}
            clickAction={clickAction}
        >
            <SvgWidget svg={cashbookIconSvg(view.iconKey, fg, 20)} style={{ width: 20, height: 20 }} />
            <TextWidget text="+ Add expense" style={{ fontSize: 16, color: fg, marginTop: 4 }} />
            <TextWidget text={view.cashbookName} style={{ fontSize: 11, color: fg, marginTop: 2 }} />
        </FlexWidget>
    );
}
