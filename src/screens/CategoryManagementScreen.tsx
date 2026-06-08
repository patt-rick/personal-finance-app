import React, { useState, useEffect, useMemo } from "react";
import { hapticSuccess, hapticError } from "../utils/haptics";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus, Edit2, Trash2, Menu } from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { Category } from "../types";
import { loadCategories, saveCategories } from "../utils/storage";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import AppModal from "../components/AppModal";
import { EmptyScene } from "../components/illustrations";

export default function CategoryManagementScreen({ onBack }: { onBack?: () => void }) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedType, setSelectedType] = useState<"income" | "expense">("expense");
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryName, setCategoryName] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await loadCategories();
        setCategories(data);
    };

    const handleSave = async () => {
        if (!categoryName.trim()) {
            Alert.alert("Error", "Category name cannot be empty");
            return;
        }

        let updatedCategories = [...categories];

        if (editingCategory) {
            updatedCategories = updatedCategories.map((c) =>
                c.id === editingCategory.id ? { ...c, name: categoryName } : c,
            );
        } else {
            const newCategory: Category = {
                id: Date.now().toString(),
                name: categoryName,
                type: selectedType,
                isDefault: false,
            };
            updatedCategories.push(newCategory);
        }

        setCategories(updatedCategories);
        await saveCategories(updatedCategories);
        hapticSuccess();
        setModalVisible(false);
        setCategoryName("");
        setEditingCategory(null);
    };

    const handleDelete = (id: string) => {
        Alert.alert("Delete Category", "Are you sure you want to delete this category?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    const updated = categories.filter((c) => c.id !== id);
                    setCategories(updated);
                    await saveCategories(updated);
                    hapticError();
                },
            },
        ]);
    };

    const openModal = (category?: Category) => {
        if (category) {
            setEditingCategory(category);
            setCategoryName(category.name);
            setSelectedType(category.type);
        } else {
            setEditingCategory(null);
            setCategoryName("");
            // selectedType remains as current view
        }
        setModalVisible(true);
    };

    const filteredCategories = categories.filter((c) => c.type === selectedType);

    const renderItem = ({ item }: { item: Category }) => (
        <View style={styles.itemContainer}>
            <Text style={styles.itemText}>{item.name}</Text>
            <View style={styles.actions}>
                <TouchableOpacity
                    onPress={() => openModal(item)}
                    style={styles.actionButton}
                >
                    <Edit2 size={16} color={theme.colors.onPrimaryContainer} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={[styles.actionButton, styles.actionButtonDelete]}
                >
                    <Trash2 size={16} color={theme.colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <TouchableOpacity
                    onPress={() => {
                        if (onBack) {
                            onBack();
                        } else {
                            navigation.dispatch(DrawerActions.openDrawer());
                        }
                    }}
                    style={styles.backButton}
                >
                    {onBack ? (
                        <ArrowLeft size={22} color={theme.colors.onSurface} />
                    ) : (
                        <Menu size={22} color={theme.colors.onSurface} />
                    )}
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Categories</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        selectedType === "expense" && styles.tabActiveExpense,
                    ]}
                    onPress={() => setSelectedType("expense")}
                >
                    <Text
                        style={[
                            styles.tabText,
                            selectedType === "expense" && styles.tabTextActiveExpense,
                        ]}
                    >
                        Expense
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        selectedType === "income" && styles.tabActiveIncome,
                    ]}
                    onPress={() => setSelectedType("income")}
                >
                    <Text
                        style={[
                            styles.tabText,
                            selectedType === "income" && styles.tabTextActiveIncome,
                        ]}
                    >
                        Income
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredCategories}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={{ alignItems: "center", marginTop: 40 }}>
                        <EmptyScene variant="transactions" size={200} />
                        <Text style={styles.emptyText}>No categories found.</Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={[styles.fab, { bottom: insets.bottom + 94 }]}
                onPress={() => openModal()}
            >
                <Plus size={24} color={theme.colors.onPrimaryContainer} />
            </TouchableOpacity>

            <AppModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                title={editingCategory ? "Edit Category" : "New Category"}
                variant="center"
            >
                <TextInput
                    style={styles.input}
                    placeholder="Category Name"
                    placeholderTextColor={theme.colors.placeholder}
                    value={categoryName}
                    onChangeText={setCategoryName}
                    autoFocus
                />

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                >
                    <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
            </AppModal>
        </View>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.colors.background },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingBottom: 20,
        },
        backButton: {
            width: 40,
            height: 40,
            borderRadius: theme.shape.medium,
            backgroundColor: theme.colors.surfaceContainerLow,
            alignItems: "center",
            justifyContent: "center",
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: "700",
            color: theme.colors.onSurface,
            letterSpacing: -0.2,
        },
        tabs: {
            flexDirection: "row",
            paddingHorizontal: 20,
            gap: 12,
            marginBottom: 10,
        },
        tab: {
            flex: 1,
            paddingVertical: 12,
            alignItems: "center",
            borderRadius: theme.shape.small,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            backgroundColor: "transparent",
        },
        tabActiveExpense: {
            backgroundColor: theme.colors.expenseContainer,
            borderColor: theme.colors.expenseContainer,
        },
        tabActiveIncome: {
            backgroundColor: theme.colors.incomeContainer,
            borderColor: theme.colors.incomeContainer,
        },
        tabText: {
            fontSize: 14,
            fontWeight: "600",
            color: theme.colors.onSurfaceVariant,
        },
        tabTextActiveExpense: {
            color: theme.colors.onExpenseContainer,
            fontWeight: "700",
        },
        tabTextActiveIncome: {
            color: theme.colors.onIncomeContainer,
            fontWeight: "700",
        },
        listContent: {
            padding: 20,
            paddingBottom: 100,
        },
        itemContainer: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 10,
            borderRadius: theme.shape.large,
            backgroundColor: theme.colors.surfaceContainerLow,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        itemText: {
            fontSize: 15,
            fontWeight: "500",
            color: theme.colors.onSurface,
            flex: 1,
        },
        actions: { flexDirection: "row", alignItems: "center", gap: 4 },
        actionButton: {
            width: 36,
            height: 36,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.primaryContainer,
            alignItems: "center",
            justifyContent: "center",
        },
        actionButtonDelete: {
            backgroundColor: theme.colors.errorContainer,
        },
        fab: {
            position: "absolute",
            right: 20,
            width: 56,
            height: 56,
            borderRadius: theme.shape.large,
            backgroundColor: theme.colors.primaryContainer,
            alignItems: "center",
            justifyContent: "center",
            ...theme.elevation.level3,
            shadowColor: theme.colors.shadow,
        },
        input: {
            height: 52,
            borderWidth: 1,
            borderColor: theme.colors.outline,
            borderRadius: theme.shape.medium,
            paddingHorizontal: 16,
            fontSize: 15,
            marginBottom: 24,
            backgroundColor: theme.colors.surfaceContainerHighest,
            color: theme.colors.onSurface,
        },
        saveButton: {
            height: 52,
            borderRadius: theme.shape.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primary,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        saveButtonText: {
            fontSize: 15,
            fontWeight: "700",
            color: theme.colors.onPrimary,
        },
        emptyText: {
            textAlign: "center",
            marginTop: 40,
            color: theme.colors.onSurfaceVariant,
            fontSize: 14,
        },
    });
