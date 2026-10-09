import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
    BackHandler,
    LayoutChangeEvent,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { Business, Transaction } from "../types";
import { getCurrencySymbol } from "../utils/_helpers";
import {
    getMonthlyTrends,
    getCategoryBreakdown,
    getTopCategories,
    getBiggestTransactions,
} from "../utils/reportCalculations";
import { cashbookCurrency, excludeInternalTransfers } from "../utils/transfers";
import { buildMonthOverMonth, buildPeriodSummary } from "../utils/reportStory";
import { EmptyScene } from "../components/illustrations";
import { useReducedMotion } from "../components/reports/motion";
import StoryHero from "../components/reports/StoryHero";
import PairedBarChart from "../components/dashboard/PairedBarChart";
import DonutChart from "../components/dashboard/DonutChart";
import ChartCarousel from "../components/ChartCarousel";
import CategoryStory, { CategoryShare } from "../components/reports/CategoryStory";
import ComparisonStory from "../components/reports/ComparisonStory";
import BiggestExpenses from "../components/reports/BiggestExpenses";

interface ReportsScreenProps {
    businesses: Business[];
    transactions: Transaction[];
    onBack?: () => void;
}

const PERIODS = ["This Month", "3 Months", "6 Months", "Year"] as const;
type Period = (typeof PERIODS)[number];

const PERIOD_LABEL: Record<Period, string> = {
    "This Month": "This month",
    "3 Months": "Last 3 months",
    "6 Months": "Last 6 months",
    Year: "Last 12 months",
};

/** A section starts its motion once its top is this far above the bottom of the viewport. */
const REVEAL_INSET = 80;

type SectionKey = "categories" | "comparison";

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
    const reduced = useReducedMotion();

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
    const [viewportBottom, setViewportBottom] = useState(0);
    const [storyY, setStoryY] = useState<number | null>(null);
    const [sections, setSections] = useState<{ story: string; y: Partial<Record<SectionKey, number>> }>({
        story: "",
        y: {},
    });

    const filteredTransactions = useMemo(
        () =>
            selectedBusinessId
                ? transactions.filter((t) => t.businessId === selectedBusinessId)
                : excludeInternalTransfers(transactions),
        [transactions, selectedBusinessId],
    );

    // In "All", internal transfers are already gone and the fee rows they leave behind are real spending.
    const spendingTransactions = useMemo(
        () => (selectedBusinessId ? filteredTransactions.filter((t) => !t.transferId) : filteredTransactions),
        [filteredTransactions, selectedBusinessId],
    );

    const currencySymbol = useMemo(() => {
        if (selectedBusinessId) {
            const biz = businesses.find((b) => b.id === selectedBusinessId);
            return getCurrencySymbol(biz?.currency);
        }
        return getCurrencySymbol(businesses[0]?.currency);
    }, [selectedBusinessId, businesses]);

    const mixedCurrencies = useMemo(
        () => !selectedBusinessId && new Set(businesses.map(cashbookCurrency)).size > 1,
        [selectedBusinessId, businesses],
    );

    const { start, end, monthCount } = useMemo(() => getDateRange(selectedPeriod), [selectedPeriod]);

    const summary = useMemo(
        () => buildPeriodSummary(filteredTransactions, start, end),
        [filteredTransactions, start, end],
    );

    const moved = useMemo(() => {
        if (!selectedBusinessId) return { in: 0, out: 0 };
        const transfers = filteredTransactions
            .filter((t) => t.transferId)
            .map((t) => ({ ...t, fee: undefined }));
        const s = buildPeriodSummary(transfers, start, end);
        return { in: s.income, out: s.expense };
    }, [selectedBusinessId, filteredTransactions, start, end]);

    const trends = useMemo(
        () => getMonthlyTrends(filteredTransactions, monthCount),
        [filteredTransactions, monthCount],
    );

    const expenseBreakdown = useMemo(
        () => getCategoryBreakdown(spendingTransactions, start, end, "expense"),
        [spendingTransactions, start, end],
    );

    const categories = useMemo<CategoryShare[]>(() => {
        const breakdown = expenseBreakdown;
        const counts = new Map(
            getTopCategories(spendingTransactions, breakdown.length, "expense", start, end).map((c) => [
                c.name,
                c.count,
            ]),
        );
        return breakdown.slice(0, 5).map((c) => ({
            name: c.name,
            amount: c.amount,
            percentage: c.percentage,
            count: counts.get(c.name) ?? 0,
            color: c.color,
        }));
    }, [expenseBreakdown, spendingTransactions, start, end]);

    const chartPages = useMemo(() => {
        const pages: { title: string; legend?: { label: string; color: string }[]; content: React.ReactNode }[] = [];

        if (trends.income.some((v) => v > 0) || trends.expense.some((v) => v > 0)) {
            pages.push({
                title: "Monthly Trends",
                legend: [
                    { label: "Income", color: theme.colors.income },
                    { label: "Expense", color: theme.colors.chart[3] },
                ],
                content: (
                    <PairedBarChart
                        labels={trends.labels}
                        primaryData={trends.income}
                        secondaryData={trends.expense}
                        primaryColor={theme.colors.income}
                        secondaryColor={theme.colors.chart[3]}
                        currencySymbol={currencySymbol}
                    />
                ),
            });
        }

        if (expenseBreakdown.length > 0) {
            const donutData = expenseBreakdown.map((c) => ({ value: c.amount, color: c.color, label: c.name }));
            const total = expenseBreakdown.reduce((acc, c) => acc + c.amount, 0);
            pages.push({
                title: "Expense Breakdown",
                content: <DonutChart data={donutData} total={total} currencySymbol={currencySymbol} />,
            });
        }

        return pages;
    }, [trends, expenseBreakdown, theme, currencySymbol]);

    const comparison = useMemo(() => buildMonthOverMonth(filteredTransactions), [filteredTransactions]);

    const biggestExpenses = useMemo(
        () => getBiggestTransactions(spendingTransactions, 5, "expense", start, end),
        [spendingTransactions, start, end],
    );

    const hasData = useMemo(
        () =>
            filteredTransactions.some((t) => {
                const td = new Date(t.date);
                return td >= start && td <= end;
            }),
        [filteredTransactions, start, end],
    );

    const storyKey = `${selectedPeriod}:${selectedBusinessId ?? "all"}`;

    const currentBottom = useRef(0);

    useEffect(() => {
        setViewportBottom(currentBottom.current);
    }, [storyKey]);

    const onScrollViewLayout = useCallback((e: LayoutChangeEvent) => {
        const h = e.nativeEvent.layout.height;
        currentBottom.current = Math.max(currentBottom.current, h);
        setViewportBottom((prev) => Math.max(prev, h));
    }, []);

    const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const bottom = e.nativeEvent.contentOffset.y + e.nativeEvent.layoutMeasurement.height;
        currentBottom.current = bottom;
        setViewportBottom((prev) => (bottom > prev + 24 ? bottom : prev));
    }, []);

    const trackSection = (key: SectionKey) => (e: LayoutChangeEvent) => {
        const y = e.nativeEvent.layout.y;
        setSections((prev) => {
            const base = prev.story === storyKey ? prev.y : {};
            return base[key] === y && prev.story === storyKey ? prev : { story: storyKey, y: { ...base, [key]: y } };
        });
    };

    const isRevealed = (key: SectionKey) => {
        const y = sections.story === storyKey ? sections.y[key] : undefined;
        return storyY !== null && y !== undefined && storyY + y + REVEAL_INSET < viewportBottom;
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                {onBack && (
                    <TouchableOpacity
                        onPress={onBack}
                        style={styles.backBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="Back"
                    >
                        <ArrowLeft size={20} color={theme.colors.onSurface} />
                    </TouchableOpacity>
                )}
                <Text style={styles.title}>Reports</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                onLayout={onScrollViewLayout}
                onScroll={onScroll}
                scrollEventThrottle={100}
            >
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
                    <View key={storyKey} onLayout={(e) => setStoryY(e.nativeEvent.layout.y)}>
                        <StoryHero
                            periodLabel={PERIOD_LABEL[selectedPeriod]}
                            summary={summary}
                            symbol={currencySymbol}
                            movedIn={moved.in}
                            movedOut={moved.out}
                            mixedCurrencies={mixedCurrencies}
                            reduced={reduced}
                        />

                        {chartPages.length > 0 && <ChartCarousel pages={chartPages} bare />}

                        {categories.length > 0 && (
                            <View onLayout={trackSection("categories")}>
                                <Text style={styles.sectionTitle}>Where it went</Text>
                                <CategoryStory
                                    categories={categories}
                                    symbol={currencySymbol}
                                    active={isRevealed("categories")}
                                    reduced={reduced}
                                />
                            </View>
                        )}

                        <View onLayout={trackSection("comparison")}>
                            <Text style={styles.sectionTitle}>Compared with last month</Text>
                            <Text style={styles.sectionNote}>
                                This month so far, against the same days last month.
                            </Text>
                            <ComparisonStory
                                comparison={comparison}
                                active={isRevealed("comparison")}
                                reduced={reduced}
                            />
                        </View>

                        {biggestExpenses.length > 0 && (
                            <View>
                                <Text style={styles.sectionTitle}>Biggest expenses</Text>
                                <BiggestExpenses transactions={biggestExpenses} symbol={currencySymbol} />
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
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
            backgroundColor: theme.colors.surfaceContainerHigh,
            alignItems: "center" as const,
            justifyContent: "center" as const,
        },
        title: {
            fontSize: 22,
            fontFamily: theme.fonts.semibold,
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
            borderRadius: theme.shape.full,
            borderWidth: 1,
        },
        chipInactive: {
            backgroundColor: "transparent",
            borderColor: theme.colors.outlineVariant,
        },
        chipActive: {
            backgroundColor: theme.colors.inverseSurface,
            borderColor: theme.colors.inverseSurface,
        },
        chipText: {
            fontSize: 13,
        },
        chipTextInactive: {
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
        },
        chipTextActive: {
            fontFamily: theme.fonts.semibold,
            color: theme.colors.inverseOnSurface,
        },
        emptyContainer: {
            padding: 60,
            alignItems: "center" as const,
        },
        emptyText: {
            textAlign: "center" as const,
            fontSize: 14,
            lineHeight: 20,
            fontFamily: theme.fonts.regular,
            color: theme.colors.onSurfaceVariant,
        },
        sectionTitle: {
            ...theme.typescale.titleMedium,
            color: theme.colors.onSurface,
            paddingHorizontal: 20,
            marginTop: 32,
            marginBottom: 10,
        },
        sectionNote: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
            paddingHorizontal: 20,
            marginTop: -6,
            marginBottom: 12,
        },
    });
}
