import { getCurrencySymbol } from "../utils/_helpers";
import {
    Users,
    Wallet,
    LayoutGrid,
    Plus,
    TrendingUp,
    Hash,
    Star,
    Zap,
} from "lucide-react-native";
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
    BackHandler,
    Platform,
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
import AutoLogPromoCard from "../components/dashboard/AutoLogPromoCard";
import TourOverlay from "../components/TourOverlay";
import { EmptyScene } from "../components/illustrations";
import { maybeRequestReview } from "../utils/storeReview";
import ListCard from "../components/ListCard";
import MoneyText from "../components/MoneyText";

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
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
            <TouchableOpacity style={styles.cashbookItem} onPress={onPress} activeOpacity={0.7}>
                <View
                    style={[
                        styles.cashbookIcon,
                        {
                            backgroundColor:
                                balance >= 0
                                    ? theme.colors.incomeContainer
                                    : theme.colors.surfaceContainerHigh,
                        },
                    ]}
                >
                    <Wallet
                        size={17}
                        color={balance >= 0 ? theme.colors.income : theme.colors.onSurfaceVariant}
                        strokeWidth={2}
                    />
                </View>
                <View style={styles.cashbookInfo}>
                    <Text style={[styles.cashbookName, { color: theme.colors.onSurface }]}>
                        {business.name}
                    </Text>
                    <Text
                        style={[
                            styles.cashbookMeta,
                            { color: theme.colors.onSurfaceVariant },
                        ]}
                    >
                        {txCount} txn{txCount !== 1 ? "s" : ""} · {lastActivity}
                    </Text>
                </View>
                <MoneyText
                    amount={balance}
                    symbol={symbol}
                    sign={balance >= 0 ? "+" : "-"}
                    size={14}
                    color={balance >= 0 ? theme.colors.income : theme.colors.onSurface}
                />
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

    const chips: { Icon: typeof Hash; iconBg: string; iconColor: string; label: string; value: string }[] = [
        {
            Icon: Hash,
            iconBg: theme.colors.primaryContainer,
            iconColor: theme.colors.primary,
            label: "This month",
            value: String(stats.monthlyTx),
        },
        {
            Icon: TrendingUp,
            iconBg: theme.colors.incomeContainer,
            iconColor: theme.colors.income,
            label: "All time",
            value: String(stats.totalTx),
        },
        {
            Icon: Star,
            iconBg: theme.colors.goldContainer,
            iconColor: theme.colors.gold,
            label: "Top book",
            value: stats.mostActive.length > 8 ? stats.mostActive.slice(0, 7) + "…" : stats.mostActive,
        },
    ];

    return (
        <View style={statsStyles.container}>
            {chips.map(({ Icon, iconBg, iconColor, label, value }) => (
                <View
                    key={label}
                    style={[
                        statsStyles.card,
                        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                    ]}
                >
                    <View style={[statsStyles.iconWrap, { backgroundColor: iconBg }]}>
                        <Icon size={15} color={iconColor} strokeWidth={2} />
                    </View>
                    <View style={statsStyles.textWrap}>
                        <Text style={[statsStyles.label, { color: theme.colors.onSurfaceVariant }]}>
                            {label}
                        </Text>
                        <Text
                            style={[statsStyles.value, { color: theme.colors.onSurface }]}
                            numberOfLines={1}
                        >
                            {value}
                        </Text>
                    </View>
                </View>
            ))}
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

    const weeklyNet = useMemo(() => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return filteredTransactions
            .filter((t) => new Date(t.date) >= weekAgo)
            .reduce((acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount), 0);
    }, [filteredTransactions]);

    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await onRefresh();
        setRefreshing(false);
    }, [onRefresh]);

    const firstName = (userProfile?.name || "").split(" ")[0] || "there";

    const symbol = getCurrencySymbol(activeCurrency.currency);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
                <View>
                    <Text style={[styles.greeting, { color: theme.colors.onSurfaceVariant }]}>
                        {getGreeting()}, {firstName}
                    </Text>
                    <Text style={[styles.dateLine, { color: theme.colors.placeholder }]}>
                        {new Date().toLocaleDateString(undefined, {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                        })}
                    </Text>
                </View>
                <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
                    <Text style={[styles.avatarText, { color: theme.colors.onSurfaceVariant }]}>
                        {firstName.charAt(0).toUpperCase()}
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

                {filteredTransactions.length > 0 ? (
                    <Text
                        style={[
                            styles.insight,
                            {
                                color:
                                    weeklyNet > 0
                                        ? theme.colors.income
                                        : theme.colors.onSurfaceVariant,
                            },
                        ]}
                    >
                        {weeklyNet > 0
                            ? `Up ${symbol} ${Math.round(weeklyNet).toLocaleString()} this week — steady.`
                            : weeklyNet < 0
                              ? `Down ${symbol} ${Math.abs(Math.round(weeklyNet)).toLocaleString()} this week.`
                              : "No movement this week."}
                    </Text>
                ) : null}

                <AutoLogPromoCard
                    onSetUp={() =>
                        (navigation as any).navigate("Settings", { openAutoLog: Date.now() })
                    }
                />

                <QuickStats
                    businesses={businesses}
                    transactions={transactions}
                    theme={theme}
                    statsStyles={statsStyles}
                />

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
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
                    {sortedBusinesses.length > 0 && (
                        <ListCard>
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
                        </ListCard>
                    )}
                    {businesses.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <EmptyScene variant="cashbooks" size={224} />
                            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
                                Start tracking your finances
                            </Text>
                            <Text
                                style={[
                                    styles.emptyText,
                                    { color: theme.colors.onSurfaceVariant },
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
                                <Plus size={18} color={theme.colors.onPrimary} />
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
                    ...(Platform.OS === "android"
                        ? [
                              {
                                  title: "Automatic Expense Logging",
                                  icon: <Zap size={24} color={theme.colors.primary} />,
                                  description:
                                      "Expense Tracker can read your bank and MoMo SMS on this phone and log expenses for you. Turn it on in Settings → Automatic Logging.",
                              },
                          ]
                        : []),
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
            gap: 10,
            marginTop: 16,
        },
        card: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 11,
            paddingHorizontal: 10,
            borderRadius: 14,
            borderWidth: StyleSheet.hairlineWidth,
        },
        iconWrap: {
            width: 30,
            height: 30,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
        },
        textWrap: {
            flex: 1,
        },
        label: {
            fontSize: 10,
            fontFamily: theme.fonts.regular,
            letterSpacing: 0.2,
        },
        value: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
            fontVariant: ["tabular-nums"],
            marginTop: 1,
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
            fontSize: 14,
            fontFamily: theme.fonts.regular,
        },
        dateLine: {
            fontSize: 11,
            fontFamily: theme.fonts.regular,
            marginTop: 2,
        },
        avatar: {
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
        },
        avatarText: {
            fontSize: 13,
            fontFamily: theme.fonts.semibold,
        },
        insight: {
            fontSize: 13,
            fontFamily: theme.fonts.regular,
            paddingHorizontal: 20,
            marginTop: 12,
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
            fontSize: 15,
            fontFamily: theme.fonts.semibold,
        },
        countBadge: {
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 999,
            minWidth: 28,
            alignItems: "center",
        },
        countBadgeText: {
            fontSize: 12,
            fontFamily: theme.fonts.semibold,
        },
        cashbooksList: {
            paddingHorizontal: 20,
        },
        cashbookItem: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 12,
        },
        cashbookIcon: {
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: "center",
            justifyContent: "center",
        },
        cashbookInfo: {
            flex: 1,
            marginLeft: 12,
        },
        cashbookName: {
            fontSize: 14,
            fontFamily: theme.fonts.semibold,
        },
        cashbookMeta: {
            fontSize: 11,
            fontFamily: theme.fonts.regular,
            marginTop: 2,
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
            fontSize: 18,
            fontFamily: theme.fonts.semibold,
            marginBottom: 8,
        },
        emptyText: {
            textAlign: "center",
            fontSize: 14,
            lineHeight: 21,
            fontFamily: theme.fonts.regular,
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
            fontFamily: theme.fonts.semibold,
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
                businesses={businesses}
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
