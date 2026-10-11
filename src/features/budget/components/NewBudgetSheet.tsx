import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BookOpen, ChevronLeft, ChevronRight, Layers } from "lucide-react-native";
import AppModal from "../../../components/AppModal";
import CashbookIconBadge from "../../../components/CashbookIconBadge";
import { AppTheme, useTheme } from "../../../theme/theme";
import { Budget, BudgetScope, Business, Transaction } from "../../../types";
import { reportCurrencies } from "../../../utils/reportCurrency";
import { cashbookCurrency } from "../../../utils/transfers";
import { getCurrencyName, getCurrencySymbol } from "../../../utils/_helpers";
import { sameScope } from "../scope";

interface NewBudgetSheetProps {
    visible: boolean;
    onClose: () => void;
    businesses: Business[];
    transactions: Transaction[];
    budgets: Budget[];
    onPick: (scope: BudgetScope, existing: Budget | null) => void;
}

type Step = "kind" | "cashbook" | "currency";

const TITLES: Record<Step, string> = {
    kind: "New budget",
    cashbook: "Choose a cashbook",
    currency: "Choose a currency",
};

export default function NewBudgetSheet({ visible, onClose, businesses, transactions, budgets, onPick }: NewBudgetSheetProps) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [step, setStep] = useState<Step>("kind");
    const currencies = useMemo(() => reportCurrencies(businesses, transactions), [businesses, transactions]);
    const existingFor = (scope: BudgetScope) => budgets.find((b) => sameScope(b.scope, scope)) ?? null;

    useEffect(() => {
        if (visible) setStep("kind");
    }, [visible]);
    const pick = (scope: BudgetScope) => {
        setStep("kind");
        onPick(scope, existingFor(scope));
    };
    const chooseCurrencyKind = () => {
        if (currencies.length === 1) pick({ kind: "currency", currency: currencies[0].code });
        else setStep("currency");
    };

    const status = (scope: BudgetScope) =>
        existingFor(scope) ? <Text style={styles.status}>Has a budget</Text> : null;

    return (
        <AppModal visible={visible} onClose={onClose} title={TITLES[step]} variant="bottomSheet" scrollable>
            {step === "kind" ? (
                <View style={styles.kinds}>
                    <Text style={styles.lead}>What do you want to budget?</Text>
                    <KindOption
                        icon={<BookOpen size={22} color={theme.colors.onPrimaryContainer} />}
                        title="One cashbook"
                        body="A limit for a single book, like Personal or Shop"
                        onPress={() => setStep("cashbook")}
                    />
                    <KindOption
                        icon={<Layers size={22} color={theme.colors.onPrimaryContainer} />}
                        title="All cashbooks in a currency"
                        body={
                            currencies.length === 1
                                ? `One limit across every ${getCurrencySymbol(currencies[0].code)} cashbook`
                                : "One limit across every book that uses a currency"
                        }
                        onPress={chooseCurrencyKind}
                    />
                </View>
            ) : (
                <View>
                    <Pressable
                        onPress={() => setStep("kind")}
                        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel="Back to budget types"
                        hitSlop={8}
                    >
                        <ChevronLeft size={18} color={theme.colors.primary} />
                        <Text style={styles.backText}>Budget types</Text>
                    </Pressable>
                    <View style={styles.list}>
                        {step === "cashbook"
                            ? businesses.map((b, i) => {
                                  const scope: BudgetScope = { kind: "cashbook", businessId: b.id };
                                  return (
                                      <ListRow
                                          key={b.id}
                                          first={i === 0}
                                          leading={<CashbookIconBadge business={b} size={40} />}
                                          title={b.name}
                                          subtitle={getCurrencyName(cashbookCurrency(b))}
                                          trailing={status(scope)}
                                          onPress={() => pick(scope)}
                                      />
                                  );
                              })
                            : currencies.map((c, i) => {
                                  const scope: BudgetScope = { kind: "currency", currency: c.code };
                                  return (
                                      <ListRow
                                          key={c.code}
                                          first={i === 0}
                                          leading={
                                              <View style={styles.currencyBadge}>
                                                  <Text style={styles.currencySymbol}>{getCurrencySymbol(c.code)}</Text>
                                              </View>
                                          }
                                          title={getCurrencyName(c.code)}
                                          subtitle={`${c.cashbooks.length} cashbook${c.cashbooks.length === 1 ? "" : "s"}: ${c.cashbooks.join(", ")}`}
                                          trailing={status(scope)}
                                          onPress={() => pick(scope)}
                                      />
                                  );
                              })}
                    </View>
                </View>
            )}
        </AppModal>
    );
}

function KindOption({ icon, title, body, onPress }: { icon: React.ReactNode; title: string; body: string; onPress: () => void }) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [styles.kind, pressed && styles.pressed]} accessibilityRole="button">
            <View style={styles.kindIcon}>{icon}</View>
            <View style={styles.kindText}>
                <Text style={styles.kindTitle}>{title}</Text>
                <Text style={styles.kindBody}>{body}</Text>
            </View>
            <ChevronRight size={20} color={theme.colors.onSurfaceVariant} />
        </Pressable>
    );
}

function ListRow(props: {
    first: boolean;
    leading: React.ReactNode;
    title: string;
    subtitle: string;
    trailing: React.ReactNode;
    onPress: () => void;
}) {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => [styles.row, !props.first && styles.rowDivider, pressed && styles.rowPressed]}
            accessibilityRole="button"
        >
            {props.leading}
            <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                    {props.title}
                </Text>
                <Text style={styles.rowSubtitle} numberOfLines={2}>
                    {props.subtitle}
                </Text>
            </View>
            {props.trailing}
            <ChevronRight size={18} color={theme.colors.onSurfaceVariant} />
        </Pressable>
    );
}

const createStyles = (theme: AppTheme) =>
    StyleSheet.create({
        kinds: {
            gap: 12,
            paddingBottom: 8,
        },
        lead: {
            ...theme.typescale.bodyMedium,
            color: theme.colors.onSurfaceVariant,
        },
        kind: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 16,
            borderRadius: theme.shape.largeIncreased,
            backgroundColor: theme.colors.surfaceContainer,
        },
        pressed: {
            opacity: 0.7,
        },
        kindIcon: {
            width: 48,
            height: 48,
            borderRadius: theme.shape.large,
            backgroundColor: theme.colors.primaryContainer,
            alignItems: "center",
            justifyContent: "center",
        },
        kindText: {
            flex: 1,
            gap: 2,
        },
        kindTitle: {
            ...theme.typescale.titleMedium,
            color: theme.colors.onSurface,
        },
        kindBody: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
        },
        back: {
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: 2,
            paddingVertical: 4,
            marginBottom: 12,
        },
        backText: {
            ...theme.typescale.labelLarge,
            color: theme.colors.primary,
        },
        list: {
            borderRadius: theme.shape.largeIncreased,
            backgroundColor: theme.colors.surfaceContainerLow,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.outlineVariant,
            overflow: "hidden",
            marginBottom: 8,
        },
        row: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            minHeight: 68,
            paddingHorizontal: 14,
        },
        rowDivider: {
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.colors.outlineVariant,
        },
        rowPressed: {
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        rowText: {
            flex: 1,
        },
        rowTitle: {
            ...theme.typescale.titleSmall,
            color: theme.colors.onSurface,
        },
        rowSubtitle: {
            ...theme.typescale.bodySmall,
            color: theme.colors.onSurfaceVariant,
        },
        status: {
            ...theme.typescale.labelSmall,
            color: theme.colors.onSecondaryContainer,
            backgroundColor: theme.colors.secondaryContainer,
            paddingVertical: 3,
            paddingHorizontal: 8,
            borderRadius: theme.shape.full,
            overflow: "hidden",
        },
        currencyBadge: {
            width: 40,
            height: 40,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surfaceContainerHigh,
        },
        currencySymbol: {
            ...theme.typescale.titleMedium,
            color: theme.colors.onSurface,
        },
    });
