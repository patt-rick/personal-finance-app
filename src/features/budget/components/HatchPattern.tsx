import React from "react";
import { Line, Pattern } from "react-native-svg";

/** Diagonal hatching for "what's left" tracks; place inside an SVG's <Defs>. */
export function HatchPattern({ id, color, opacity = 0.22 }: { id: string; color: string; opacity?: number }) {
    return (
        <Pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1={0} y1={0} x2={0} y2={6} stroke={color} strokeOpacity={opacity} strokeWidth={2} />
        </Pattern>
    );
}
