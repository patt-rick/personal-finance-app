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
}: MoneyTextProps) {
    const theme = useTheme();
    const ink = color ?? theme.colors.onSurface;
    const abs = Math.abs(amount);
    const whole = Math.floor(abs).toLocaleString();
    const decimals = (abs % 1).toFixed(2).slice(1); // ".00"

    return (
        <Text
            numberOfLines={numberOfLines}
            adjustsFontSizeToFit={adjustsFontSizeToFit}
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
