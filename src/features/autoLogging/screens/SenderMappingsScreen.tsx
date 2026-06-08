import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Radio } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import { Business } from "../../../types";
import { SenderMapping } from "../types";
import { useSenderMappings } from "../hooks/useSenderMappings";
import SenderMappingRow from "../components/SenderMappingRow";
import SenderMappingEditor from "../components/SenderMappingEditor";

interface Props {
    businesses: Business[];
    onBack: () => void;
}

export default function SenderMappingsScreen({ businesses, onBack }: Props) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const { mappings, loading, rename, reroute, remove, reload } = useSenderMappings();
    const [editing, setEditing] = useState<SenderMapping | null>(null);

    useEffect(() => {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            if (editing) {
                setEditing(null);
                return true;
            }
            onBack();
            return true;
        });
        return () => sub.remove();
    }, [editing, onBack]);

    const handleSave = useCallback(
        async (patch: { displayName: string; businessId: string | null }) => {
            if (!editing) return;
            await rename(editing.senderKey, patch.displayName);
            await reroute(editing.senderKey, patch.businessId);
            setEditing(null);
        },
        [editing, rename, reroute],
    );

    const handleDelete = useCallback(async () => {
        if (!editing) return;
        await remove(editing.senderKey);
        setEditing(null);
    }, [editing, remove]);

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={12}>
                    <ArrowLeft size={20} color={theme.colors.onSurface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Sender Mappings</Text>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 40, paddingHorizontal: 20 }}
                showsVerticalScrollIndicator={false}
            >
                {loading ? null : mappings.length === 0 ? (
                    <EmptyState styles={styles} theme={theme} />
                ) : (
                    <View style={styles.groupCard}>
                        {mappings.map((mapping, i) => {
                            const business = businesses.find((b) => b.id === mapping.businessId);
                            return (
                                <SenderMappingRow
                                    key={mapping.senderKey}
                                    mapping={mapping}
                                    business={business}
                                    onPress={() => setEditing(mapping)}
                                    last={i === mappings.length - 1}
                                />
                            );
                        })}
                    </View>
                )}

                <Text style={styles.explainer}>
                    When a new SMS or notification arrives, the auto-logger looks up the sender here. If there is no
                    match, a new cashbook is created and listed here for you to rename or reroute.
                </Text>

                <TouchableOpacity style={styles.refreshBtn} onPress={reload}>
                    <Text style={styles.refreshText}>Reload</Text>
                </TouchableOpacity>
            </ScrollView>

            <SenderMappingEditor
                visible={editing !== null}
                mapping={editing}
                businesses={businesses}
                onClose={() => setEditing(null)}
                onSave={handleSave}
                onDelete={handleDelete}
            />
        </View>
    );
}

function EmptyState({
    styles,
    theme,
}: {
    styles: ReturnType<typeof createStyles>;
    theme: any;
}) {
    return (
        <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
                <Radio size={22} color={theme.colors.onPrimaryContainer} />
            </View>
            <Text style={styles.emptyTitle}>No senders yet</Text>
            <Text style={styles.emptyBody}>
                Mappings appear here automatically the first time the auto-logger captures a message from a new source.
            </Text>
        </View>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        header: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 16,
            gap: 12,
        },
        backBtn: {
            width: 40,
            height: 40,
            borderRadius: theme.shape.medium,
            backgroundColor: theme.colors.surfaceContainerLow,
            alignItems: "center",
            justifyContent: "center",
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        headerTitle: {
            fontSize: 26,
            fontWeight: "800",
            letterSpacing: -0.3,
            color: theme.colors.onSurface,
        },
        groupCard: {
            backgroundColor: theme.colors.surfaceContainerLow,
            borderRadius: theme.shape.large,
            overflow: "hidden",
            marginTop: 8,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        explainer: {
            fontSize: 12,
            color: theme.colors.onSurfaceVariant,
            lineHeight: 18,
            marginTop: 16,
            marginHorizontal: 4,
        },
        refreshBtn: {
            marginTop: 16,
            alignSelf: "flex-start",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.secondaryContainer,
        },
        refreshText: {
            fontSize: 12,
            fontWeight: "700",
            color: theme.colors.onSecondaryContainer,
            letterSpacing: 0.4,
        },
        emptyCard: {
            backgroundColor: theme.colors.surfaceContainerLow,
            borderRadius: theme.shape.large,
            padding: 24,
            alignItems: "center",
            marginTop: 8,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        emptyIconCircle: {
            width: 56,
            height: 56,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.primaryContainer,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
        },
        emptyTitle: {
            fontSize: 16,
            fontWeight: "700",
            color: theme.colors.onSurface,
            marginBottom: 4,
        },
        emptyBody: {
            fontSize: 13,
            color: theme.colors.onSurfaceVariant,
            textAlign: "center",
            lineHeight: 18,
        },
    });
