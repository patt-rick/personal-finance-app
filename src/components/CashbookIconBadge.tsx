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
