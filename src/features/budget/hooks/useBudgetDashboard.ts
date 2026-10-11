import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Budget, BudgetScope, Business, Category, Transaction } from "../../../types";
import { loadCategories } from "../../../utils/storage";
import { loadBudgets } from "../storage/budgetStore";
import { reportCurrencies } from "../../../utils/reportCurrency";
import { BudgetSelection, resolveBudgetSelection, scopesForCurrency, selectCurrency } from "../selection";
import { sameScope, scopeCurrency, scopeKey } from "../scope";
import { nextPeriod, periodRange, previousPeriod } from "../periods";
import { parseLocalISODate, toLocalISODate } from "../dates";
import { buildPeriodView } from "../dashboardModel";
import { budgetHistory } from "../history";

export function useBudgetDashboard(businesses: Business[], transactions: Transaction[], currentBusiness: Business | null) {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selection, setSelection] = useState<BudgetSelection | null>(() =>
        resolveBudgetSelection(null, currentBusiness, businesses, transactions),
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
        if (currentBusiness) setSelection((prev) => resolveBudgetSelection(prev, currentBusiness, businesses, transactions));
    }, [currentBusiness]);

    useEffect(() => {
        setSelection((prev) => resolveBudgetSelection(prev, null, businesses, transactions));
    }, [businesses]);

    const selected = selection?.scope ?? null;
    const currency = selection?.currency ?? null;
    const currencies = useMemo(() => reportCurrencies(businesses, transactions), [businesses, transactions]);
    const scopes = useMemo(() => (currency ? scopesForCurrency(currency, businesses) : []), [currency, businesses]);
    const select = useCallback(
        (scope: BudgetScope) => setSelection({ scope, currency: scopeCurrency(scope, businesses) }),
        [businesses],
    );
    const chooseCurrency = useCallback((code: string) => setSelection(selectCurrency(code, businesses)), [businesses]);
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
        currencies,
        currency,
        chooseCurrency,
        scopes,
        selected,
        select,
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
