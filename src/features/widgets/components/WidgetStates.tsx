import React from "react";
import { FlexWidget, TextWidget, HexColor } from "react-native-android-widget";
import { WidgetColors } from "../theme/widgetTheme";

const container = (bg: HexColor) =>
    ({
        height: "match_parent",
        width: "match_parent",
        backgroundColor: bg,
        borderRadius: 16,
        padding: 12,
        justifyContent: "center",
        alignItems: "center",
    }) as const;

export function MessageWidget({
    message,
    colors,
    clickAction,
}: {
    message: string;
    colors: WidgetColors;
    clickAction?: string;
}) {
    return (
        <FlexWidget style={container(colors.surface)} clickAction={clickAction}>
            <TextWidget
                text={message}
                style={{ fontSize: 13, color: colors.onSurfaceVariant }}
            />
        </FlexWidget>
    );
}
