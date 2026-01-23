import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Alert } from "react-native";
import { Plus } from "lucide-react-native";
import { styles } from "../styles/globalStyles";
import TransactionItem from "../components/TransactionItem";
import BusinessChip from "../components/BusinessChip";
import { Business, Transaction } from "../types";
import { theme } from "../theme/theme";

interface TransactionsScreenProps {
    businesses: Business[];
    transactions: Transaction[];
    saveTransactions: (transactions: Transaction[]) => void;
    currentBusiness: Business | null;
}

export default function TransactionsScreen({
    businesses,
    transactions,
    saveTransactions,
    currentBusiness,
}: TransactionsScreenProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [type, setType] = useState<"income" | "expense">("income");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [selectedBusiness, setSelectedBusiness] = useState(currentBusiness?.id || "");
    const [editingTxId, setEditingTxId] = useState<string | null>(null);

    const groupedTransactions = React.useMemo(() => {
        const sorted = [...transactions].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        const groups: { title: string; data: Transaction[] }[] = [];

        sorted.forEach((t) => {
            const date = new Date(t.date);
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            let dateKey = date.toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
            });
            if (date.toDateString() === today.toDateString()) dateKey = "Today";
            else if (date.toDateString() === yesterday.toDateString()) dateKey = "Yesterday";

            let group = groups.find((g) => g.title === dateKey);
            if (!group) {
                group = { title: dateKey, data: [] };
                groups.push(group);
            }
            group.data.push(t);
        });
        return groups;
    }, [transactions]);

    const addTransaction = () => {
        if (!amount || !description || !selectedBusiness) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        if (editingTxId) {
            saveTransactions(
                transactions.map((t) =>
                    t.id === editingTxId
                        ? {
                              ...t,
                              type,
                              amount: parseFloat(amount),
                              description,
                              businessId: selectedBusiness,
                          }
                        : t,
                ),
            );
            setEditingTxId(null);
        } else {
            const newTransaction: Transaction = {
                id: Date.now().toString(),
                type,
                amount: parseFloat(amount),
                description,
                businessId: selectedBusiness,
                date: new Date().toISOString(),
            };
            saveTransactions([...transactions, newTransaction]);
        }

        // Reset form
        setAmount("");
        setDescription("");
        setType("income");
        setModalVisible(false);
    };

    const handleEdit = (tx: Transaction) => {
        setAmount(tx.amount.toString());
        setDescription(tx.description);
        setType(tx.type);
        setSelectedBusiness(tx.businessId);
        setEditingTxId(tx.id);
        setModalVisible(true);
    };

    const handleClose = () => {
        setModalVisible(false);
        setEditingTxId(null);
        setAmount("");
        setDescription("");
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.transactionsList}>
                {groupedTransactions.map((group) => (
                    <View key={group.title} style={{ marginBottom: 20 }}>
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: "600",
                                color: theme.colors.textSecondary,
                                marginBottom: 10,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                            }}
                        >
                            {group.title}
                        </Text>
                        {group.data.map((transaction) => {
                            const business = businesses.find(
                                (b) => b.id === transaction.businessId,
                            );
                            return (
                                <TouchableOpacity
                                    key={transaction.id}
                                    onPress={() => handleEdit(transaction)}
                                >
                                    <TransactionItem
                                        transaction={transaction}
                                        business={business}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
                {transactions.length === 0 && (
                    <Text style={styles.emptyText}>
                        No transactions yet. Add one to get started!
                    </Text>
                )}
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Plus size={24} color={theme.colors.textInverse} />
            </TouchableOpacity>

            {/* Add Transaction Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingTxId ? "Edit Transaction" : "Add Transaction"}
                        </Text>

                        {/* Type Selector */}
                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    type === "income" && styles.typeButtonActive,
                                ]}
                                onPress={() => setType("income")}
                            >
                                <Text
                                    style={[
                                        styles.typeButtonText,
                                        type === "income" && styles.typeButtonTextActive,
                                    ]}
                                >
                                    Income
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    type === "expense" && styles.typeButtonActive,
                                ]}
                                onPress={() => setType("expense")}
                            >
                                <Text
                                    style={[
                                        styles.typeButtonText,
                                        type === "expense" && styles.typeButtonTextActive,
                                    ]}
                                >
                                    Expense
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Amount Input */}
                        <TextInput
                            style={styles.input}
                            placeholder="Amount"
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                            placeholderTextColor={theme.colors.placeholder}
                        />

                        {/* Description Input */}
                        <TextInput
                            style={styles.input}
                            placeholder="Description"
                            value={description}
                            onChangeText={setDescription}
                            placeholderTextColor={theme.colors.placeholder}
                        />

                        {/* Business Selector */}
                        <View style={styles.pickerContainer}>
                            <Text style={styles.pickerLabel}>Business</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {businesses.map((business) => (
                                    <BusinessChip
                                        key={business.id}
                                        business={business}
                                        isActive={selectedBusiness === business.id}
                                        onPress={() => setSelectedBusiness(business.id)}
                                    />
                                ))}
                            </ScrollView>
                            {businesses.length === 0 && (
                                <Text style={styles.emptyText}>Please create a business first</Text>
                            )}
                        </View>

                        {/* Action Buttons */}
                        <TouchableOpacity style={styles.button} onPress={addTransaction}>
                            <Text style={styles.buttonText}>Add Transaction</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonSecondary]}
                            onPress={handleClose}
                        >
                            <Text style={[styles.buttonText, styles.buttonSecondaryText]}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
