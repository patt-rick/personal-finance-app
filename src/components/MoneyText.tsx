import React from "react";
import { Text, TextStyle, StyleProp } from "react-native";
import { useTheme } from "../theme/theme";

interface MoneyTextProps {
    amount: number;
    symbol?: string;
    sign?: "+" | "-" | "";
    size?: number;
    color?: string;
    weight?: "light" | "regular" | "semibold" | "bold";
    showDecimals?: boolean;
    decimalColor?: string;
    style?: StyleProp<TextStyle>;
    numberOfLines?: number;
    adjustsFontSizeToFit?: boolean;
    maxFontSizeMultiplier?: number;
}

export default function MoneyText({
    amount,
    symbol = "",
    sign = "",
    size = 16,
    color,
    weight = "semibold",
    showDecimals = true,
    decimalColor,
    style,
    numberOfLines,
    adjustsFontSizeToFit,
    maxFontSizeMultiplier,
}: MoneyTextProps) {
    const theme = useTheme();
    const ink = color ?? theme.colors.onSurface;
    const abs = Math.abs(amount);
    // Round to cents before splitting, so 15,929.999 reads 15,930.00 rather than 15,929.00.
    const cents = showDecimals ? Math.round(abs * 100) : Math.floor(abs) * 100;
    const whole = Math.floor(cents / 100).toLocaleString();
    const decimals = `.${String(cents % 100).padStart(2, "0")}`;

    return (
        <Text
            numberOfLines={numberOfLines}
            adjustsFontSizeToFit={adjustsFontSizeToFit}
            maxFontSizeMultiplier={maxFontSizeMultiplier}
            style={[
                {
                    fontSize: size,
                    fontFamily: theme.fonts[weight],
                    color: ink,
                    fontVariant: ["tabular-nums"],
                },
                style,
            ]}
        >
            {sign}
            {symbol ? `${symbol} ` : ""}
            {whole}
            {showDecimals ? (
                <Text
                    style={{
                        fontSize: Math.round(size * 0.55),
                        color: decimalColor ?? theme.colors.placeholder,
                        fontFamily: theme.fonts[weight],
                        fontVariant: ["tabular-nums"],
                    }}
                >
                    {decimals}
                </Text>
            ) : null}
        </Text>
    );
}
