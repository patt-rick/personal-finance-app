import React, { useEffect, useState } from "react";
import { ScrollView, View, Text } from "react-native";
import { WidgetPreview } from "react-native-android-widget";
import { BalanceWidget } from "../components/BalanceWidget";
import { QuickAddWidget } from "../components/QuickAddWidget";
import { WidgetColors, resolveWidgetColors } from "../theme/widgetTheme";
import { BalanceView, QuickAddView } from "../services/widgetData";
import type { HexColor } from "react-native-android-widget";

// TEMPORARY dev-only harness for eyeballing the widgets at real launcher sizes
// via react-native-android-widget's WidgetPreview. Delete once the widget
// clipping/color changes are confirmed on device.

const balanceView: BalanceView = {
    cashbookName: "My shop",
    currencySymbol: "$",
    balance: 12480,
    monthIncome: 5320,
    monthExpense: 4110,
    accent: "#26A69A" as HexColor,
    iconKey: "wallet",
};

const quickAddView: QuickAddView = {
    cashbookName: "Personal",
    accent: "#42A5F5" as HexColor,
    iconKey: "wallet",
};

// A 2-cell-wide widget is ~155dp; heights bracket the 2x1 ("same size") the
// clipped screenshot was placed at, from a tight cell to a roomy one.
const CASES: { label: string; w: number; h: number }[] = [
    { label: "2×1 · tight cell (72dp)", w: 155, h: 72 },
    { label: "2×1 · typical cell (86dp)", w: 155, h: 86 },
    { label: "2×1 · roomy cell (100dp)", w: 155, h: 100 },
];

export default function WidgetPreviewScreen() {
    const [colors, setColors] = useState<WidgetColors | null>(null);

    useEffect(() => {
        resolveWidgetColors().then(setColors);
    }, []);

    if (!colors) return <View style={{ flex: 1, backgroundColor: "#000" }} />;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 20, paddingTop: 60, gap: 28 }}
        >
            <Text style={{ color: colors.onSurface, fontSize: 20, fontWeight: "700" }}>
                Widget preview
            </Text>

            <Text style={{ color: colors.onSurfaceVariant, fontSize: 14 }}>
                Balance widget (compacted) at the same 2×1 size
            </Text>
            {CASES.map((c) => (
                <View key={c.label} style={{ gap: 8 }}>
                    <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>{c.label}</Text>
                    <WidgetPreview
                        showBorder
                        width={c.w}
                        height={c.h}
                        renderWidget={() => (
                            <BalanceWidget view={balanceView} colors={colors} clickAction="noop" />
                        )}
                    />
                </View>
            ))}

            <Text style={{ color: colors.onSurfaceVariant, fontSize: 14 }}>
                Quick-add widget filled with the cashbook color
            </Text>
            <View style={{ gap: 8 }}>
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>2×1 · roomy cell (100dp)</Text>
                <WidgetPreview
                    showBorder
                    width={155}
                    height={100}
                    renderWidget={() => (
                        <QuickAddWidget view={quickAddView} colors={colors} clickAction="noop" />
                    )}
                />
            </View>
        </ScrollView>
    );
}
