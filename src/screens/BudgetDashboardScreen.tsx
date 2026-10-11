import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, BackHandler, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gauge, Globe, History, Plus } from "lucide-react-native";
import { AppTheme, useTheme } from "../theme/theme";
import { Budget, BudgetScope, Business, Transaction } from "../types";
import { exactMoney } from "../utils/chartScale";
import TourOverlay from "../components/TourOverlay";
import { EmptyScene } from "../components/illustrations";
import { useReducedMotion } from "../components/reports/motion";
import BudgetSetupScreen from "./BudgetSetupScreen";
import { useBudgetDashboard } from "../features/budget/hooks/useBudgetDashboard";
import { useSweep } from "../features/budget/components/useSweep";
import BudgetGauge from "../features/budget/components/BudgetGauge";
import BudgetSummary from "../features/budget/components/BudgetSummary";
import CategoryLimitsCard from "../features/budget/components/CategoryLimitsCard";
import BudgetHistoryChart from "../features/budget/components/BudgetHistoryChart";
import PeriodSwitcher from "../features/budget/components/PeriodSwitcher";
import ScopeChips from "../features/budget/components/ScopeChips";
import NewBudgetSheet from "../features/budget/components/NewBudgetSheet";
import { budgetColour } from "../features/budget/colour";
import { limitsForPeriod } from "../features/budget/limits";
import { BudgetRow, paceChip, summaryLines } from "../features/budget/dashboardModel";
import { businessIdsForScope, scopeKey, scopeName, scopeSymbol } from "../features/budget/scope";
import { formatPeriodLabel, monthName, periodAdjective, periodName } from "../features/budget/periods";

interface BudgetDashboardScreenProps {
    businesses: Business[];
    transactions: Transaction[];
    currentBusiness: Business | null;
}

export default function BudgetDashboardScreen({ businesses, transactions, currentBusiness }: BudgetDashboardScreenProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const insets = useSafeAreaInsets();
    const reduced = useReducedMotion();
    const d = useBudgetDashboard(businesses, transactions, currentBusiness);
    const [editing, setEditing] = useState<{ scope: BudgetScope; budget: Budget | null } | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const animKey = `${d.selected ? scopeKey(d.selected) : ""}|${d.view?.range.key ?? ""}|${d.budget?.updatedAt ?? ""}`;
    const progress = useSweep(animKey, reduced, 1400);

    useFocusEffect(
        useCallback(() => {
            const sub = BackHandler.addEventListener("hardwareBackPress", () => {
                if (!editing) return false;
                setEditing(null);
                return true;
            });
            return () => sub.remove();
        }, [editing]),
    );

    const { reload } = d;
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await reload();
        setRefreshing(false);
    }, [reload]);

    const colorFor = useMemo(() => {
        const limits = d.budget && d.view ? limitsForPeriod(d.budget, d.view.range.key) : null;
        const limitKeys = Object.keys(limits?.categoryLimits ?? {});
        return (row: BudgetRow) => {
            if (row.kind === "other") return theme.colors.outline;
            if (row.kind === "fees") return theme.colors.chartExpense;
            return theme.colors.chart[limitKeys.indexOf(row.key) % theme.colors.chart.length];
        };
    }, [d.budget, d.view, theme]);

    if (editing) {
        return (
            <BudgetSetupScreen
                scope={editing.scope}
                budget={editing.budget}
                businesses={businesses}
                onBack={() => setEditing(null)}
                onSaved={async () => {
                    setEditing(null);
                    await d.reload();
                }}
            />
        );
    }

    const header = (
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
            <Text style={styles.headerTitle}>Budget</Text>
            {businesses.length > 0 && (
                <Pressable
                    onPress={() => setSheetOpen(true)}
                    style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}
                    accessibilityRole="button"
                >
                    <Plus size={16} color={theme.colors.onSecondaryContainer} />
                    <Text style={styles.newButtonText}>New budget</Text>
                </Pressable>
            )}
        </View>
    );

    if (businesses.length === 0) {
        return (
            <View style={styles.container}>
                {header}
                <View style={styles.empty}>
                    <EmptyScene variant="budget" size={224} />
                    <Text style={styles.emptyTitle}>No cashbooks yet</Text>
                    <Text style={styles.emptyText}>Create a cashbook first, then set a budget for it.</Text>
                </View>
            </View>
        );
    }

    const { budget, view, selected } = d;
    const symbol = selected ? scopeSymbol(selected, businesses) : "";
    const money = (v: number) => exactMoney(v, symbol);

    const renderBudget = () => {
        if (!budget || !view || !selected) return null;
        const share = view.limit ? (view.spent / view.limit) * 100 : 0;
        const warnAt = budget.alerts.warnAt;
        const name = periodName(budget.period, view.range);
        const title =
            budget.period === "monthly"
                ? `${monthName(view.range.start)} budget`
                : budget.period === "weekly" && view.current
                  ? "This week's budget"
                  : `${formatPeriodLabel(budget.period, view.range)} budget`;
        const books = businessIdsForScope(selected, businesses).size;
        const subtitle =
            selected.kind === "currency"
                ? `${scopeName(selected, businesses)}, ${books} book${books === 1 ? "" : "s"}`
                : `${periodAdjective(budget.period)} limit`;
        const lines = summaryLines(view, symbol, name);
        const amountColor =
            view.limit === null
                ? theme.colors.onSurface
                : view.current
                  ? budgetColour(share, warnAt, theme.colors)
                  : view.spent > view.limit
                    ? theme.colors.expense
                    : theme.colors.income;
        const pacePct = view.pace ? view.pace.elapsedPct : null;

        return (
            <>
                <PeriodSwitcher
                    label={formatPeriodLabel(budget.period, view.range)}
                    onBack={d.goBack}
                    onForward={d.goForward}
                    canGoForward={d.canGoForward}
                />
                {view.limit !== null ? (
                    <BudgetGauge
                        share={share}
                        pacePct={pacePct}
                        warnAt={warnAt}
                        title={title}
                        subtitle={subtitle}
                        spentText={money(view.spent)}
                        limitText={money(view.limit)}
                        caption={view.pace ? `${view.pace.daysLeft} day${view.pace.daysLeft === 1 ? "" : "s"} left` : "Final"}
                        chip={paceChip(view, symbol)}
                        onEdit={() => setEditing({ scope: selected, budget })}
                        animKey={animKey}
                        reduced={reduced}
                    />
                ) : (
                    <Text style={styles.noLimit}>{title}</Text>
                )}
                <View style={styles.divider} />
                <BudgetSummary
                    lines={lines}
                    amountColor={amountColor}
                    rows={view.rows}
                    limit={view.limit}
                    colorFor={colorFor}
                    progress={progress}
                />
                {view.rows.length > 0 && (
                    <View style={styles.section}>
                        <CategoryLimitsCard
                            rows={view.rows}
                            symbol={symbol}
                            warnAt={warnAt}
                            pacePct={pacePct}
                            colorFor={colorFor}
                            progress={progress}
                        />
                    </View>
                )}
                <View style={styles.section}>
                    <BudgetHistoryChart
                        points={d.history}
                        period={budget.period}
                        symbol={symbol}
                        warnAt={warnAt}
                        selectedKey={view.range.key}
                        onSelect={d.selectPeriod}
                        progress={progress}
                    />
                </View>
            </>
        );
    };

    return (
        <View style={styles.container}>
            {header}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            >
                <ScopeChips scopes={d.scopes} selected={selected} businesses={businesses} onSelect={d.select} />
                <View style={styles.body}>
                    {d.loading ? (
                        <ActivityIndicator style={styles.loading} size="large" color={theme.colors.primary} />
                    ) : budget ? (
                        renderBudget()
                    ) : (
                        selected && (
                            <View style={styles.empty}>
                                <EmptyScene variant="budget" size={200} />
                                <Text style={styles.emptyTitle}>No budget for {scopeName(selected, businesses)}</Text>
                                <Text style={styles.emptyText}>
                                    Set a limit and see how fast it goes, with a heads-up before you run out.
                                </Text>
                                <Pressable
                                    onPress={() => setEditing({ scope: selected, budget: null })}
                                    style={({ pressed }) => [styles.setButton, pressed && styles.pressed]}
                                    accessibilityRole="button"
                                >
                                    <Plus size={18} color={theme.colors.inverseOnSurface} />
                                    <Text style={styles.setButtonText}>Set a budget</Text>
                                </Pressable>
                            </View>
                        )
                    )}
                </View>
            </ScrollView>

            <NewBudgetSheet
                visible={sheetOpen}
                onClose={() => setSheetOpen(false)}
                businesses={businesses}
                transactions={transactions}
                budgets={d.budgets}
                onPick={(scope, existing) => {
                    setSheetOpen(false);
                    d.select(scope);
                    setEditing({ scope, budget: existing });
                }}
            />

            <TourOverlay
                page="budget-v2"
                steps={[
                    {
                        title: "Your budget at a glance",
                        icon: <Gauge size={24} color={theme.colors.primary} />,
                        description:
                            "The speedometer shows how much of your limit is gone. The small tick marks where even spending would put you today.",
                    },
                    {
                        title: "One cashbook or all of them",
                        icon: <Globe size={24} color={theme.colors.primary} />,
                        description:
                            "Budget a single cashbook, or every cashbook in a currency. Switch between them with the chips at the top.",
                    },
                    {
                        title: "Look back",
                        icon: <History size={24} color={theme.colors.primary} />,
                        description: "Use the arrows, or tap a bar in the history chart, to see how earlier periods went.",
                    },
                ]}
            />
        </View>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingBottom: 14,
        },
        headerTitle: {
            fontSize: 22,
            fontFamily: theme.fonts.semibold,
            color: theme.colors.onSurface,
        },
        newButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.secondaryContainer,
        },
        newButtonText: {
            ...theme.typescale.labelLarge,
            color: theme.colors.onSecondaryContainer,
        },
        pressed: {
            opacity: 0.75,
        },
        scroll: {
            paddingBottom: 120,
        },
        body: {
            paddingHorizontal: 20,
        },
        loading: {
            marginTop: 80,
        },
        noLimit: {
            ...theme.typescale.titleMedium,
            color: theme.colors.onSurface,
            marginTop: 8,
        },
        divider: {
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.colors.outlineVariant,
            marginTop: 20,
            marginBottom: 18,
        },
        section: {
            marginTop: 24,
        },
        empty: {
            alignItems: "center",
            paddingTop: 32,
            paddingHorizontal: 12,
        },
        emptyTitle: {
            ...theme.typescale.titleMedium,
            color: theme.colors.onSurface,
            marginTop: 12,
            textAlign: "center",
        },
        emptyText: {
            ...theme.typescale.bodyMedium,
            color: theme.colors.onSurfaceVariant,
            textAlign: "center",
            marginTop: 6,
            maxWidth: 300,
        },
        setButton: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 20,
            paddingVertical: 13,
            paddingHorizontal: 22,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.inverseSurface,
        },
        setButtonText: {
            ...theme.typescale.labelLarge,
            color: theme.colors.inverseOnSurface,
        },
    });
