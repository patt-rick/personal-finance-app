import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import {
    X,
    Trash2,
    Pencil,
    ExternalLink,
    TrendingUp,
    TrendingDown,
    Hash,
    BarChart3,
} from "lucide-react-native";
import { Business, Transaction } from "../types";
import { useTheme } from "../theme/theme";
import { getCurrencySymbol } from "../utils/_helpers";
import WeeklyBarChart from "./dashboard/WeeklyBarChart";
import { LinearGradient } from "expo-linear-gradient";
import AppModal from "./AppModal";

const CURRENCIES = [
    { label: "US Dollar", value: "USD", symbol: "$" },
    { label: "Ghana Cedi", value: "GHS", symbol: "₵" },
    { label: "Euro", value: "EUR", symbol: "€" },
    { label: "British Pound", value: "GBP", symbol: "£" },
    { label: "Nigerian Naira", value: "NGN", symbol: "₦" },
];

interface CashbookDetailSheetProps {
    business: Business | null;
    transactions: Transaction[];
    onClose: () => void;
    onOpenCashbook: (business: Business) => void;
    onDelete: (businessId: string) => void;
    onRename: (businessId: string, newName: string) => void;
    onUpdateCurrency: (businessId: string, newCurrency: string) => void;
}

export default function CashbookDetailSheet({
    business,
    transactions,
    onClose,
    onOpenCashbook,
    onDelete,
    onRename,
    onUpdateCurrency,
}: CashbookDetailSheetProps) {
    const theme = useTheme();
    const s = useMemo(() => createStyles(theme), [theme]);

    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const [currencyValue, setCurrencyValue] = useState("USD");

    const sheetData = useMemo(() => {
        if (!business) return null;
        const bizTx = transactions.filter((t) => t.businessId === business.id);
        const income = bizTx.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
        const expense = bizTx.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
        const balance = income - expense;
        const count = bizTx.length;
        const avg = count > 0 ? (income + expense) / count : 0;
        const symbol = getCurrencySymbol(business.currency);

        const chartLabels: string[] = [];
        const chartIncome: number[] = [];
        const chartExpense: number[] = [];
        const now = new Date();
        let hasActivity = false;
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const dayIn = bizTx
                .filter((t) => {
                    const d = new Date(t.date);
                    return t.type === "income" && d >= dayStart && d < dayEnd;
                })
                .reduce((a, t) => a + t.amount, 0);
            const dayOut = bizTx
                .filter((t) => {
                    const d = new Date(t.date);
                    return t.type === "expense" && d >= dayStart && d < dayEnd;
                })
                .reduce((a, t) => a + t.amount, 0);

            if (dayIn > 0 || dayOut > 0) hasActivity = true;
            chartLabels.push(date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2));
            chartIncome.push(dayIn);
            chartExpense.push(dayOut);
        }

        const catMap: Record<string, number> = {};
        bizTx
            .filter((t) => t.type === "expense")
            .forEach((t) => {
                const cat = t.category || "Other";
                catMap[cat] = (catMap[cat] || 0) + t.amount;
            });
        const topCategories = Object.entries(catMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        return {
            income,
            expense,
            balance,
            count,
            avg,
            symbol,
            chartLabels,
            chartIncome,
            chartExpense,
            hasActivity,
            topCategories,
        };
    }, [business, transactions, theme]);

    const handleSaveEdits = () => {
        if (!business || !renameValue.trim()) return;
        const trimmedName = renameValue.trim();
        if (trimmedName !== business.name) {
            onRename(business.id, trimmedName);
        }
        if (currencyValue !== (business.currency ?? "USD")) {
            onUpdateCurrency(business.id, currencyValue);
        }
        setIsRenaming(false);
    };

    const handleOpen = () => {
        if (!business) return;
        onClose();
        onOpenCashbook(business);
    };

    React.useEffect(() => {
        if (business) {
            setIsRenaming(false);
            setRenameValue(business.name);
            setCurrencyValue(business.currency ?? "USD");
        }
    }, [business]);

    return (
        <AppModal visible={!!business} onClose={onClose} scrollable showCloseButton={false}>
            {business && sheetData && (
                <>
                    <SheetHeader
                        business={business}
                        sheetData={sheetData}
                        isRenaming={isRenaming}
                        renameValue={renameValue}
                        setRenameValue={setRenameValue}
                        currencyValue={currencyValue}
                        setCurrencyValue={setCurrencyValue}
                        handleSaveEdits={handleSaveEdits}
                        setIsRenaming={setIsRenaming}
                        theme={theme}
                        s={s}
                    />

                    <BalanceCard sheetData={sheetData} theme={theme} s={s} />

                    <StatsGrid sheetData={sheetData} theme={theme} s={s} />

                    {sheetData.topCategories.length > 0 && (
                        <TopCategories
                            categories={sheetData.topCategories}
                            symbol={sheetData.symbol}
                            theme={theme}
                            s={s}
                        />
                    )}

                    <View style={s.actions}>
                        <TouchableOpacity
                            style={[s.actionMain, { backgroundColor: theme.colors.primary }]}
                            onPress={handleOpen}
                        >
                            <ExternalLink size={18} color={theme.colors.onPrimary} />
                            <Text style={s.actionMainText}>Open Cashbook</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.actionIcon, { backgroundColor: theme.colors.secondaryContainer }]}
                            onPress={() => {
                                setRenameValue(business.name);
                                setCurrencyValue(business.currency ?? "USD");
                                setIsRenaming(true);
                            }}
                        >
                            <Pencil size={18} color={theme.colors.onSecondaryContainer} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.actionIcon, { backgroundColor: theme.colors.errorContainer }]}
                            onPress={() => onDelete(business.id)}
                        >
                            <Trash2 size={18} color={theme.colors.onErrorContainer} />
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </AppModal>
    );
}

function SheetHeader({
    business,
    sheetData,
    isRenaming,
    renameValue,
    setRenameValue,
    currencyValue,
    setCurrencyValue,
    handleSaveEdits,
    setIsRenaming,
    theme,
    s,
}: any) {
    if (isRenaming) {
        return (
            <View style={s.editContainer}>
                <View style={s.renameRow}>
                    <TextInput
                        style={[
                            s.renameInput,
                            { color: theme.colors.onSurface, backgroundColor: theme.colors.surfaceContainerHigh },
                        ]}
                        value={renameValue}
                        onChangeText={setRenameValue}
                        autoFocus
                        onSubmitEditing={handleSaveEdits}
                        returnKeyType="done"
                    />
                    <TouchableOpacity
                        onPress={handleSaveEdits}
                        style={[s.renameSave, { backgroundColor: theme.colors.primary }]}
                    >
                        <Text style={{ color: theme.colors.onPrimary, fontFamily: theme.fonts.semibold, fontSize: 13 }}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsRenaming(false)} style={s.renameCancel}>
                        <X size={18} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                </View>

                <Text style={[s.editFieldLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Currency
                </Text>
                <View style={s.currencyGrid}>
                    {CURRENCIES.map((curr) => {
                        const isSelected = currencyValue === curr.value;
                        return (
                            <TouchableOpacity
                                key={curr.value}
                                style={[
                                    s.currencyCard,
                                    { backgroundColor: theme.colors.surfaceContainerHigh },
                                    isSelected && {
                                        backgroundColor: theme.colors.secondaryContainer,
                                        borderColor: theme.colors.secondaryContainer,
                                    },
                                ]}
                                onPress={() => setCurrencyValue(curr.value)}
                            >
                                <Text
                                    style={[
                                        s.currSym,
                                        { color: theme.colors.onSurface },
                                        isSelected && { color: theme.colors.onSecondaryContainer },
                                    ]}
                                >
                                    {curr.symbol}
                                </Text>
                                <Text
                                    style={[
                                        s.currCode,
                                        { color: theme.colors.onSurfaceVariant },
                                        isSelected && { color: theme.colors.onSecondaryContainer },
                                    ]}
                                >
                                    {curr.value}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    }

    return (
        <View style={s.header}>
            <View style={{ flex: 1 }}>
                <Text style={[s.title, { color: theme.colors.onSurface }]}>{business.name}</Text>
                <Text style={[s.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                    Created{" "}
                    {new Date(business.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                    })}
                </Text>
            </View>
            <View style={[s.currencyBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                <Text style={[s.currencyBadgeText, { color: theme.colors.onPrimaryContainer }]}>
                    {sheetData.symbol} {business.currency}
                </Text>
            </View>
        </View>
    );
}

function BalanceCard({ sheetData, theme, s }: any) {
    return (
        <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.balanceCard}
        >
            <Text style={s.balanceLabel}>Balance</Text>
            <Text style={s.balanceValue}>
                {sheetData.balance >= 0 ? "" : "-"}
                {sheetData.symbol}
                {Math.abs(sheetData.balance).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}
            </Text>
            <View style={s.balanceRow}>
                <View style={s.balanceMini}>
                    <TrendingUp size={12} color="rgba(255,255,255,0.85)" />
                    <Text style={s.balanceMiniText}>
                        {sheetData.symbol}
                        {sheetData.income.toLocaleString()}
                    </Text>
                </View>
                <View style={[s.balanceMini, { marginLeft: 16 }]}>
                    <TrendingDown size={12} color="rgba(255,255,255,0.85)" />
                    <Text style={s.balanceMiniText}>
                        {sheetData.symbol}
                        {sheetData.expense.toLocaleString()}
                    </Text>
                </View>
            </View>
        </LinearGradient>
    );
}

function StatsGrid({ sheetData, theme, s }: any) {
    return (
        <View style={s.statsGrid}>
            <View style={[s.statBox, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
                <Hash size={16} color={theme.colors.primary} />
                <Text style={[s.statNum, { color: theme.colors.onSurface }]}>{sheetData.count}</Text>
                <Text style={[s.statLbl, { color: theme.colors.onSurfaceVariant }]}>Transactions</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
                <BarChart3 size={16} color={theme.colors.primary} />
                <Text style={[s.statNum, { color: theme.colors.onSurface }]}>
                    {sheetData.symbol}
                    {sheetData.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
                <Text style={[s.statLbl, { color: theme.colors.onSurfaceVariant }]}>Avg / txn</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
                <TrendingUp size={16} color={theme.colors.income} />
                <Text style={[s.statNum, { color: theme.colors.onSurface }]}>
                    {sheetData.count > 0
                        ? sheetData.income > sheetData.expense
                            ? "Profit"
                            : "Loss"
                        : "---"}
                </Text>
                <Text style={[s.statLbl, { color: theme.colors.onSurfaceVariant }]}>Status</Text>
            </View>
        </View>
    );
}

function ActivityChart({ labels, incomeData, expenseData, symbol, theme, s }: any) {
    return (
        <View style={s.chartSection}>
            <View style={s.chartHeaderRow}>
                <Text style={[s.chartSectionTitle, { color: theme.colors.onSurface }]}>
                    7-Day Activity
                </Text>
                <View style={s.chartLegend}>
                    <View style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: theme.colors.income }]} />
                        <Text style={[s.legendLbl, { color: theme.colors.onSurfaceVariant }]}>In</Text>
                    </View>
                    <View style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: theme.colors.chart[3] }]} />
                        <Text style={[s.legendLbl, { color: theme.colors.onSurfaceVariant }]}>
                            Out
                        </Text>
                    </View>
                </View>
            </View>
            <View style={[s.chartBox, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
                <WeeklyBarChart
                    labels={labels}
                    incomeData={incomeData}
                    expenseData={expenseData}
                    currencySymbol={symbol}
                    incomeColor={theme.colors.income}
                    expenseColor={theme.colors.chart[3]}
                />
            </View>
        </View>
    );
}

function TopCategories({ categories, symbol, theme, s }: any) {
    return (
        <View style={s.topCatSection}>
            <Text style={[s.chartSectionTitle, { color: theme.colors.onSurface }]}>Top Expenses</Text>
            <View style={s.topCatRow}>
                {categories.map(([name, amount]: [string, number], i: number) => (
                    <View key={i} style={[s.topCatChip, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
                        <Text style={[s.topCatName, { color: theme.colors.onSurface }]}>{name}</Text>
                        <Text style={[s.topCatAmt, { color: theme.colors.onSurfaceVariant }]}>
                            {symbol}
                            {amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
        },
        title: { fontSize: 20, fontFamily: theme.fonts.semibold, letterSpacing: -0.3 },
        subtitle: { fontSize: 12, marginTop: 2, fontFamily: theme.fonts.regular },
        currencyBadge: {
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: theme.shape.small,
        },
        currencyBadgeText: { fontSize: 12, fontFamily: theme.fonts.semibold },

        editContainer: { marginBottom: 16 },
        renameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
        renameInput: {
            flex: 1,
            height: 48,
            borderRadius: theme.shape.medium,
            paddingHorizontal: 12,
            fontSize: 15,
            fontFamily: theme.fonts.regular,
        },
        renameSave: {
            height: 48,
            paddingHorizontal: 16,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
        },
        renameCancel: { padding: 8 },
        editFieldLabel: {
            fontSize: 11,
            fontFamily: theme.fonts.semibold,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginTop: 14,
            marginBottom: 8,
        },
        currencyGrid: { flexDirection: "row", gap: 8 },
        currencyCard: {
            flex: 1,
            height: 56,
            borderRadius: theme.shape.medium,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "transparent",
        },
        currSym: { fontSize: 18, fontFamily: theme.fonts.semibold },
        currCode: { fontSize: 10, fontFamily: theme.fonts.semibold, marginTop: 2 },

        balanceCard: {
            borderRadius: theme.shape.large,
            padding: 18,
            marginBottom: 14,
            overflow: "hidden",
        },
        balanceLabel: {
            fontSize: 11,
            color: "rgba(255,255,255,0.85)",
            fontFamily: theme.fonts.semibold,
            letterSpacing: 0.5,
        },
        balanceValue: {
            fontSize: 28,
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
            color: "#FFFFFF",
            letterSpacing: -0.5,
            marginTop: 2,
        },
        balanceRow: { flexDirection: "row", marginTop: 10 },
        balanceMini: { flexDirection: "row", alignItems: "center", gap: 4 },
        balanceMiniText: {
            fontSize: 12,
            color: "rgba(255,255,255,0.7)",
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
        },

        statsGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
        statBox: {
            flex: 1,
            borderRadius: theme.shape.medium,
            padding: 12,
            alignItems: "center",
            gap: 4,
        },
        statNum: {
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
        },
        statLbl: { fontSize: 10, fontFamily: theme.fonts.regular },

        chartSection: { marginBottom: 14 },
        chartHeaderRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
        },
        chartSectionTitle: { fontSize: 14, fontFamily: theme.fonts.semibold },
        chartLegend: { flexDirection: "row", gap: 10 },
        legendItem: { flexDirection: "row", alignItems: "center", gap: 3 },
        legendDot: { width: 6, height: 6, borderRadius: 3 },
        legendLbl: { fontSize: 9, fontFamily: theme.fonts.regular },
        chartBox: {
            borderRadius: theme.shape.medium,
            padding: 12,
            paddingRight: 4,
        },

        topCatSection: { marginBottom: 16 },
        topCatRow: { flexDirection: "row", gap: 8, marginTop: 8 },
        topCatChip: {
            flex: 1,
            borderRadius: theme.shape.medium,
            padding: 10,
            alignItems: "center",
        },
        topCatName: { fontSize: 12, fontFamily: theme.fonts.semibold },
        topCatAmt: {
            fontSize: 10,
            marginTop: 2,
            fontFamily: theme.fonts.regular,
            fontVariant: ["tabular-nums"],
        },

        actions: { flexDirection: "row", gap: 10, marginTop: 4 },
        actionMain: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            height: 52,
            borderRadius: theme.shape.full,
        },
        actionMainText: { color: theme.colors.onPrimary, fontSize: 14, fontFamily: theme.fonts.semibold },
        actionIcon: {
            width: 52,
            height: 52,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
        },
    });
