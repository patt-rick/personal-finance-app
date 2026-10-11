import React, { useMemo, useState } from "react";
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Line, Path, Polygon, RadialGradient, Stop, Text as SvgText } from "react-native-svg";
import { SlidersHorizontal } from "lucide-react-native";
import { AppTheme, useTheme } from "../../../theme/theme";
import { formatPercent } from "../../../utils/categoryTiles";
import { slice, useCountUp } from "../../../components/reports/motion";
import { budgetColour } from "../colour";
import { ChipContent } from "../dashboardModel";
import { HatchPattern } from "./HatchPattern";
import PaceChip from "./PaceChip";
import { useSweep } from "./useSweep";

const VB_W = 254;
const VB_H = 214;
const CX = 127;
const CY = 118;
const R = 92;
const STROKE = 20;
const ARC_LEN = R * ((3 * Math.PI) / 2);
const POINTER_BOX = 120;
const SWEEP_MS = 1100;

const ang = (p: number) => ((135 + 270 * p) * Math.PI) / 180;
const pt = (p: number, r: number) => [CX + r * Math.cos(ang(p)), CY + r * Math.sin(ang(p))];

function arc(p0: number, p1: number, r: number) {
    const [x0, y0] = pt(p0, r);
    const [x1, y1] = pt(p1, r);
    return `M${x0} ${y0} A${r} ${r} 0 ${(p1 - p0) * 270 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}

function wedge(p: number, r: number) {
    const [x0, y0] = pt(0, r);
    const [x1, y1] = pt(p, r);
    return `M${CX} ${CY} L${x0} ${y0} A${r} ${r} 0 ${p * 270 > 180 ? 1 : 0} 1 ${x1} ${y1} Z`;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface BudgetGaugeProps {
    share: number;
    pacePct: number | null;
    warnAt: number;
    title: string;
    subtitle: string;
    spentText: string;
    limitText: string;
    caption: string;
    chip: ChipContent | null;
    onEdit: () => void;
    animKey: string;
    reduced: boolean | null;
}

export default function BudgetGauge(props: BudgetGaugeProps) {
    const { share, pacePct, warnAt, title, subtitle, spentText, limitText, caption, chip, onEdit, animKey, reduced } = props;
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [width, setWidth] = useState(0);
    const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

    const p = Math.min(Math.max(share, 0), 100) / 100;
    const palette = theme.colors;
    const tip = budgetColour(share, warnAt, palette);
    const size = Math.min(width, 320);
    const scale = size / VB_W;

    const segments = useMemo(() => {
        if (p <= 0) return [];
        const n = Math.max(2, Math.round(p * 90));
        return Array.from({ length: n }, (_, i) => {
            const a = (p * i) / n;
            const b = Math.min((p * (i + 1)) / n + 0.002, p);
            return { d: arc(a, b, R), color: budgetColour(a * 100, warnAt, palette) };
        });
    }, [p, warnAt, palette]);

    const sweepKey = `${animKey}|${size > 0 ? "laid-out" : "pending"}`;
    const progress = useSweep(sweepKey, reduced, SWEEP_MS);
    const pointerProgress = useSweep(sweepKey, reduced, SWEEP_MS, true);
    const eased = useMemo(() => slice(progress, 0, 1), [progress]);
    const coverLen = p * ARC_LEN;
    const coverOffset = useMemo(
        () => eased.interpolate({ inputRange: [0, 1], outputRange: [0, -(coverLen + STROKE)] }),
        [eased, coverLen],
    );
    const rotate = useMemo(
        () =>
            slice(pointerProgress, 0, 1).interpolate({
                inputRange: [0, 1],
                outputRange: ["-135deg", `${270 * p - 135}deg`],
            }),
        [pointerProgress, p],
    );
    const glowOpacity = useMemo(() => slice(progress, 0.45, 1), [progress]);

    const tenths = Math.round(share * 10);
    const counted = useCountUp(tenths, size > 0, reduced, { duration: SWEEP_MS });
    const percentText = counted === tenths ? formatPercent(share) : `${(counted / 10).toFixed(1)}%`;

    const [tx0, ty0] = pacePct === null ? [0, 0] : pt(Math.min(pacePct, 100) / 100, R + STROKE / 2 + 3);
    const [tx1, ty1] = pacePct === null ? [0, 0] : pt(Math.min(pacePct, 100) / 100, R - STROKE / 2 - 3);
    const [sx, sy] = pt(0, R);
    const [ex, ey] = pt(p, R);
    const half = POINTER_BOX / 2;

    return (
        <View
            style={styles.wrap}
            accessible
            accessibilityLabel={`${title}. ${spentText} of ${limitText}, ${formatPercent(share)} used. ${chip?.text ?? ""}`}
        >
            <View style={styles.header}>
                <View style={styles.headerText}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
                <Pressable
                    onPress={onEdit}
                    style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Edit budget"
                    hitSlop={6}
                >
                    <SlidersHorizontal size={18} color={theme.colors.onSurface} />
                </Pressable>
            </View>

            <View style={styles.dialRow} onLayout={onLayout}>
                {size > 0 && (
                    <View style={{ width: size, height: VB_H * scale }}>
                        <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}>
                            <Svg width={size} height={VB_H * scale} viewBox={`0 0 ${VB_W} ${VB_H}`}>
                                <Defs>
                                    <RadialGradient id="budgetGlow" cx={CX} cy={CY} r={R} gradientUnits="userSpaceOnUse">
                                        <Stop offset="0.15" stopColor={tip} stopOpacity={0} />
                                        <Stop offset="1" stopColor={tip} stopOpacity={0.32} />
                                    </RadialGradient>
                                </Defs>
                                {p > 0 && <Path d={wedge(p, R - STROKE / 2)} fill="url(#budgetGlow)" />}
                            </Svg>
                        </Animated.View>

                        <Svg width={size} height={VB_H * scale} viewBox={`0 0 ${VB_W} ${VB_H}`} style={StyleSheet.absoluteFill}>
                            <Defs>
                                <HatchPattern id="gaugeHatch" color={theme.colors.onSurface} />
                            </Defs>
                            <Path d={arc(0, 1, R)} stroke="url(#gaugeHatch)" strokeWidth={STROKE} fill="none" />
                            {p > 0 && (
                                <G>
                                    {segments.map((s, i) => (
                                        <Path key={i} d={s.d} stroke={s.color} strokeWidth={STROKE} fill="none" />
                                    ))}
                                    <Circle cx={sx} cy={sy} r={STROKE / 2} fill={segments[0]?.color ?? tip} />
                                    <Circle cx={ex} cy={ey} r={STROKE / 2} fill={tip} />
                                    <AnimatedPath
                                        d={arc(0, p, R)}
                                        stroke={theme.colors.background}
                                        strokeWidth={STROKE + 4}
                                        strokeLinecap="round"
                                        fill="none"
                                        strokeDasharray={[coverLen, coverLen + STROKE * 2]}
                                        strokeDashoffset={coverOffset}
                                    />
                                    <AnimatedPath
                                        d={arc(0, p, R)}
                                        stroke="url(#gaugeHatch)"
                                        strokeWidth={STROKE}
                                        strokeLinecap="round"
                                        fill="none"
                                        strokeDasharray={[coverLen, coverLen + STROKE * 2]}
                                        strokeDashoffset={coverOffset}
                                    />
                                </G>
                            )}
                            {pacePct !== null && (
                                <Line
                                    x1={tx0}
                                    y1={ty0}
                                    x2={tx1}
                                    y2={ty1}
                                    stroke={theme.colors.onSurface}
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                />
                            )}
                            <SvgText
                                x={CX}
                                y={CY + 46}
                                textAnchor="middle"
                                fontSize={11}
                                fontFamily={theme.fonts.semibold}
                                fill={theme.colors.onSurfaceVariant}
                            >
                                {caption}
                            </SvgText>
                        </Svg>

                        <Animated.View
                            pointerEvents="none"
                            style={{
                                position: "absolute",
                                left: (CX - half) * scale,
                                top: (CY - half) * scale,
                                width: POINTER_BOX * scale,
                                height: POINTER_BOX * scale,
                                transform: [{ rotate }],
                            }}
                        >
                            <Svg width={POINTER_BOX * scale} height={POINTER_BOX * scale} viewBox={`0 0 ${POINTER_BOX} ${POINTER_BOX}`}>
                                <Polygon points={`${half},${half - 54} ${half - 7},${half - 30} ${half + 7},${half - 30}`} fill={tip} />
                                <Circle cx={half} cy={half} r={5} fill={tip} />
                            </Svg>
                        </Animated.View>
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <View style={styles.footerLeft}>
                    <Text style={styles.spent}>{spentText}</Text>
                    <Text style={styles.of}>of {limitText}</Text>
                    {chip && (
                        <View style={styles.chip}>
                            <PaceChip chip={chip} />
                        </View>
                    )}
                </View>
                <Text style={[styles.percent, { color: tip }]}>{percentText}</Text>
            </View>
        </View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        wrap: {
            paddingTop: 4,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
        },
        headerText: {
            flex: 1,
            paddingRight: 12,
        },
        title: {
            ...theme.typescale.titleMedium,
            fontFamily: theme.fonts.bold,
            color: theme.colors.onSurface,
        },
        subtitle: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
        },
        edit: {
            width: 38,
            height: 38,
            borderRadius: theme.shape.medium,
            backgroundColor: theme.colors.surfaceContainerHigh,
            alignItems: "center",
            justifyContent: "center",
        },
        pressed: {
            opacity: 0.7,
        },
        dialRow: {
            alignItems: "center",
            marginTop: 6,
        },
        footer: {
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: -4,
        },
        footerLeft: {
            flexShrink: 1,
            paddingRight: 12,
        },
        spent: {
            ...theme.typescale.titleLarge,
            fontFamily: theme.fonts.bold,
            color: theme.colors.onSurface,
            fontVariant: ["tabular-nums"],
        },
        of: {
            ...theme.typescale.labelMedium,
            color: theme.colors.onSurfaceVariant,
            fontVariant: ["tabular-nums"],
        },
        chip: {
            marginTop: 8,
        },
        percent: {
            fontSize: 34,
            lineHeight: 38,
            fontFamily: theme.fonts.bold,
            letterSpacing: -0.5,
            fontVariant: ["tabular-nums"],
        },
    });
