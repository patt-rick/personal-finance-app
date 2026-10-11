import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Plus, X } from "lucide-react-native";
import AppModal from "../../../../components/AppModal";
import { AppTheme, useTheme } from "../../../../theme/theme";
import { Category } from "../../../../types";
import { exactMoney } from "../../../../utils/chartScale";
import { MONEY_INPUT } from "../../setupModel";
import HatchTrack from "../HatchTrack";

export interface LimitRow {
    id: string;
    text: string;
}

interface CategoryLimitsEditorProps {
    rows: LimitRow[];
    categories: Category[];
    symbol: string;
    total: number | null;
    allocated: number;
    errorId: string | null;
    onChange: (rows: LimitRow[]) => void;
}

export default function CategoryLimitsEditor(props: CategoryLimitsEditorProps) {
    const { rows, categories, symbol, total, allocated, errorId, onChange } = props;
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [picking, setPicking] = useState(false);
    const byId = new Map(categories.map((c) => [c.id, c]));
    const visible = rows.filter((r) => byId.has(r.id));
    const available = categories.filter((c) => !rows.some((r) => r.id === c.id));
    const over = total !== null && Math.round(allocated * 100) > Math.round(total * 100);
    const fill = total && total > 0 ? Math.min(allocated / total, 1) : 0;

    const setText = (id: string, text: string) => {
        if (!MONEY_INPUT.test(text)) return;
        onChange(rows.map((r) => (r.id === id ? { ...r, text } : r)));
    };

    return (
        <View style={styles.card}>
            <View style={styles.headRow}>
                <Text style={styles.title}>Category limits</Text>
                <Text style={styles.optional}>Optional</Text>
            </View>
            <Text style={styles.help}>Cap particular categories inside your total. Leave this empty for one overall limit.</Text>

            {visible.length > 0 && (
                <>
                    <View style={styles.track}>
                        <HatchTrack id="setupAllocation" />
                        <View
                            style={[
                                styles.fill,
                                { width: `${fill * 100}%`, backgroundColor: over ? theme.colors.expense : theme.colors.primary },
                            ]}
                        />
                    </View>
                    <Text style={[styles.allocation, over && { color: theme.colors.error }]}>
                        {exactMoney(allocated, symbol)} allocated
                        {total !== null && !over ? `, ${exactMoney(total - allocated, symbol)} unallocated` : ""}
                    </Text>
                </>
            )}

            {visible.map((row, i) => (
                <View key={row.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                    <View style={[styles.swatch, { backgroundColor: theme.colors.chart[i % theme.colors.chart.length] }]} />
                    <Text style={styles.name} numberOfLines={1}>
                        {byId.get(row.id)!.name}
                    </Text>
                    <View style={[styles.inputWrap, errorId === row.id && styles.inputError]}>
                        <Text style={styles.symbol}>{symbol}</Text>
                        <TextInput
                            value={row.text}
                            onChangeText={(t) => setText(row.id, t)}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={theme.colors.placeholder}
                            style={styles.input}
                            accessibilityLabel={`${byId.get(row.id)!.name} limit`}
                        />
                    </View>
                    <Pressable
                        onPress={() => onChange(rows.filter((r) => r.id !== row.id))}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${byId.get(row.id)!.name}`}
                    >
                        <X size={18} color={theme.colors.onSurfaceVariant} />
                    </Pressable>
                </View>
            ))}

            <Pressable
                onPress={() => setPicking(true)}
                style={({ pressed }) => [styles.add, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
            >
                <Plus size={16} color={theme.colors.primary} />
                <Text style={styles.addText}>Add category limit</Text>
            </Pressable>

            <AppModal visible={picking} onClose={() => setPicking(false)} title="Add category limit" scrollable>
                {available.length === 0 ? (
                    <Text style={styles.help}>Every expense category already has a limit.</Text>
                ) : (
                    available.map((c) => (
                        <Pressable
                            key={c.id}
                            onPress={() => {
                                onChange([...rows, { id: c.id, text: "" }]);
                                setPicking(false);
                            }}
                            style={({ pressed }) => [styles.pickItem, pressed && { opacity: 0.7 }]}
                        >
                            <Text style={styles.pickText}>{c.name}</Text>
                            <Plus size={18} color={theme.colors.primary} />
                        </Pressable>
                    ))
                )}
            </AppModal>
        </View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        card: {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: theme.shape.largeIncreased,
            padding: 16,
            marginTop: 24,
        },
        headRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
        },
        title: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
        },
        optional: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
        },
        help: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
            marginTop: 4,
        },
        track: {
            height: 10,
            borderRadius: theme.shape.full,
            overflow: "hidden",
            marginTop: 14,
        },
        fill: {
            height: "100%",
            borderRadius: theme.shape.full,
        },
        allocation: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
            marginTop: 6,
            fontVariant: ["tabular-nums"],
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 10,
            marginTop: 4,
        },
        rowDivider: {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.outlineVariant,
            marginTop: 0,
        },
        swatch: {
            width: 10,
            height: 10,
            borderRadius: 3,
        },
        name: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
            flex: 1,
        },
        inputWrap: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            minWidth: 112,
            paddingHorizontal: 10,
            borderRadius: 10,
            backgroundColor: theme.colors.surfaceContainer,
            borderWidth: 1.5,
            borderColor: "transparent",
        },
        inputError: {
            borderColor: theme.colors.error,
        },
        symbol: {
            ...theme.typescale.labelLarge,
            color: theme.colors.onSurfaceVariant,
        },
        input: {
            flex: 1,
            paddingVertical: 8,
            textAlign: "right",
            fontFamily: theme.fonts.semibold,
            fontSize: 14,
            color: theme.colors.onSurface,
            fontVariant: ["tabular-nums"],
        },
        add: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 12,
            paddingVertical: 11,
            borderRadius: theme.shape.medium,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: theme.colors.outline,
        },
        addText: {
            ...theme.typescale.labelLarge,
            color: theme.colors.primary,
        },
        pickItem: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.outlineVariant,
        },
        pickText: {
            ...theme.typescale.bodyLarge,
            color: theme.colors.onSurface,
        },
    });
