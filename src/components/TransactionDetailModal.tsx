import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from "react-native";
import {
    Calendar,
    Tag,
    Info,
    Trash,
    MessageSquare,
    Pencil,
    Sparkles,
    Radio,
    Bell,
    Gauge,
    FileText,
} from "lucide-react-native";
import { Transaction } from "../types";
import { useTheme } from "../theme/theme";
import { createDashboardStyles } from "../styles/dashboardStyles";
import AppModal from "./AppModal";
import CategoryIcon from "./CategoryIcon";

interface TransactionDetailModalProps {
    visible: boolean;
    transaction: Transaction | null;
    symbol: string;
    onClose: () => void;
    onEdit: () => void;
    onDelete: (id: string) => void;
}

export default function TransactionDetailModal({
    visible,
    transaction,
    symbol,
    onClose,
    onEdit,
    onDelete,
}: TransactionDetailModalProps) {
    const theme = useTheme();
    const styles = React.useMemo(() => createDashboardStyles(theme), [theme]);

    return (
        <AppModal visible={visible} onClose={onClose} showHandle={false}>
            {transaction && (
                <>
                    <ScrollView
                        style={s.scrollArea}
                        contentContainerStyle={s.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.txDetailHeader}>
                            <View style={{ marginBottom: 12 }}>
                                <CategoryIcon
                                    category={transaction.category || transaction.description}
                                    type={transaction.type}
                                    autoLogged={transaction.autoLogged}
                                    size={48}
                                />
                            </View>
                            <Text
                                style={[
                                    styles.txDetailAmount,
                                    {
                                        color:
                                            transaction.type === "income"
                                                ? theme.colors.income
                                                : theme.colors.onSurface,
                                    },
                                ]}
                            >
                                {transaction.type === "income" ? "+" : "-"}
                                {symbol}
                                {transaction.amount.toLocaleString()}
                            </Text>
                            <Text style={styles.txDetailDescription}>
                                {transaction.description}
                            </Text>
                            <View
                                style={[
                                    styles.txDetailTypeBadge,
                                    {
                                        marginTop: 10,
                                        marginBottom: 0,
                                        backgroundColor:
                                            transaction.type === "income"
                                                ? theme.colors.incomeContainer
                                                : theme.colors.surfaceContainerHigh,
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        color:
                                            transaction.type === "income"
                                                ? theme.colors.onIncomeContainer
                                                : theme.colors.onSurfaceVariant,
                                        fontFamily: theme.fonts.semibold,
                                        fontSize: 11,
                                        letterSpacing: 0.8,
                                    }}
                                >
                                    {transaction.type.toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.txDetailInfoSection}>
                            <DetailRow
                                icon={<Tag size={18} color={theme.colors.onSurfaceVariant} />}
                                label="Category"
                                value={transaction.category || "General"}
                                styles={styles}
                            />
                            <DetailRow
                                icon={<Calendar size={18} color={theme.colors.onSurfaceVariant} />}
                                label="Date & Time"
                                value={`${new Date(transaction.date).toLocaleDateString()} ${new Date(
                                    transaction.date,
                                ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                                styles={styles}
                            />
                            <DetailRow
                                icon={<Info size={18} color={theme.colors.onSurfaceVariant} />}
                                label="Mode"
                                value={transaction.paymentMode || "Cash"}
                                styles={styles}
                            />
                            {transaction.remark ? (
                                <View style={[styles.txDetailRow, { alignItems: "flex-start" }]}>
                                    <View style={s.iconLabel}>
                                        <MessageSquare size={18} color={theme.colors.onSurfaceVariant} />
                                        <Text style={styles.txDetailLabel}>Remark</Text>
                                    </View>
                                    <Text
                                        style={[
                                            styles.txDetailValue,
                                            { flex: 1, textAlign: "right", marginLeft: 20 },
                                        ]}
                                    >
                                        {transaction.remark}
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        {transaction.autoLogged ? (
                            <View style={[styles.txDetailInfoSection, { marginTop: 12 }]}>
                                <View style={s.sourceHeader}>
                                    <Sparkles size={14} color={theme.colors.primary} />
                                    <Text
                                        style={[
                                            s.sourceHeaderText,
                                            { color: theme.colors.primary, fontFamily: theme.fonts.semibold },
                                        ]}
                                    >
                                        Source details
                                    </Text>
                                </View>
                                {transaction.source ? (
                                    <DetailRow
                                        icon={
                                            transaction.source === "sms" ? (
                                                <Radio size={18} color={theme.colors.onSurfaceVariant} />
                                            ) : (
                                                <Bell size={18} color={theme.colors.onSurfaceVariant} />
                                            )
                                        }
                                        label="Source"
                                        value={
                                            transaction.source === "sms"
                                                ? "SMS"
                                                : transaction.source === "notification"
                                                ? "Notification"
                                                : transaction.source
                                        }
                                        styles={styles}
                                    />
                                ) : null}
                                {transaction.sourceApp ? (
                                    <DetailRow
                                        icon={<Info size={18} color={theme.colors.onSurfaceVariant} />}
                                        label="From"
                                        value={transaction.sourceApp}
                                        styles={styles}
                                    />
                                ) : null}
                                {typeof transaction.confidence === "number" ? (
                                    <DetailRow
                                        icon={<Gauge size={18} color={theme.colors.onSurfaceVariant} />}
                                        label="Confidence"
                                        value={`${Math.round(transaction.confidence * 100)}%`}
                                        styles={styles}
                                    />
                                ) : null}
                                {transaction.rawText ? (
                                    <View style={[styles.txDetailRow, { alignItems: "flex-start" }]}>
                                        <View style={s.iconLabel}>
                                            <FileText size={18} color={theme.colors.onSurfaceVariant} />
                                            <Text style={styles.txDetailLabel}>Original</Text>
                                        </View>
                                        <Text
                                            style={[
                                                styles.txDetailValue,
                                                { flex: 1, textAlign: "right", marginLeft: 20 },
                                            ]}
                                        >
                                            {transaction.rawText}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        ) : null}
                    </ScrollView>

                    <View style={styles.txDetailActions}>
                        <TouchableOpacity
                            style={styles.txDetailDeleteBtn}
                            onPress={() => onDelete(transaction.id)}
                        >
                            <Trash size={20} color={theme.colors.error} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.txDetailDeleteBtn, { borderColor: theme.colors.primary }]}
                            onPress={onEdit}
                        >
                            <Pencil size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.txDetailCloseBtn} onPress={onClose}>
                            <Text
                                style={{
                                    color: theme.colors.onPrimary,
                                    fontFamily: theme.fonts.semibold,
                                    fontSize: 15,
                                }}
                            >
                                Done
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </AppModal>
    );
}

function DetailRow({
    icon,
    label,
    value,
    styles,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    styles: any;
}) {
    return (
        <View style={styles.txDetailRow}>
            <View style={s.iconLabel}>
                {icon}
                <Text style={styles.txDetailLabel}>{label}</Text>
            </View>
            <Text style={styles.txDetailValue}>{value}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    iconLabel: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    sourceHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    sourceHeaderText: {
        fontSize: 11,
        letterSpacing: 0.6,
        textTransform: "uppercase",
    },
    scrollArea: {
        flexShrink: 1,
    },
    scrollContent: {
        paddingBottom: 8,
    },
});
