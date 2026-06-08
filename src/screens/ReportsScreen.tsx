import React, { useMemo, useState, useCallback, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, BackHandler } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TrendingUp, TrendingDown, ArrowLeft } from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { Business, Transaction } from "../types";
import { getCurrencySymbol } from "../utils/_helpers";
import {
    getMonthlyTrends,
    getCategoryBreakdown,
    getMonthComparison,
    getTopCategories,
    getBiggestTransactions,
} from "../utils/reportCalculations";
import PairedBarChart from "../components/dashboard/PairedBarChart";
import DonutChart from "../components/dashboard/DonutChart";
import ChartCarousel from "../components/ChartCarousel";
import { EmptyScene, HeaderBackdrop } from "../components/illustrations";

interface ReportsScreenProps {
    businesses: Business[];
    transactions: Transaction[];
    onBack?: () => void;
}

const PERIODS = ["This Month", "3 Months", "6 Months", "Year"] as const;
type Period = (typeof PERIODS)[number];

function getDateRange(period: Period): { start: Date; end: Date; monthCount: number } {
    const now = new Date();
    const end = now;
    let start: Date;
    let monthCount: number;

    switch (period) {
        case "This Month":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            monthCount = 1;
            break;
        case "3 Months":
            start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            monthCount = 3;
            break;
        case "6 Months":
            start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            monthCount = 6;
            break;
        case "Year":
            start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            monthCount = 12;
            break;
    }

    return { start, end, monthCount };
}

export default function ReportsScreen({ businesses, transactions, onBack }: ReportsScreenProps) {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    useEffect(() => {
        if (!onBack) return;
        const onBackPress = () => {
            onBack();
            return true;
        };
        const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () => subscription.remove();
    }, [onBack]);

    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<Period>("3 Months");

    const filteredTransactions = useMemo(
        () =>
            selectedBusinessId
                ? transactions.filter((t) => t.businessId === selectedBusinessId)
                : transactions,
        [transactions, selectedBusinessId],
    );

    const currencySymbol = useMemo(() => {
        if (selectedBusinessId) {
            const biz = businesses.find((b) => b.id === selectedBusinessId);
            return getCurrencySymbol(biz?.currency);
        }
        return getCurrencySymbol(businesses[0]?.currency);
    }, [selectedBusinessId, businesses]);

    const { start, end, monthCount } = useMemo(() => getDateRange(selectedPeriod), [selectedPeriod]);

    const trends = useMemo(
        () => getMonthlyTrends(filteredTransactions, monthCount),
        [filteredTransactions, monthCount],
    );

    const expenseBreakdown = useMemo(
        () => getCategoryBreakdown(filteredTransactions, start, end, "expense"),
        [filteredTransactions, start, end],
    );

    const comparison = useMemo(
        () => getMonthComparison(filteredTransactions),
        [filteredTransactions],
    );

    const topCategories = useMemo(
        () => getTopCategories(filteredTransactions, 5, "expense", start, end),
        [filteredTransactions, start, end],
    );

    const biggestExpenses = useMemo(
        () => getBiggestTransactions(filteredTransactions, 5, "expense", start, end),
        [filteredTransactions, start, end],
    );

    const chartPages = useMemo(() => {
        const pages: { title: string; legend?: { label: string; color: string }[]; content: React.ReactNode }[] = [];

        if (trends.income.some((v) => v > 0) || trends.expense.some((v) => v > 0)) {
            pages.push({
                title: "Monthly Trends",
                legend: [
                    { label: "Income", color: theme.colors.income },
                    { label: "Expense", color: theme.colors.expense },
                ],
                content: (
                    <PairedBarChart
                        labels={trends.labels}
                        primaryData={trends.income}
                        secondaryData={trends.expense}
                        primaryColor={theme.colors.income}
                        secondaryColor={theme.colors.expense}
                        currencySymbol={currencySymbol}
                    />
                ),
            });
        }

        if (expenseBreakdown.length > 0) {
            const donutData = expenseBreakdown.map((c) => ({
                value: c.amount,
                color: c.color,
                label: c.name,
            }));
            const total = expenseBreakdown.reduce((acc, c) => acc + c.amount, 0);
            pages.push({
                title: "Expense Breakdown",
                content: <DonutChart data={donutData} total={total} currencySymbol={currencySymbol} />,
            });
        }

        return pages;
    }, [trends, expenseBreakdown, theme, currencySymbol]);

    const hasData = filteredTransactions.some((t) => {
        const td = new Date(t.date);
        return td >= start && td <= end;
    });

    const maxCategoryAmount = topCategories.length > 0 ? topCategories[0].amount : 0;

    return (
        <View style={styles.container}>
            <HeaderBackdrop height={240} />
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                {onBack && (
                    <TouchableOpacity
                        onPress={onBack}
                        style={styles.backBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <ArrowLeft size={20} color={theme.colors.onSurface} />
                    </TouchableOpacity>
                )}
                <Text style={styles.title}>Reports</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                >
                    <TouchableOpacity
                        style={[
                            styles.chip,
                            !selectedBusinessId ? styles.chipActive : styles.chipInactive,
                        ]}
                        onPress={() => setSelectedBusinessId(null)}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                !selectedBusinessId ? styles.chipTextActive : styles.chipTextInactive,
                            ]}
                        >
                            All
                        </Text>
                    </TouchableOpacity>
                    {businesses.map((biz) => (
                        <TouchableOpacity
                            key={biz.id}
                            style={[
                                styles.chip,
                                selectedBusinessId === biz.id ? styles.chipActive : styles.chipInactive,
                            ]}
                            onPress={() => setSelectedBusinessId(biz.id)}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    selectedBusinessId === biz.id ? styles.chipTextActive : styles.chipTextInactive,
                                ]}
                            >
                                {biz.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                >
                    {PERIODS.map((period) => (
                        <TouchableOpacity
                            key={period}
                            style={[
                                styles.chip,
                                selectedPeriod === period ? styles.chipActive : styles.chipInactive,
                            ]}
                            onPress={() => setSelectedPeriod(period)}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    selectedPeriod === period ? styles.chipTextActive : styles.chipTextInactive,
                                ]}
                            >
                                {period}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {!hasData ? (
                    <View style={styles.emptyContainer}>
                        <EmptyScene variant="reports" size={220} />
                        <Text style={styles.emptyText}>
                            No transactions found for this period
                        </Text>
                    </View>
                ) : (
                    <>
                        {chartPages.length > 0 && <ChartCarousel pages={chartPages} />}

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                Month over Month
                            </Text>
                        </View>
                        <View style={styles.comparisonRow}>
                            <ComparisonCard
                                label="Income"
                                value={comparison.incomeChange}
                                theme={theme}
                                styles={styles}
                            />
                            <ComparisonCard
                                label="Expense"
                                value={comparison.expenseChange}
                                theme={theme}
                                styles={styles}
                            />
                            <ComparisonCard
                                label="Net"
                                value={comparison.netChange}
                                theme={theme}
                                styles={styles}
                            />
                        </View>

                        {topCategories.length > 0 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>
                                        Top Spending Categories
                                    </Text>
                                </View>
                                <View style={styles.card}>
                                    {topCategories.map((cat, i) => (
                                        <View key={cat.name} style={[styles.categoryRow, i > 0 && styles.categoryDivider]}>
                                            <View style={styles.categoryInfo}>
                                                <Text style={styles.categoryName}>
                                                    {cat.name}
                                                </Text>
                                                <Text style={styles.categoryCount}>
                                                    {cat.count} transaction{cat.count !== 1 ? "s" : ""}
                                                </Text>
                                            </View>
                                            <Text style={styles.categoryAmount}>
                                                {currencySymbol}{cat.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </Text>
                                            <View style={styles.progressBarBg}>
                                                <View
                                                    style={[
                                                        styles.progressBarFill,
                                                        {
                                                            width: `${maxCategoryAmount > 0 ? (cat.amount / maxCategoryAmount) * 100 : 0}%` as any,
                                                        },
                                                    ]}
                                                />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {biggestExpenses.length > 0 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>
                                        Biggest Expenses
                                    </Text>
                                </View>
                                <View style={styles.card}>
                                    {biggestExpenses.map((tx, i) => (
                                        <View key={tx.id} style={[styles.txRow, i > 0 && styles.categoryDivider]}>
                                            <View style={styles.txInfo}>
                                                <Text style={styles.txDesc} numberOfLines={1}>
                                                    {tx.description}
                                                </Text>
                                                <Text style={styles.txMeta}>
                                                    {tx.category || "Uncategorized"} · {new Date(tx.date).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <Text style={styles.txAmount}>
                                                -{currencySymbol}{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

function ComparisonCard({
    label,
    value,
    theme,
    styles,
}: {
    label: string;
    value: number;
    theme: ReturnType<typeof useTheme>;
    styles: ReturnType<typeof createStyles>;
}) {
    const isPositive = value >= 0;
    const Arrow = isPositive ? TrendingUp : TrendingDown;
    const color = label === "Expense"
        ? (isPositive ? theme.colors.error : theme.colors.income)
        : (isPositive ? theme.colors.income : theme.colors.error);

    return (
        <View style={styles.statCard}>
            <Text style={styles.statLabel}>{label}</Text>
            <Arrow size={16} color={color} />
            <Text style={[styles.statValue, { color }]}>
                {Math.abs(value).toFixed(1)}%
            </Text>
        </View>
    );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        header: {
            flexDirection: "row" as const,
            alignItems: "center" as const,
            paddingHorizontal: 20,
            paddingBottom: 16,
            gap: 12,
        },
        backBtn: {
            width: 40,
            height: 40,
            borderRadius: theme.shape.medium,
            backgroundColor: theme.colors.surfaceContainerLow,
            alignItems: "center" as const,
            justifyContent: "center" as const,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        title: {
            ...theme.typescale.headlineSmall,
            color: theme.colors.onSurface,
        },
        chipRow: {
            paddingHorizontal: 20,
            gap: 8,
            paddingBottom: 10,
        },
        chip: {
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: theme.shape.small,
            borderWidth: 1,
        },
        chipInactive: {
            backgroundColor: "transparent",
            borderColor: theme.colors.outlineVariant,
        },
        chipActive: {
            backgroundColor: theme.colors.secondaryContainer,
            borderColor: theme.colors.secondaryContainer,
        },
        chipText: {
            fontSize: 13,
            fontWeight: "600" as const,
        },
        chipTextInactive: {
            color: theme.colors.onSurfaceVariant,
        },
        chipTextActive: {
            color: theme.colors.onSecondaryContainer,
        },
        emptyContainer: {
            padding: 60,
            alignItems: "center" as const,
        },
        emptyText: {
            textAlign: "center" as const,
            fontSize: 14,
            lineHeight: 20,
            color: theme.colors.onSurfaceVariant,
        },
        sectionHeader: {
            paddingHorizontal: 20,
            marginTop: 24,
            marginBottom: 12,
        },
        sectionTitle: {
            ...theme.typescale.titleMedium,
            color: theme.colors.onSurface,
        },
        comparisonRow: {
            flexDirection: "row" as const,
            paddingHorizontal: 20,
            gap: 10,
        },
        statCard: {
            flex: 1,
            alignItems: "center" as const,
            padding: 14,
            borderRadius: theme.shape.large,
            gap: 6,
            backgroundColor: theme.colors.surfaceContainerLow,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        statLabel: {
            fontSize: 11,
            fontWeight: "600" as const,
            textTransform: "uppercase" as const,
            letterSpacing: 0.5,
            color: theme.colors.onSurfaceVariant,
        },
        statValue: {
            fontSize: 16,
            fontWeight: "800" as const,
        },
        card: {
            marginHorizontal: 20,
            borderRadius: theme.shape.large,
            padding: 14,
            backgroundColor: theme.colors.surfaceContainerLow,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        categoryRow: {
            paddingVertical: 12,
        },
        categoryDivider: {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.outlineVariant,
        },
        categoryInfo: {
            flexDirection: "row" as const,
            justifyContent: "space-between" as const,
            alignItems: "center" as const,
            marginBottom: 6,
        },
        categoryName: {
            fontSize: 14,
            fontWeight: "600" as const,
            color: theme.colors.onSurface,
        },
        categoryCount: {
            fontSize: 11,
            color: theme.colors.onSurfaceVariant,
        },
        categoryAmount: {
            fontSize: 14,
            fontWeight: "700" as const,
            marginBottom: 6,
            color: theme.colors.onSurface,
        },
        progressBarBg: {
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.colors.surfaceContainerHighest,
            overflow: "hidden" as const,
        },
        progressBarFill: {
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.colors.primary,
        },
        txRow: {
            flexDirection: "row" as const,
            alignItems: "center" as const,
            paddingVertical: 12,
        },
        txInfo: {
            flex: 1,
            marginRight: 12,
        },
        txDesc: {
            fontSize: 14,
            fontWeight: "600" as const,
            color: theme.colors.onSurface,
        },
        txMeta: {
            fontSize: 11,
            marginTop: 2,
            color: theme.colors.onSurfaceVariant,
        },
        txAmount: {
            fontSize: 14,
            fontWeight: "700" as const,
            color: theme.colors.expense,
        },
    });
}
