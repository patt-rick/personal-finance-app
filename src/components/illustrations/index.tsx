import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
    Circle,
    Rect,
    Ellipse,
    Path,
    G,
    Line,
    Defs,
    LinearGradient,
    Stop,
} from "react-native-svg";
import { useTheme } from "../../theme/theme";

/**
 * Material You "expressive geometric" spot illustrations + decorative layers.
 * Everything is in-code react-native-svg so it scales crisply and adapts to
 * light/dark via theme tokens. Empty scenes share a visual language: a soft
 * grounding platform, a primary object in container tones, and a few accent
 * pops (tertiary / gold / income).
 */

type SceneProps = { size?: number };

const SCENE_W = 220;
const SCENE_H = 168;

function Scene({ size = 200, children }: { size?: number; children: React.ReactNode }) {
    const h = (size * SCENE_H) / SCENE_W;
    return (
        <Svg width={size} height={h} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
            {children}
        </Svg>
    );
}

function Platform({ color }: { color: string }) {
    return <Ellipse cx={110} cy={150} rx={84} ry={13} fill={color} opacity={0.55} />;
}

// Small decorative sparkles/dots used across scenes for liveliness.
function Confetti({ a, b, c }: { a: string; b: string; c: string }) {
    return (
        <G>
            <Circle cx={36} cy={40} r={5} fill={a} />
            <Circle cx={188} cy={54} r={6} fill={b} />
            <Circle cx={176} cy={26} r={4} fill={c} />
            <Path d="M30 92 l0 12 M24 98 l12 0" stroke={c} strokeWidth={3} strokeLinecap="round" />
            <Path
                d="M196 104 l0 10 M191 109 l10 0"
                stroke={a}
                strokeWidth={3}
                strokeLinecap="round"
            />
        </G>
    );
}

export function EmptyWallet({ size }: SceneProps) {
    const c = useTheme().colors;
    return (
        <Scene size={size}>
            <Platform color={c.secondaryContainer} />
            <Confetti a={c.primary} b={c.tertiary} c={c.gold} />
            {/* cards peeking from the wallet */}
            <Rect x={86} y={40} width={64} height={34} rx={9} fill={c.tertiaryContainer} transform="rotate(-7 118 57)" />
            <Rect x={92} y={36} width={62} height={32} rx={9} fill={c.surfaceContainerHighest} transform="rotate(4 123 52)" />
            {/* wallet body */}
            <Rect x={52} y={66} width={116} height={66} rx={18} fill={c.primaryContainer} />
            <Rect x={52} y={66} width={116} height={30} rx={18} fill={c.primary} opacity={0.16} />
            {/* card slot strip */}
            <Rect x={52} y={104} width={116} height={8} fill={c.onPrimaryContainer} opacity={0.1} />
            {/* clasp */}
            <Circle cx={150} cy={99} r={9} fill={c.primary} />
            <Circle cx={150} cy={99} r={3.5} fill={c.onPrimary} />
            {/* coins */}
            <Circle cx={70} cy={136} r={15} fill={c.goldContainer} stroke={c.gold} strokeWidth={3} />
            <Path d="M70 129 v14 M65 133 h10 M65 139 h10" stroke={c.goldDark} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        </Scene>
    );
}

export function EmptyReceipt({ size }: SceneProps) {
    const c = useTheme().colors;
    return (
        <Scene size={size}>
            <Platform color={c.secondaryContainer} />
            <Confetti a={c.tertiary} b={c.primary} c={c.income} />
            {/* receipt */}
            <Path
                d="M74 36 h72 a6 6 0 0 1 6 6 v92 l-10 -7 l-10 7 l-10 -7 l-10 7 l-10 -7 l-10 7 l-10 -7 l-10 7 v-92 a6 6 0 0 1 6 -6 z"
                fill={c.surfaceContainerHighest}
            />
            <Rect x={84} y={54} width={52} height={7} rx={3.5} fill={c.onSurfaceVariant} opacity={0.55} />
            <Rect x={84} y={70} width={36} height={7} rx={3.5} fill={c.onSurfaceVariant} opacity={0.3} />
            <Rect x={84} y={86} width={44} height={7} rx={3.5} fill={c.onSurfaceVariant} opacity={0.3} />
            {/* magnifier */}
            <Circle cx={142} cy={104} r={26} fill={c.primaryContainer} stroke={c.primary} strokeWidth={5} />
            <Line x1={160} y1={122} x2={176} y2={138} stroke={c.primary} strokeWidth={8} strokeLinecap="round" />
            <Path d="M132 104 h20 M142 94 v20" stroke={c.onPrimaryContainer} strokeWidth={3.5} strokeLinecap="round" />
        </Scene>
    );
}

export function EmptyTarget({ size }: SceneProps) {
    const c = useTheme().colors;
    return (
        <Scene size={size}>
            <Platform color={c.secondaryContainer} />
            <Confetti a={c.primary} b={c.gold} c={c.tertiary} />
            <Circle cx={110} cy={88} r={56} fill={c.surfaceContainerHighest} />
            <Circle cx={110} cy={88} r={56} fill="none" stroke={c.primary} strokeWidth={6} opacity={0.9} />
            <Circle cx={110} cy={88} r={38} fill="none" stroke={c.tertiary} strokeWidth={6} />
            <Circle cx={110} cy={88} r={20} fill={c.primaryContainer} />
            <Circle cx={110} cy={88} r={8} fill={c.primary} />
            {/* arrow */}
            <Path d="M150 48 l24 -16 l-7 14 l14 -1 l-31 19 z" fill={c.gold} />
        </Scene>
    );
}

export function EmptyCoins({ size }: SceneProps) {
    const c = useTheme().colors;
    return (
        <Scene size={size}>
            <Platform color={c.secondaryContainer} />
            <Confetti a={c.primary} b={c.income} c={c.gold} />
            {/* stacked coins */}
            <Ellipse cx={92} cy={132} rx={40} ry={14} fill={c.goldContainer} stroke={c.gold} strokeWidth={3} />
            <Ellipse cx={92} cy={120} rx={40} ry={14} fill={c.goldContainer} stroke={c.gold} strokeWidth={3} />
            <Ellipse cx={92} cy={108} rx={40} ry={14} fill={c.goldContainer} stroke={c.gold} strokeWidth={3} />
            <Path d="M92 99 v18 M85 104 h12 M85 112 h12" stroke={c.goldDark} strokeWidth={2.6} fill="none" strokeLinecap="round" />
            {/* note / hand */}
            <Rect x={120} y={56} width={68} height={42} rx={10} fill={c.primaryContainer} transform="rotate(8 154 77)" />
            <Circle cx={154} cy={77} r={11} fill={c.primary} transform="rotate(8 154 77)" />
        </Scene>
    );
}

export function EmptyCalendar({ size }: SceneProps) {
    const c = useTheme().colors;
    return (
        <Scene size={size}>
            <Platform color={c.secondaryContainer} />
            <Confetti a={c.tertiary} b={c.primary} c={c.income} />
            <Rect x={62} y={48} width={96} height={88} rx={16} fill={c.surfaceContainerHighest} />
            <Rect x={62} y={48} width={96} height={26} rx={16} fill={c.primary} />
            <Rect x={62} y={62} width={96} height={12} fill={c.primary} />
            <Circle cx={86} cy={44} r={6} fill={c.primaryContainer} />
            <Circle cx={134} cy={44} r={6} fill={c.primaryContainer} />
            {/* repeat arrows */}
            <Path
                d="M92 104 a18 18 0 1 1 6 14"
                fill="none"
                stroke={c.primary}
                strokeWidth={6}
                strokeLinecap="round"
            />
            <Path d="M86 96 l8 8 l8 -10 z" fill={c.tertiary} />
            <Circle cx={110} cy={108} r={5} fill={c.gold} />
        </Scene>
    );
}

export function EmptyChart({ size }: SceneProps) {
    const c = useTheme().colors;
    return (
        <Scene size={size}>
            <Platform color={c.secondaryContainer} />
            <Confetti a={c.primary} b={c.tertiary} c={c.income} />
            {/* panel */}
            <Rect x={48} y={42} width={124} height={92} rx={16} fill={c.surfaceContainerHighest} />
            {/* bars */}
            <Rect x={66} y={92} width={18} height={30} rx={6} fill={c.tertiary} />
            <Rect x={94} y={76} width={18} height={46} rx={6} fill={c.primary} />
            <Rect x={122} y={62} width={18} height={60} rx={6} fill={c.income} />
            {/* rising line */}
            <Path d="M62 100 L92 84 L120 70 L150 54" fill="none" stroke={c.gold} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={150} cy={54} r={6} fill={c.gold} />
        </Scene>
    );
}

/* ---------- Decorative layers (place absolutely behind content) ---------- */

/**
 * Soft overlapping geometric blobs for header / hero backgrounds.
 * `tone` controls intensity; defaults read container tokens.
 */
export function HeaderBackdrop({
    height = 220,
    opacity = 1,
}: {
    height?: number;
    opacity?: number;
}) {
    const c = useTheme().colors;
    return (
        <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
            <Svg width="100%" height={height} viewBox="0 0 400 220" preserveAspectRatio="xMidYMin slice">
                <Defs>
                    <LinearGradient id="hb" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={c.primaryContainer} stopOpacity={0.55} />
                        <Stop offset="1" stopColor={c.primaryContainer} stopOpacity={0} />
                    </LinearGradient>
                </Defs>
                <Circle cx={330} cy={20} r={120} fill="url(#hb)" />
                <Circle cx={60} cy={-10} r={90} fill={c.tertiaryContainer} opacity={0.35} />
                <Circle cx={370} cy={120} r={40} fill={c.secondaryContainer} opacity={0.4} />
            </Svg>
        </View>
    );
}

/** Subtle dot grid texture for surfaces. */
export function DotGrid({
    width = 400,
    height = 200,
    color,
    opacity = 0.5,
}: {
    width?: number;
    height?: number;
    color?: string;
    opacity?: number;
}) {
    const c = useTheme().colors;
    const dot = color ?? c.outlineVariant;
    const cols = Math.ceil(width / 26) + 1;
    const rows = Math.ceil(height / 26) + 1;
    const dots: React.ReactNode[] = [];
    for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
            dots.push(<Circle key={`${r}-${col}`} cx={col * 26} cy={r * 26} r={1.6} fill={dot} />);
        }
    }
    return (
        <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
            <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMin slice">
                {dots}
            </Svg>
        </View>
    );
}

/** Maps a semantic variant name to its scene component. */
export const EMPTY_SCENES = {
    cashbooks: EmptyWallet,
    transactions: EmptyReceipt,
    budget: EmptyTarget,
    debt: EmptyCoins,
    recurring: EmptyCalendar,
    reports: EmptyChart,
    search: EmptyReceipt,
} as const;

export type EmptySceneVariant = keyof typeof EMPTY_SCENES;

export function EmptyScene({ variant, size }: { variant: EmptySceneVariant; size?: number }) {
    const Cmp = EMPTY_SCENES[variant];
    return <Cmp size={size} />;
}
