import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Budget, BudgetScope, Business, Category, Transaction } from "../../../types";
import { loadCategories } from "../../../utils/storage";
import { loadBudgets } from "../storage/budgetStore";
import { availableScopes, resolveScopeSelection } from "../selection";
import { sameScope, scopeKey } from "../scope";
import { nextPeriod, periodRange, previousPeriod } from "../periods";
import { parseLocalISODate, toLocalISODate } from "../dates";
import { buildPeriodView } from "../dashboardModel";
import { budgetHistory } from "../history";

export function useBudgetDashboard(businesses: Business[], transactions: Transaction[], currentBusiness: Business | null) {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<BudgetScope | null>(() =>
        resolveScopeSelection(null, currentBusiness, businesses),
    );
    const [viewedKey, setViewedKey] = useState<string | null>(null);

    const reload = useCallback(async () => {
        const [b, c] = await Promise.all([loadBudgets(), loadCategories()]);
        setBudgets(b);
        setCategories(c);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            reload();
        }, [reload]),
    );

    useEffect(() => {
        if (currentBusiness) setSelected((prev) => resolveScopeSelection(prev, currentBusiness, businesses));
    }, [currentBusiness]);

    useEffect(() => {
        setSelected((prev) => resolveScopeSelection(prev, null, businesses));
    }, [businesses]);

    const scopes = useMemo(() => availableScopes(businesses, transactions), [businesses, transactions]);
    const budget = useMemo(
        () => (selected ? budgets.find((b) => sameScope(b.scope, selected)) ?? null : null),
        [budgets, selected],
    );

    const selectedKey = selected ? scopeKey(selected) : "";
    useEffect(() => setViewedKey(null), [budget?.id, budget?.period, selectedKey]);

    const now = new Date();
    const currentKey = budget ? periodRange(budget.period, now).key : "";
    const rangeKey = viewedKey ?? currentKey;
    const todayKey = toLocalISODate(now);

    const view = useMemo(() => {
        if (!budget || !rangeKey) return null;
        const range = periodRange(budget.period, parseLocalISODate(rangeKey));
        return buildPeriodView(budget, transactions, businesses, categories, range, new Date());
    }, [budget, rangeKey, todayKey, transactions, businesses, categories]);

    const history = useMemo(
        () => (budget ? budgetHistory(budget, transactions, businesses, categories, new Date()) : []),
        [budget, todayKey, transactions, businesses, categories],
    );

    const canGoForward = !!budget && rangeKey < currentKey;
    const goBack = useCallback(() => {
        if (view && budget) setViewedKey(previousPeriod(budget.period, view.range).key);
    }, [view, budget]);
    const goForward = useCallback(() => {
        if (!view || !budget || !canGoForward) return;
        const next = nextPeriod(budget.period, view.range).key;
        setViewedKey(next === currentKey ? null : next);
    }, [view, budget, canGoForward, currentKey]);
    const selectPeriod = useCallback(
        (key: string) => setViewedKey(key === currentKey ? null : key),
        [currentKey],
    );

    return {
        loading,
        reload,
        scopes,
        selected,
        select: setSelected,
        budgets,
        budget,
        view,
        history,
        canGoForward,
        goBack,
        goForward,
        selectPeriod,
    };
}
