import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Crypto from "expo-crypto";
import { Business, Category, Transaction } from "../types";
import { loadCategories, persistNewCategory } from "../utils/storage";
import { getCurrencySymbol } from "../utils/_helpers";
import { useTheme } from "../theme/theme";
import AppModal from "./AppModal";
import TransactionEntryModal from "./TransactionEntryModal";
import ListCard from "./ListCard";

interface QuickAddModalProps {
    visible: boolean;
    businesses: Business[];
    onClose: () => void;
    onCreate: (tx: Transaction) => void;
    initialBusinessId?: string;
}

export default function QuickAddModal({ visible, businesses, onClose, onCreate, initialBusinessId }: QuickAddModalProps) {
    const theme = useTheme();
    const [categories, setCategories] = useState<Category[]>([]);
    const [selected, setSelected] = useState<Business | null>(null);

    useEffect(() => {
        if (visible) {
            loadCategories().then(setCategories);
        } else {
            setSelected(null);
        }
    }, [visible]);

    useEffect(() => {
        if (visible && businesses.length === 1) setSelected(businesses[0]);
    }, [visible, businesses]);

    useEffect(() => {
        if (visible && initialBusinessId) {
            const match = businesses.find((b) => b.id === initialBusinessId);
            if (match) setSelected(match);
        }
    }, [visible, initialBusinessId, businesses]);

    const handleSubmit = (data: {
        amount: number;
        category: string;
        remark: string;
        entryType: "income" | "expense";
        editingTxId: string | null;
        fee?: number;
    }) => {
        if (!selected) return;
        onCreate({
            id: Crypto.randomUUID(),
            description: data.category,
            amount: data.amount,
            date: new Date().toISOString(),
            type: data.entryType,
            businessId: selected.id,
            category: data.category,
            remark: data.remark,
            fee: data.entryType === "expense" ? data.fee : undefined,
            source: "manual",
        });
        onClose();
    };

    if (!visible) return null;

    if (businesses.length === 0) {
        return (
            <AppModal visible onClose={onClose} title="No cashbooks yet">
                <Text
                    style={{
                        fontFamily: theme.fonts.regular,
                        fontSize: 14,
                        lineHeight: 21,
                        color: theme.colors.onSurfaceVariant,
                        paddingBottom: 12,
                    }}
                >
                    Create a cashbook in the Books tab first, then you can add transactions from
                    anywhere.
                </Text>
            </AppModal>
        );
    }

    if (!selected) {
        return (
            <AppModal visible onClose={onClose} title="Add to which cashbook?">
                <ListCard>
                    {businesses.map((b) => (
                        <TouchableOpacity key={b.id} style={styles.row} onPress={() => setSelected(b)}>
                            <Text
                                style={{
                                    fontFamily: theme.fonts.semibold,
                                    fontSize: 15,
                                    color: theme.colors.onSurface,
                                }}
                            >
                                {b.name}
                            </Text>
                            <Text
                                style={{
                                    fontFamily: theme.fonts.regular,
                                    fontSize: 12,
                                    color: theme.colors.onSurfaceVariant,
                                }}
                            >
                                {b.currency ?? "USD"}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ListCard>
            </AppModal>
        );
    }

    return (
        <TransactionEntryModal
            visible
            entryType="expense"
            showTypeToggle
            editingTx={null}
            categories={categories}
            symbol={getCurrencySymbol(selected.currency)}
            onClose={onClose}
            onCreateCategory={async (name, type) => {
                const { category, list } = await persistNewCategory(name, type);
                setCategories(list);
                return category;
            }}
            onSubmit={handleSubmit}
        />
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 14,
    },
});
