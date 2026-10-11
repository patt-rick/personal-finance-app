import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Rect } from "react-native-svg";
import { useTheme } from "../../../theme/theme";
import { HatchPattern } from "./HatchPattern";

/** A hatched background that fills its parent; marks the part of a limit that is still unspent. */
export default function HatchTrack({ id }: { id: string }) {
    const theme = useTheme();
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%">
                <Defs>
                    <HatchPattern id={id} color={theme.colors.onSurface} opacity={0.16} />
                </Defs>
                <Rect x={0} y={0} width="100%" height="100%" fill={theme.colors.surfaceContainer} />
                <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
            </Svg>
        </View>
    );
}
