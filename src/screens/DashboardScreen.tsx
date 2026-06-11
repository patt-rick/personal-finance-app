import { getCurrencySymbol } from "../utils/_helpers";
import {
    Users,
    Wallet,
    LayoutGrid,
    Plus,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    Hash,
    Star,
} from "lucide-react-native";
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
    BackHandler,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    StyleSheet,
    Animated,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme";
import { Business, Transaction, UserProfile } from "../types";
import BusinessDetailView from "./BusinessDetailView";
import PaymentCard, { CurrencyBalance } from "../components/dashboard/PaymentCard";
import TourOverlay from "../components/TourOverlay";
import { EmptyScene, HeaderBackdrop } from "../components/illustrations";
import { maybeRequestReview } from "../utils/storeReview";

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

function getGreetingEmoji(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "sunrise";
    if (hour < 17) return "sun";
    return "moon";
}

function AnimatedCashbookItem({
    business,
    transactions,
    theme,
    onPress,
    index,
    styles,
}: {
    business: Business;
    transactions: Transaction[];
    theme: any;
    onPress: () => void;
    index: number;
    styles: ReturnType<typeof createStyles>;
}) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                delay: index * 60,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                delay: index * 60,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const bizTx = transactions.filter((t) => t.businessId === business.id);
    const income = bizTx
        .filter((t) => t.type === "income")
        .reduce((acc, t) => acc + t.amount, 0);
    const expense = bizTx
        .filter((t) => t.type === "expense")
        .reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expense;
    const symbol = getCurrencySymbol(business.currency);
    const txCount = bizTx.length;

    const recentTx = bizTx.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];
    const lastActivity = recentTx
        ? formatRelativeDate(recentTx.date)
        : "No activity";

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            }}
        >
            <TouchableOpacity
                style={[styles.cashbookItem, { backgroundColor: theme.colors.card }]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View
                    style={[
                        styles.cashbookIcon,
                        {
                            backgroundColor:
                                balance >= 0
                                    ? theme.colors.incomeBg
                                    : theme.colors.expenseBg,
                        },
                    ]}
                >
                    <Wallet
                        size={18}
                        color={
                            balance >= 0
                                ? theme.colors.income
                                : theme.colors.expense
                        }
                    />
                </View>
                <View style={styles.cashbookInfo}>
                    <Text style={[styles.cashbookName, { color: theme.colors.text }]}>
                        {business.name}
                    </Text>
                    <Text
                        style={[
                            styles.cashbookMeta,
                            { color: theme.colors.textSecondary },
                        ]}
                    >
                        {txCount} txn{txCount !== 1 ? "s" : ""} · {lastActivity}
                    </Text>
                </View>
                <View style={styles.cashbookRight}>
                    <Text
                        style={[
                            styles.cashbookBalance,
                            {
                                color:
                                    balance >= 0
                                        ? theme.colors.success
                                        : theme.colors.error,
                            },
                        ]}
                    >
                        {balance >= 0 ? "+" : "-"}
                        {symbol}
                        {Math.abs(balance).toLocaleString()}
                    </Text>
                    <View style={styles.cashbookArrow}>
                        {balance >= 0 ? (
                            <ArrowUpRight size={12} color={theme.colors.success} />
                        ) : (
                            <ArrowDownRight size={12} color={theme.colors.error} />
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function QuickStats({
    businesses,
    transactions,
    theme,
    statsStyles,
}: {
    businesses: Business[];
    transactions: Transaction[];
    theme: any;
    statsStyles: ReturnType<typeof createStatsStyles>;
}) {
    const stats = useMemo(() => {
        const totalTx = transactions.length;

        const now = new Date();
        const thisMonthTx = transactions.filter((t) => {
            const d = new Date(t.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const mostActiveBiz = businesses.reduce(
            (best, biz) => {
                const count = transactions.filter((t) => t.businessId === biz.id).length;
                return count > best.count ? { name: biz.name, count } : best;
            },
            { name: "—", count: 0 },
        );

        return {
            totalTx,
            monthlyTx: thisMonthTx.length,
            mostActive: mostActiveBiz.name,
            bookCount: businesses.length,
        };
    }, [businesses, transactions]);

    if (businesses.length === 0) return null;

    return (
        <View style={[statsStyles.container]}>
            <View style={[statsStyles.card, { backgroundColor: theme.colors.surfaceContainerLow }]}>
                <View style={[statsStyles.iconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Hash size={18} color={theme.colors.onPrimaryContainer} />
                </View>
                <Text style={[statsStyles.value, { color: theme.colors.text }]}>
                    {stats.monthlyTx}
                </Text>
                <Text style={[statsStyles.label, { color: theme.colors.textSecondary }]}>
                    This month
                </Text>
            </View>

            <View style={[statsStyles.card, { backgroundColor: theme.colors.surfaceContainerLow }]}>
                <View style={[statsStyles.iconWrap, { backgroundColor: theme.colors.secondaryContainer }]}>
                    <TrendingUp size={18} color={theme.colors.onSecondaryContainer} />
                </View>
                <Text style={[statsStyles.value, { color: theme.colors.text }]}>
                    {stats.totalTx}
                </Text>
                <Text style={[statsStyles.label, { color: theme.colors.textSecondary }]}>
                    All time
                </Text>
            </View>

            <View style={[statsStyles.card, { backgroundColor: theme.colors.surfaceContainerLow }]}>
                <View style={[statsStyles.iconWrap, { backgroundColor: theme.colors.goldContainer }]}>
                    <Star size={18} color={theme.colors.goldDark} />
                </View>
                <Text
                    style={[statsStyles.value, { color: theme.colors.text }]}
                    numberOfLines={1}
                >
                    {stats.mostActive.length > 8
                        ? stats.mostActive.slice(0, 7) + "..."
                        : stats.mostActive}
                </Text>
                <Text style={[statsStyles.label, { color: theme.colors.textSecondary }]}>
                    Top book
                </Text>
            </View>
        </View>
    );
}

function DashboardHome({
    businesses,
    transactions,
    setCurrentBusiness,
    userProfile,
    onRefresh,
}: {
    businesses: Business[];
    transactions: Transaction[];
    setCurrentBusiness: (b: Business) => void;
    userProfile: UserProfile | null;
    onRefresh: () => Promise<void>;
}) {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const navigation = useNavigation();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const statsStyles = useMemo(() => createStatsStyles(theme), [theme]);

    const currencyBalances = useMemo<CurrencyBalance[]>(() => {
        const map: Record<string, { income: number; expense: number }> = {};
        const bizCurrencyMap: Record<string, string> = {};
        for (const biz of businesses) {
            bizCurrencyMap[biz.id] = biz.currency || "USD";
        }
        for (const t of transactions) {
            const c = bizCurrencyMap[t.businessId] || "USD";
            if (!map[c]) map[c] = { income: 0, expense: 0 };
            if (t.type === "income") map[c].income += t.amount;
            else map[c].expense += t.amount;
        }
        const keys = Object.keys(map);
        if (keys.length === 0) return [{ currency: "USD", income: 0, expense: 0, balance: 0 }];
        return keys.map((c) => ({
            currency: c,
            income: map[c].income,
            expense: map[c].expense,
            balance: map[c].income - map[c].expense,
        }));
    }, [businesses, transactions]);

    const sortedBusinesses = useMemo(() => {
        const latestTxByBiz: Record<string, number> = {};
        for (const t of transactions) {
            const ts = new Date(t.date).getTime();
            if (!Number.isFinite(ts)) continue;
            const prev = latestTxByBiz[t.businessId];
            if (prev === undefined || ts > prev) latestTxByBiz[t.businessId] = ts;
        }
        const effectiveTime = (b: Business) => {
            const txTime = latestTxByBiz[b.id];
            if (txTime !== undefined) return txTime;
            const created = new Date(b.createdAt).getTime();
            return Number.isFinite(created) ? created : 0;
        };
        return [...businesses].sort((a, b) => {
            const diff = effectiveTime(b) - effectiveTime(a);
            if (diff !== 0) return diff;
            return (a.name || "").localeCompare(b.name || "");
        });
    }, [businesses, transactions]);

    const [activeCurrencyIndex, setActiveCurrencyIndex] = useState(0);
    const activeCurrency = currencyBalances[activeCurrencyIndex] ?? currencyBalances[0];

    const activeBizIds = useMemo(() => {
        const currency = activeCurrency.currency;
        return new Set(
            businesses.filter((b) => (b.currency || "USD") === currency).map((b) => b.id),
        );
    }, [businesses, activeCurrency.currency]);

    const filteredTransactions = useMemo(
        () => transactions.filter((t) => activeBizIds.has(t.businessId)),
        [transactions, activeBizIds],
    );

    const weeklyGrowth = useMemo(() => {
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const twoWeeksAgo = new Date(now);
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const thisWeekNet = filteredTransactions
            .filter((t) => new Date(t.date) >= weekAgo)
            .reduce((acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount), 0);
        const lastWeekNet = filteredTransactions
            .filter((t) => {
                const d = new Date(t.date);
                return d >= twoWeeksAgo && d < weekAgo;
            })
            .reduce((acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount), 0);

        if (lastWeekNet === 0) return 0;
        return ((thisWeekNet - lastWeekNet) / Math.abs(lastWeekNet)) * 100;
    }, [filteredTransactions]);

    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await onRefresh();
        setRefreshing(false);
    }, [onRefresh]);

    const firstName = (userProfile?.name || "").split(" ")[0] || "there";

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <HeaderBackdrop height={Math.max(insets.top, 40) + 220} />
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <View>
                    <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
                        {getGreeting()},
                    </Text>
                    <Text style={[styles.userName, { color: theme.colors.text }]}>
                        {firstName}
                    </Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.colors.primary}
                        colors={[theme.colors.primary]}
                    />
                }
            >
                <PaymentCard
                    currencies={currencyBalances}
                    onPageChange={setActiveCurrencyIndex}
                />

                <QuickStats
                    businesses={businesses}
                    transactions={transactions}
                    theme={theme}
                    statsStyles={statsStyles}
                />

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Your Cashbooks
                    </Text>
                    <View
                        style={[
                            styles.countBadge,
                            { backgroundColor: theme.colors.secondaryContainer },
                        ]}
                    >
                        <Text
                            style={[
                                styles.countBadgeText,
                                { color: theme.colors.onSecondaryContainer },
                            ]}
                        >
                            {businesses.length}
                        </Text>
                    </View>
                </View>

                <View style={styles.cashbooksList}>
                    {sortedBusinesses.map((business, index) => (
                        <AnimatedCashbookItem
                            key={business.id}
                            business={business}
                            transactions={transactions}
                            theme={theme}
                            onPress={() => setCurrentBusiness(business)}
                            index={index}
                            styles={styles}
                        />
                    ))}
                    {businesses.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <EmptyScene variant="cashbooks" size={224} />
                            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                                Start tracking your finances
                            </Text>
                            <Text
                                style={[
                                    styles.emptyText,
                                    { color: theme.colors.textSecondary },
                                ]}
                            >
                                Create a cashbook to begin logging income and expenses across your
                                businesses
                            </Text>
                            <TouchableOpacity
                                style={[
                                    styles.createBtn,
                                    { backgroundColor: theme.colors.primary },
                                ]}
                                onPress={() => navigation.navigate("Cashbooks" as never)}
                                activeOpacity={0.8}
                            >
                                <Plus size={18} color={theme.colors.textInverse} />
                                <Text style={styles.createBtnText}>Create Cashbook</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            <TourOverlay
                page="dashboard"
                steps={[
                    {
                        title: "Your Financial Overview",
                        icon: <LayoutGrid size={24} color={theme.colors.primary} />,
                        illustration: "reports",
                        description:
                            "This is your dashboard — a snapshot of all your finances across every cashbook, grouped by currency.",
                    },
                    {
                        title: "Balance & Growth",
                        icon: <Wallet size={24} color={theme.colors.primary} />,
                        illustration: "cashbooks",
                        description:
                            "The balance card shows your total income, expenses, and net balance. Swipe to see balances in different currencies.",
                    },
                    {
                        title: "Your Cashbooks",
                        icon: <Users size={24} color={theme.colors.primary} />,
                        illustration: "transactions",
                        description:
                            "All your cashbooks are listed here with their balances. Tap any cashbook to view its transactions in detail.",
                    },
                ]}
                onComplete={() => {
                    setTimeout(() => {
                        maybeRequestReview({ kind: "tour_completed" });
                    }, 600);
                }}
            />
        </View>
    );
}

const createStatsStyles = (theme: any) =>
    StyleSheet.create({
        container: {
            flexDirection: "row",
            paddingHorizontal: 20,
            gap: 12,
            marginTop: 20,
        },
        card: {
            flex: 1,
            paddingVertical: 16,
            paddingHorizontal: 12,
            borderRadius: 24,
            alignItems: "flex-start",
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        iconWrap: {
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
        },
        value: {
            fontSize: 20,
            fontWeight: "700",
            letterSpacing: -0.4,
            marginBottom: 2,
        },
        label: {
            fontSize: 11,
            fontWeight: "500",
            letterSpacing: 0.4,
        },
    });

const createStyles = (theme: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingBottom: 16,
        },
        greeting: {
            fontSize: 12,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.8,
        },
        userName: {
            fontSize: 26,
            fontWeight: "800",
            marginTop: 2,
            letterSpacing: -0.3,
        },
        sectionHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            marginTop: 24,
            marginBottom: 12,
        },
        sectionTitle: {
            fontSize: 17,
            fontWeight: "700",
            letterSpacing: -0.2,
        },
        countBadge: {
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 999,
            minWidth: 28,
            alignItems: "center",
        },
        countBadgeText: {
            fontSize: 13,
            fontWeight: "700",
        },
        cashbooksList: {
            paddingHorizontal: 20,
        },
        cashbookItem: {
            flexDirection: "row",
            alignItems: "center",
            padding: 14,
            borderRadius: 24,
            marginBottom: 12,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        cashbookIcon: {
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: "center",
            justifyContent: "center",
        },
        cashbookInfo: {
            flex: 1,
            marginLeft: 14,
        },
        cashbookName: {
            fontSize: 15,
            fontWeight: "600",
            letterSpacing: -0.1,
        },
        cashbookMeta: {
            fontSize: 11,
            marginTop: 3,
            letterSpacing: 0.1,
        },
        cashbookRight: {
            alignItems: "flex-end",
            gap: 2,
        },
        cashbookBalance: {
            fontSize: 15,
            fontWeight: "700",
            letterSpacing: -0.2,
        },
        cashbookArrow: {
            opacity: 0.6,
        },
        emptyContainer: {
            padding: 40,
            alignItems: "center",
        },
        emptyIconOuter: {
            width: 96,
            height: 96,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
        },
        emptyIconInner: {
            width: 64,
            height: 64,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
        },
        emptyTitle: {
            fontSize: 19,
            fontWeight: "700",
            marginBottom: 8,
            letterSpacing: -0.2,
        },
        emptyText: {
            textAlign: "center",
            fontSize: 14,
            lineHeight: 21,
            marginBottom: 24,
            paddingHorizontal: 12,
        },
        createBtn: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 16,
            paddingHorizontal: 28,
            borderRadius: 999,
            gap: 8,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        createBtnText: {
            color: theme.colors.onPrimary,
            fontSize: 15,
            fontWeight: "700",
            letterSpacing: 0.1,
        },
    });

interface DashboardScreenProps {
    businesses: Business[];
    transactions: Transaction[];
    currentBusiness: Business | null;
    setCurrentBusiness: (business: Business | null) => void;
    saveTransactions: (transactions: Transaction[]) => void;
    userProfile: UserProfile | null;
    onRefresh: () => Promise<void>;
}

export default function DashboardScreen({
    businesses,
    transactions,
    currentBusiness,
    setCurrentBusiness,
    saveTransactions,
    userProfile,
    onRefresh,
}: DashboardScreenProps) {
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (currentBusiness) {
                    setCurrentBusiness(null);
                    return true;
                }
                return false;
            };
            const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
            return () => subscription.remove();
        }, [currentBusiness, setCurrentBusiness]),
    );

    if (currentBusiness) {
        return (
            <BusinessDetailView
                business={currentBusiness}
                transactions={transactions.filter((t) => t.businessId === currentBusiness.id)}
                allTransactions={transactions}
                onBack={() => setCurrentBusiness(null)}
                saveTransactions={saveTransactions}
            />
        );
    }

    return (
        <DashboardHome
            businesses={businesses}
            transactions={transactions}
            setCurrentBusiness={setCurrentBusiness}
            userProfile={userProfile}
            onRefresh={onRefresh}
        />
    );
}
