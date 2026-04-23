import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
} from "react-native";
import {
    X,
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
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.txDetailCard}>
                    <TouchableOpacity
                        style={{ alignSelf: "flex-end", padding: 10, marginTop: -10 }}
                        onPress={onClose}
                    >
                        <X size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>

                    {transaction && (
                        <>
                            <View style={styles.txDetailHeader}>
                                <View
                                    style={[
                                        styles.txDetailTypeBadge,
                                        {
                                            backgroundColor:
                                                transaction.type === "income"
                                                    ? theme.colors.success + "20"
                                                    : theme.colors.error + "20",
                                        },
                                    ]}
                                >
                                    <Text
                                        style={{
                                            color:
                                                transaction.type === "income"
                                                    ? theme.colors.success
                                                    : theme.colors.error,
                                            fontWeight: "bold",
                                            fontSize: 12,
                                        }}
                                    >
                                        {transaction.type.toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.txDetailAmount}>
                                    {transaction.type === "income" ? "+" : "-"}
                                    {symbol}
                                    {transaction.amount.toLocaleString()}
                                </Text>
                                <Text style={styles.txDetailDescription}>
                                    {transaction.description}
                                </Text>
                            </View>

                            <View style={styles.txDetailInfoSection}>
                                <DetailRow
                                    icon={<Tag size={18} color={theme.colors.textSecondary} />}
                                    label="Category"
                                    value={transaction.category || "General"}
                                    styles={styles}
                                />
                                <DetailRow
                                    icon={<Calendar size={18} color={theme.colors.textSecondary} />}
                                    label="Date & Time"
                                    value={`${new Date(transaction.date).toLocaleDateString()} ${new Date(
                                        transaction.date,
                                    ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                                    styles={styles}
                                />
                                <DetailRow
                                    icon={<Info size={18} color={theme.colors.textSecondary} />}
                                    label="Mode"
                                    value={transaction.paymentMode || "Cash"}
                                    styles={styles}
                                />
                                {transaction.remark ? (
                                    <View style={[styles.txDetailRow, { alignItems: "flex-start" }]}>
                                        <View style={s.iconLabel}>
                                            <MessageSquare size={18} color={theme.colors.textSecondary} />
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
                                        <Text style={[s.sourceHeaderText, { color: theme.colors.primary }]}>
                                            Source details
                                        </Text>
                                    </View>
                                    {transaction.source ? (
                                        <DetailRow
                                            icon={
                                                transaction.source === "sms" ? (
                                                    <Radio size={18} color={theme.colors.textSecondary} />
                                                ) : (
                                                    <Bell size={18} color={theme.colors.textSecondary} />
                                                )
                                            }
                                            label="Source"
                                            value={transaction.source === "sms" ? "SMS" : transaction.source === "notification" ? "Notification" : transaction.source}
                                            styles={styles}
                                        />
                                    ) : null}
                                    {transaction.sourceApp ? (
                                        <DetailRow
                                            icon={<Info size={18} color={theme.colors.textSecondary} />}
                                            label="From"
                                            value={transaction.sourceApp}
                                            styles={styles}
                                        />
                                    ) : null}
                                    {typeof transaction.confidence === "number" ? (
                                        <DetailRow
                                            icon={<Gauge size={18} color={theme.colors.textSecondary} />}
                                            label="Confidence"
                                            value={`${Math.round(transaction.confidence * 100)}%`}
                                            styles={styles}
                                        />
                                    ) : null}
                                    {transaction.rawText ? (
                                        <View style={[styles.txDetailRow, { alignItems: "flex-start" }]}>
                                            <View style={s.iconLabel}>
                                                <FileText size={18} color={theme.colors.textSecondary} />
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
                                    <Text style={{ color: theme.colors.textInverse, fontWeight: "bold" }}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
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
        fontWeight: "700",
        letterSpacing: 0.6,
        textTransform: "uppercase",
    },
});
