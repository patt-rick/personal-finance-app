import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import * as Notifications from "expo-notifications";
import { appAlert } from "../components/dialog";
import { AppTheme, useTheme } from "../theme/theme";
import { Budget, BudgetPeriod, BudgetScope, BudgetWarnAt, Business, Category } from "../types";
import { loadCategories } from "../utils/storage";
import { exactMoney } from "../utils/chartScale";
import { hapticError, hapticSuccess } from "../utils/haptics";
import { refreshCashbookWidgets } from "../features/widgets/services/widgetSync";
import { deleteBudget, upsertBudget } from "../features/budget/storage/budgetStore";
import { applyDraft, DraftError, MONEY_INPUT, parseMoney, validateDraft } from "../features/budget/setupModel";
import { limitsForPeriod } from "../features/budget/limits";
import { periodNoun, periodRange } from "../features/budget/periods";
import { currencyLabel, scopeName, scopeSymbol } from "../features/budget/scope";
import CategoryLimitsEditor, { LimitRow } from "../features/budget/components/setup/CategoryLimitsEditor";
import AlertSettingsCard from "../features/budget/components/setup/AlertSettingsCard";

interface BudgetSetupScreenProps {
    scope: BudgetScope;
    budget: Budget | null;
    businesses: Business[];
    onBack: () => void;
    onSaved: () => void;
}

const PERIODS: BudgetPeriod[] = ["weekly", "monthly", "yearly"];
const PERIOD_LABEL: Record<BudgetPeriod, string> = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

const asInput = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

function initialLimits(budget: Budget | null) {
    if (!budget) return null;
    return limitsForPeriod(budget, periodRange(budget.period, new Date()).key) ?? budget.limits[budget.limits.length - 1];
}

export default function BudgetSetupScreen({ scope, budget, businesses, onBack, onSaved }: BudgetSetupScreenProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const start = useMemo(() => initialLimits(budget), [budget]);
    const [categories, setCategories] = useState<Category[] | null>(null);
    const [period, setPeriod] = useState<BudgetPeriod>(budget?.period ?? "monthly");
    const [totalText, setTotalText] = useState(start ? asInput(start.totalLimit) : "");
    const [rows, setRows] = useState<LimitRow[]>(
        start ? Object.entries(start.categoryLimits).map(([id, v]) => ({ id, text: asInput(v) })) : [],
    );
    const [alerts, setAlerts] = useState(budget?.alerts ?? { enabled: true, warnAt: 80 as BudgetWarnAt });
    const [permission, setPermission] = useState<string>("undetermined");
    const [error, setError] = useState<DraftError | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadCategories().then((all) => setCategories(all.filter((c) => c.type === "expense")));
        Notifications.getPermissionsAsync()
            .then(({ status }) => setPermission(status))
            .catch(() => {});
    }, []);

    const symbol = scopeSymbol(scope, businesses);
    const name = scopeName(scope, businesses);
    const title = scope.kind === "currency" ? `Global ${currencyLabel(scope.currency)} budget` : `${name} budget`;
    const known = new Set((categories ?? []).map((c) => c.id));
    const liveRows = rows.filter((r) => known.has(r.id));
    const total = parseMoney(totalText);
    const allocated = liveRows.reduce((sum, r) => sum + Math.round((parseMoney(r.text) ?? 0) * 100), 0) / 100;
    const over = total !== null && Math.round(allocated * 100) > Math.round(total * 100);

    const toggleAlerts = async (enabled: boolean) => {
        setAlerts((a) => ({ ...a, enabled }));
        if (!enabled) return;
        try {
            let { status } = await Notifications.getPermissionsAsync();
            if (status === "undetermined") status = (await Notifications.requestPermissionsAsync()).status;
            setPermission(status);
        } catch {
            setPermission("denied");
        }
    };

    const save = async () => {
        const result = validateDraft(totalText, liveRows);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setError(null);
        setSaving(true);
        const next = applyDraft(
            budget,
            scope,
            { period, totalLimit: result.totalLimit, categoryLimits: result.categoryLimits, alerts },
            new Date(),
            () => `budget_${Date.now()}`,
        );
        const outcome = await upsertBudget(next);
        setSaving(false);
        if (outcome === "duplicate") {
            appAlert("Budget already exists", `${name} already has a budget. Edit that one instead.`);
            return;
        }
        if (outcome === "error") {
            appAlert("Error", "Failed to save budget. Please try again.");
            return;
        }
        await refreshCashbookWidgets();
        hapticSuccess();
        onSaved();
    };

    const confirmDelete = () => {
        if (!budget) return;
        appAlert("Delete budget", "This removes the budget and its history. Your transactions are not affected.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    const ok = await deleteBudget(budget.id);
                    if (!ok) {
                        appAlert("Error", "Failed to delete budget. Please try again.");
                        return;
                    }
                    await refreshCashbookWidgets();
                    hapticError();
                    onSaved();
                },
            },
        ]);
    };

    const errorText =
        error?.kind === "total"
            ? "Enter a total limit above zero."
            : error?.kind === "category"
              ? "Enter an amount for each category limit, or remove it."
              : over && total !== null
                ? `Category limits add up to ${exactMoney(allocated, symbol)}, more than the ${exactMoney(total, symbol)} total.`
                : null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
                    <ArrowLeft size={24} color={theme.colors.onSurface} />
                </Pressable>
                <View style={styles.headerText}>
                    <Text style={styles.overline}>{budget ? "Edit budget" : "New budget"}</Text>
                    <Text style={styles.title} numberOfLines={1}>
                        {title}
                    </Text>
                </View>
            </View>

            {categories === null ? (
                <ActivityIndicator style={styles.loading} size="large" color={theme.colors.primary} />
            ) : (
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
                    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                        <Text style={styles.label}>Period</Text>
                        <View style={styles.segment} accessibilityRole="radiogroup">
                            {PERIODS.map((p) => {
                                const on = p === period;
                                return (
                                    <Pressable
                                        key={p}
                                        onPress={() => setPeriod(p)}
                                        style={[styles.segmentItem, on && styles.segmentOn]}
                                        accessibilityRole="radio"
                                        accessibilityState={{ checked: on }}
                                    >
                                        <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{PERIOD_LABEL[p]}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                        {budget && period !== budget.period && (
                            <Text style={styles.note}>Changing the period starts a fresh history for this budget.</Text>
                        )}

                        <Text style={[styles.label, styles.spaced]}>Total limit</Text>
                        <View style={[styles.money, error?.kind === "total" && styles.moneyError]}>
                            <Text style={styles.moneySymbol}>{symbol}</Text>
                            <TextInput
                                value={totalText}
                                onChangeText={(t) => MONEY_INPUT.test(t) && setTotalText(t)}
                                keyboardType="decimal-pad"
                                placeholder="0.00"
                                placeholderTextColor={theme.colors.placeholder}
                                style={styles.moneyInput}
                                accessibilityLabel="Total limit"
                            />
                        </View>
                        <Text style={styles.note}>
                            Includes everything you spend in {name} each {periodNoun(period)}.
                        </Text>

                        <CategoryLimitsEditor
                            rows={rows}
                            categories={categories}
                            symbol={symbol}
                            total={total}
                            allocated={allocated}
                            errorId={error?.kind === "category" ? error.id : null}
                            onChange={(next) => {
                                setRows(next);
                                if (error?.kind === "category") setError(null);
                            }}
                        />

                        <AlertSettingsCard
                            enabled={alerts.enabled}
                            warnAt={alerts.warnAt}
                            notificationsDenied={permission === "denied"}
                            onToggle={toggleAlerts}
                            onWarnAt={(warnAt) => setAlerts((a) => ({ ...a, warnAt }))}
                        />

                        {errorText && <Text style={styles.error}>{errorText}</Text>}

                        <Pressable
                            onPress={save}
                            disabled={saving || over}
                            style={({ pressed }) => [styles.save, (saving || over) && styles.saveDisabled, pressed && styles.pressed]}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: saving || over }}
                        >
                            {saving ? (
                                <ActivityIndicator color={theme.colors.inverseOnSurface} />
                            ) : (
                                <Text style={styles.saveText}>Save budget</Text>
                            )}
                        </Pressable>

                        {budget && (
                            <Pressable onPress={confirmDelete} style={styles.delete} accessibilityRole="button">
                                <Text style={styles.deleteText}>Delete budget</Text>
                            </Pressable>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        flex: {
            flex: 1,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            paddingHorizontal: 16,
            paddingVertical: 12,
        },
        headerText: {
            flex: 1,
        },
        overline: {
            ...theme.typescale.labelMedium,
            color: theme.colors.onSurfaceVariant,
        },
        title: {
            ...theme.typescale.titleLarge,
            color: theme.colors.onSurface,
        },
        loading: {
            marginTop: 80,
        },
        scroll: {
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 60,
        },
        label: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
            marginBottom: 10,
        },
        spaced: {
            marginTop: 24,
        },
        segment: {
            flexDirection: "row",
            padding: 4,
            borderRadius: theme.shape.large,
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        segmentItem: {
            flex: 1,
            alignItems: "center",
            paddingVertical: 10,
            borderRadius: theme.shape.medium,
        },
        segmentOn: {
            backgroundColor: theme.colors.inverseSurface,
        },
        segmentText: {
            ...theme.typescale.labelLarge,
            color: theme.colors.onSurfaceVariant,
        },
        segmentTextOn: {
            color: theme.colors.inverseOnSurface,
        },
        note: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
            marginTop: 8,
        },
        money: {
            flexDirection: "row",
            alignItems: "baseline",
            gap: 8,
            borderBottomWidth: 2,
            borderBottomColor: theme.colors.onSurface,
            paddingBottom: 4,
        },
        moneyError: {
            borderBottomColor: theme.colors.error,
        },
        moneySymbol: {
            ...theme.typescale.headlineSmall,
            color: theme.colors.onSurfaceVariant,
        },
        moneyInput: {
            flex: 1,
            ...theme.typescale.headlineMedium,
            color: theme.colors.onSurface,
            fontVariant: ["tabular-nums"],
            paddingVertical: 4,
        },
        error: {
            ...theme.typescale.bodyMedium,
            color: theme.colors.error,
            marginTop: 20,
        },
        save: {
            marginTop: 20,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 16,
            borderRadius: theme.shape.large,
            backgroundColor: theme.colors.inverseSurface,
        },
        saveDisabled: {
            opacity: theme.state.disabledContent,
        },
        pressed: {
            opacity: 0.85,
        },
        saveText: {
            ...theme.typescale.labelLarge,
            fontSize: 15,
            color: theme.colors.inverseOnSurface,
        },
        delete: {
            alignItems: "center",
            paddingVertical: 16,
            marginTop: 4,
        },
        deleteText: {
            ...theme.typescale.labelLarge,
            color: theme.colors.error,
        },
    });
