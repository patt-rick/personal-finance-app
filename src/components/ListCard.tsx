import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "../theme/theme";

interface ListCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export default function ListCard({ children, style }: ListCardProps) {
    const theme = useTheme();
    const items = React.Children.toArray(children).filter(Boolean);

    return (
        <View
            style={[
                {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderRadius: 14,
                    overflow: "hidden",
                },
                style,
            ]}
        >
            {items.map((child, i) => (
                <React.Fragment key={i}>
                    {child}
                    {i < items.length - 1 ? (
                        <View
                            style={{
                                height: StyleSheet.hairlineWidth,
                                backgroundColor: theme.colors.borderLight,
                                marginHorizontal: 12,
                            }}
                        />
                    ) : null}
                </React.Fragment>
            ))}
        </View>
    );
}
