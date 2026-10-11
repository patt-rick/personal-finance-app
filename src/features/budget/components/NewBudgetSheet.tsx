import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BookOpen, ChevronDown, ChevronUp, Globe } from "lucide-react-native";
import AppModal from "../../../components/AppModal";
import { AppTheme, useTheme } from "../../../theme/theme";
import { Budget, BudgetScope, Business, Transaction } from "../../../types";
import { reportCurrencies } from "../../../utils/reportCurrency";
import { currencyLabel, sameScope, scopeKey } from "../scope";

interface NewBudgetSheetProps {
    visible: boolean;
    onClose: () => void;
    businesses: Business[];
    transactions: Transaction[];
    budgets: Budget[];
    onPick: (scope: BudgetScope, existing: Budget | null) => void;
}

type Kind = "cashbook" | "currency";

export default function NewBudgetSheet({ visible, onClose, businesses, transactions, budgets, onPick }: NewBudgetSheetProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [open, setOpen] = useState<Kind | null>(null);
    const currencies = useMemo(() => reportCurrencies(businesses, transactions), [businesses, transactions]);

    const options: Record<Kind, { scope: BudgetScope; label: string }[]> = {
        cashbook: businesses.map((b) => ({ scope: { kind: "cashbook", businessId: b.id }, label: b.name })),
        currency: currencies.map((c) => ({
            scope: { kind: "currency", currency: c.code },
            label: `All ${currencyLabel(c.code)} cashbooks, ${c.cashbooks.length} book${c.cashbooks.length === 1 ? "" : "s"}`,
        })),
    };
    const existingFor = (scope: BudgetScope) => budgets.find((b) => sameScope(b.scope, scope)) ?? null;
    const close = () => {
        setOpen(null);
        onClose();
    };
    const toggle = (kind: Kind) => {
        if (kind === "currency" && options.currency.length === 1) {
            const only = options.currency[0].scope;
            setOpen(null);
            onPick(only, existingFor(only));
            return;
        }
        setOpen((prev) => (prev === kind ? null : kind));
    };

    const kinds: { kind: Kind; title: string; body: string; Icon: typeof Globe }[] = [
        { kind: "cashbook", title: "One cashbook", body: "Limit spending in a single book", Icon: BookOpen },
        {
            kind: "currency",
            title: "All cashbooks in a currency",
            body: "One limit across every book that uses it",
            Icon: Globe,
        },
    ];

    return (
        <AppModal visible={visible} onClose={close} title="New budget" variant="bottomSheet" scrollable>
            <Text style={styles.lead}>What do you want to budget?</Text>
            {kinds.map(({ kind, title, body, Icon }) => {
                const expanded = open === kind;
                const Chevron = expanded ? ChevronUp : ChevronDown;
                return (
                    <View key={kind} style={styles.group}>
                        <Pressable
                            onPress={() => toggle(kind)}
                            style={({ pressed }) => [styles.kind, pressed && styles.pressed]}
                            accessibilityRole="button"
                            accessibilityState={{ expanded }}
                        >
                            <View style={styles.icon}>
                                <Icon size={20} color={theme.colors.onSurface} />
                            </View>
                            <View style={styles.kindText}>
                                <Text style={styles.kindTitle}>{title}</Text>
                                <Text style={styles.kindBody}>{body}</Text>
                            </View>
                            {!(kind === "currency" && options.currency.length === 1) && (
                                <Chevron size={18} color={theme.colors.onSurfaceVariant} />
                            )}
                        </Pressable>
                        {expanded &&
                            options[kind].map(({ scope, label }) => {
                                const existing = existingFor(scope);
                                return (
                                    <Pressable
                                        key={scopeKey(scope)}
                                        onPress={() => {
                                            setOpen(null);
                                            onPick(scope, existing);
                                        }}
                                        style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                                        accessibilityRole="button"
                                    >
                                        <Text style={styles.optionText} numberOfLines={1}>
                                            {label}
                                        </Text>
                                        {existing && <Text style={styles.already}>Already set, edit it</Text>}
                                    </Pressable>
                                );
                            })}
                    </View>
                );
            })}
        </AppModal>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        lead: {
            ...theme.typescale.bodyMedium,
            color: theme.colors.onSurfaceVariant,
            marginBottom: 12,
        },
        group: {
            borderRadius: theme.shape.large,
            backgroundColor: theme.colors.surfaceContainer,
            marginBottom: 10,
            overflow: "hidden",
        },
        kind: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 14,
        },
        pressed: {
            opacity: 0.7,
        },
        icon: {
            width: 40,
            height: 40,
            borderRadius: theme.shape.medium,
            backgroundColor: theme.colors.surfaceContainerHighest,
            alignItems: "center",
            justifyContent: "center",
        },
        kindText: {
            flex: 1,
        },
        kindTitle: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
        },
        kindBody: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
        },
        option: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            paddingVertical: 13,
            paddingHorizontal: 16,
            marginLeft: 66,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.outlineVariant,
        },
        optionText: {
            ...theme.typescale.bodyLarge,
            color: theme.colors.onSurface,
            flexShrink: 1,
        },
        already: {
            ...theme.typescale.labelMedium,
            color: theme.colors.onSurfaceVariant,
        },
    });
