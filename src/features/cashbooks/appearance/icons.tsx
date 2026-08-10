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
