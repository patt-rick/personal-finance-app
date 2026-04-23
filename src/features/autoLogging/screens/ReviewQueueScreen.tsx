import React, { useEffect, useMemo } from "react";
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Inbox } from "lucide-react-native";
import { useTheme } from "../../../theme/theme";
import { Business } from "../../../types";
import { useAutoLogQueue } from "../hooks/useAutoLogQueue";
import ReviewItemCard from "../components/ReviewItemCard";

interface Props {
    businesses: Business[];
    onBack: () => void;
    onConfirmed?: () => void;
}

export default function ReviewQueueScreen({ businesses, onBack, onConfirmed }: Props) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const { items, loading, confirm, reject } = useAutoLogQueue();

    useEffect(() => {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            onBack();
            return true;
        });
        return () => sub.remove();
    }, [onBack]);

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={12}>
                    <ArrowLeft size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Review Queue</Text>
                    {items.length > 0 ? (
                        <Text style={styles.headerSubtitle}>{items.length} pending</Text>
                    ) : null}
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 40, paddingHorizontal: 20 }}
                showsVerticalScrollIndicator={false}
            >
                {loading ? null : items.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <View style={styles.emptyIconCircle}>
                            <Inbox size={22} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>Nothing to review</Text>
                        <Text style={styles.emptyBody}>
                            High-confidence captures save straight to your cashbooks. Anything uncertain shows up here.
                        </Text>
                    </View>
                ) : (
                    items.map((item) => (
                        <ReviewItemCard
                            key={item.id}
                            item={item}
                            business={businesses.find((b) => b.id === item.businessId)}
                            onConfirm={async (edits) => {
                                await confirm(item, edits);
                                onConfirmed?.();
                            }}
                            onReject={() => reject(item)}
                        />
                    ))
                )}
            </ScrollView>
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
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: theme.colors.card,
            alignItems: "center",
            justifyContent: "center",
        },
        headerTitle: {
            fontSize: 26,
            fontWeight: "800",
            letterSpacing: -0.3,
            color: theme.colors.text,
        },
        headerSubtitle: {
            fontSize: 12,
            fontWeight: "600",
            color: theme.colors.textSecondary,
            marginTop: 2,
        },
        emptyCard: {
            backgroundColor: theme.colors.card,
            borderRadius: 16,
            padding: 24,
            alignItems: "center",
            marginTop: 8,
        },
        emptyIconCircle: {
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: theme.colors.incomeBg,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
        },
        emptyTitle: {
            fontSize: 16,
            fontWeight: "700",
            color: theme.colors.text,
            marginBottom: 4,
        },
        emptyBody: {
            fontSize: 13,
            color: theme.colors.textSecondary,
            textAlign: "center",
            lineHeight: 18,
        },
    });
