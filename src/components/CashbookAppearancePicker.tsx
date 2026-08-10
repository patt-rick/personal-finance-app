import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { CASHBOOK_COLORS } from "../features/cashbooks/appearance/palette";
import { CASHBOOK_ICON_KEYS } from "../features/cashbooks/appearance/icons.data";
import { CashbookIcon } from "../features/cashbooks/appearance/icons";

export default function CashbookAppearancePicker({
    color,
    iconKey,
    onChangeColor,
    onChangeIcon,
}: {
    color: string;
    iconKey: string;
    onChangeColor: (color: string) => void;
    onChangeIcon: (iconKey: string) => void;
}) {
    const theme = useTheme();
    const s = useMemo(() => createStyles(theme), [theme]);

    return (
        <View>
            <Text style={s.label}>Color</Text>
            <View style={s.grid}>
                {CASHBOOK_COLORS.map((c) => {
                    const selected = c.toLowerCase() === color.toLowerCase();
                    return (
                        <TouchableOpacity
                            key={c}
                            style={[s.swatch, { backgroundColor: c }, selected && s.swatchSelected]}
                            onPress={() => onChangeColor(c)}
                            activeOpacity={0.8}
                        >
                            {selected && <Check size={16} color="#FFFFFF" />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Text style={s.label}>Icon</Text>
            <View style={s.grid}>
                {CASHBOOK_ICON_KEYS.map((k) => {
                    const selected = k === iconKey;
                    return (
                        <TouchableOpacity
                            key={k}
                            style={[
                                s.iconCell,
                                {
                                    backgroundColor: selected
                                        ? `${color.slice(0, 7)}22`
                                        : theme.colors.surfaceContainerHigh,
                                    borderColor: selected ? color : "transparent",
                                },
                            ]}
                            onPress={() => onChangeIcon(k)}
                            activeOpacity={0.8}
                        >
                            <CashbookIcon
                                iconKey={k}
                                color={selected ? color : theme.colors.onSurfaceVariant}
                                size={20}
                            />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        label: {
            fontSize: 12,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurfaceVariant,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
            marginTop: 12,
        },
        grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
        swatch: {
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "transparent",
        },
        swatchSelected: { borderColor: theme.colors.onSurface },
        iconCell: {
            width: 44,
            height: 44,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
        },
    });
