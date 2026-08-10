import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import type { WidgetConfigurationScreenProps } from "react-native-android-widget";
import { lightTheme, AppTheme } from "../../../theme/theme";
import { getCurrencySymbol } from "../../../utils/_helpers";
import { loadBusinesses, loadTransactions, loadBudgets, loadCategories } from "../../../utils/storage";
import { Business } from "../../../types";
import { setWidgetBusinessId } from "../services/widgetConfig";
import { WIDGET_NAMES, WIDGET_CLICK } from "../constants";
import { resolveWidgetColors, resolveWidgetTheme } from "../theme/widgetTheme";
import { buildBalanceView, buildBudgetView, budgetDataForCashbook, buildQuickAddView } from "../services/widgetData";
import { BalanceWidget } from "../components/BalanceWidget";
import { BudgetWidget } from "../components/BudgetWidget";
import { QuickAddWidget } from "../components/QuickAddWidget";

// The widget host expects the configuration screen to draw the widget's first
// frame itself (via renderWidget) before finishing (via setResult). Skipping
// this leaves the widget blank until the next natural update cycle, which on
// some Android versions isn't triggered automatically after configuration.
async function renderInitialFrame(
    props: WidgetConfigurationScreenProps,
    business: Business,
): Promise<void> {
    const widgetName = props.widgetInfo.widgetName;
    const colors = await resolveWidgetColors();

    if (widgetName === WIDGET_NAMES.QUICK_ADD) {
        props.renderWidget(
            <QuickAddWidget
                view={buildQuickAddView(business)}
                colors={colors}
                clickAction={WIDGET_CLICK.OPEN_QUICK_ADD}
            />,
        );
        return;
    }

    const transactions = await loadTransactions();

    if (widgetName === WIDGET_NAMES.BALANCE) {
        const view = buildBalanceView(business, transactions);
        props.renderWidget(
            <BalanceWidget view={view} colors={colors} clickAction={WIDGET_CLICK.OPEN_QUICK_ADD} />,
        );
        return;
    }

    if (widgetName === WIDGET_NAMES.BUDGET) {
        const [budgets, categories] = await Promise.all([loadBudgets(), loadCategories()]);
        const budget = budgets.find((b) => b.businessId === business.id) ?? null;
        const budgetData = budgetDataForCashbook(budget, transactions, categories, business.id);
        const view = buildBudgetView(business, budget, budgetData);
        props.renderWidget(
            <BudgetWidget view={view} colors={colors} clickAction={WIDGET_CLICK.OPEN_QUICK_ADD} />,
        );
        return;
    }
}

export function WidgetConfigScreen(props: WidgetConfigurationScreenProps) {
    const [theme, setTheme] = useState<AppTheme>(lightTheme);
    const [businesses, setBusinesses] = useState<Business[] | null>(null);

    useEffect(() => {
        resolveWidgetTheme().then(setTheme);
        loadBusinesses().then(setBusinesses);
    }, []);

    const choose = async (business: Business) => {
        try {
            await setWidgetBusinessId(props.widgetInfo.widgetId, business.id);
            await renderInitialFrame(props, business);
        } catch {
            // still finish below so the config Activity doesn't hang; an
            // unmapped widget renders the "Tap to set up" placeholder.
        }
        props.setResult("ok");
    };

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.title, { color: theme.colors.onSurface, fontFamily: theme.fonts.bold }]}>
                Choose a cashbook
            </Text>
            {businesses !== null && businesses.length === 0 ? (
                <Text
                    style={{
                        color: theme.colors.onSurfaceVariant,
                        fontFamily: theme.fonts.regular,
                        fontSize: 14,
                    }}
                >
                    No cashbooks yet — open the app to create one first.
                </Text>
            ) : (
                <ScrollView>
                    {(businesses ?? []).map((b) => (
                        <TouchableOpacity
                            key={b.id}
                            style={[styles.row, { backgroundColor: theme.colors.surfaceContainer }]}
                            onPress={() => choose(b)}
                        >
                            <Text style={{ color: theme.colors.onSurface, fontFamily: theme.fonts.semibold, fontSize: 15 }}>
                                {b.name}
                            </Text>
                            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: theme.fonts.regular }}>
                                {getCurrencySymbol(b.currency)} {b.currency ?? "USD"}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, padding: 16 },
    title: { fontSize: 20, marginBottom: 16 },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
    },
});
