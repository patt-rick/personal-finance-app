import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Activity, RotateCcw } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import { AutoLogStats } from "../types";

interface Props {
    stats: AutoLogStats | null;
    onReset: () => void;
}

export default function AutoLogStatsCard({ stats, onReset }: Props) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const captured = (stats?.capturedSms ?? 0) + (stats?.capturedNotifications ?? 0);
    const hasAny = captured > 0
        || (stats?.autoSaved ?? 0) > 0
        || (stats?.queuedForReview ?? 0) > 0
        || (stats?.dedupeHits ?? 0) > 0
        || (stats?.parseFailures ?? 0) > 0;

    return (
        <View style={styles.card}>
            <View style={styles.cardHead}>
                <View style={styles.iconWrap}>
                    <Activity size={16} color={theme.colors.onPrimaryContainer} />
                </View>
                <Text style={styles.cardTitle}>Local metrics</Text>
                {hasAny ? (
                    <TouchableOpacity onPress={onReset} hitSlop={10} style={styles.resetBtn}>
                        <RotateCcw size={14} color={theme.colors.onSurfaceVariant} />
                        <Text style={styles.resetText}>Reset</Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            {hasAny ? (
                <>
                    <View style={styles.grid}>
                        <Cell label="Captured" value={captured} styles={styles} theme={theme} />
                        <Cell label="Auto-saved" value={stats?.autoSaved ?? 0} styles={styles} theme={theme} />
                        <Cell label="Queued" value={stats?.queuedForReview ?? 0} styles={styles} theme={theme} />
                        <Cell
                            label="De-duped"
                            value={stats?.dedupeHits ?? 0}
                            styles={styles}
                            theme={theme}
                        />
                    </View>
                    {stats?.lastUpdated ? (
                        <Text style={styles.footerText}>
                            Updated {new Date(stats.lastUpdated).toLocaleString()}
                        </Text>
                    ) : null}
                </>
            ) : (
                <Text style={styles.emptyText}>
                    No captures yet. Counters populate after the first drained event.
                </Text>
            )}
        </View>
    );
}

interface CellProps {
    label: string;
    value: number;
    styles: ReturnType<typeof createStyles>;
    theme: any;
}

function Cell({ label, value, styles, theme }: CellProps) {
    return (
        <View style={styles.cell}>
            <Text style={[styles.cellValue, { color: theme.colors.onSurface }]}>{value}</Text>
            <Text style={[styles.cellLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        card: {
            backgroundColor: theme.colors.surfaceContainerLow,
            borderRadius: theme.shape.large,
            padding: theme.spacing.l,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        cardHead: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
        },
        iconWrap: {
            width: 28,
            height: 28,
            borderRadius: theme.shape.small,
            backgroundColor: theme.colors.primaryContainer,
            alignItems: "center",
            justifyContent: "center",
        },
        cardTitle: {
            flex: 1,
            fontSize: 14,
            fontWeight: "700",
            color: theme.colors.onSurface,
            letterSpacing: -0.1,
        },
        resetBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: theme.shape.small,
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        resetText: {
            fontSize: 11,
            fontWeight: "600",
            color: theme.colors.onSurfaceVariant,
        },
        grid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
        },
        cell: {
            flexGrow: 1,
            minWidth: "46%",
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: theme.shape.medium,
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        cellValue: {
            fontSize: 20,
            fontWeight: "800",
            letterSpacing: -0.5,
        },
        cellLabel: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: 2,
            letterSpacing: 0.3,
        },
        footerText: {
            fontSize: 11,
            color: theme.colors.onSurfaceVariant,
            marginTop: 10,
        },
        emptyText: {
            fontSize: 12,
            color: theme.colors.onSurfaceVariant,
            lineHeight: 18,
        },
    });
