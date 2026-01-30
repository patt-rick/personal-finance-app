import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Plus, Edit2, Trash2, X, Check, Menu } from "lucide-react-native";
import { useTheme } from "../theme/theme";
import { Category } from "../types";
import { loadCategories, saveCategories } from "../utils/storage";
import { useNavigation, DrawerActions } from "@react-navigation/native";

export default function CategoryManagementScreen({ onBack }: { onBack?: () => void }) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

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
        <View style={[styles.itemContainer, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.itemText, { color: theme.colors.text }]}>{item.name}</Text>
            <View style={styles.actions}>
                <TouchableOpacity onPress={() => openModal(item)} style={styles.actionButton}>
                    <Edit2 size={18} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={[styles.actionButton, { marginLeft: 8 }]}
                >
                    <Trash2 size={18} color={theme.colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
                        <ArrowLeft size={24} color={theme.colors.text} />
                    ) : (
                        <Menu size={24} color={theme.colors.text} />
                    )}
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Categories</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        selectedType === "expense" && {
                            backgroundColor: theme.colors.expenseBg,
                            borderColor: theme.colors.expense,
                        },
                    ]}
                    onPress={() => setSelectedType("expense")}
                >
                    <Text
                        style={[
                            styles.tabText,
                            { color: theme.colors.textSecondary },
                            selectedType === "expense" && {
                                color: theme.colors.expense,
                                fontWeight: "bold",
                            },
                        ]}
                    >
                        Expense
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        selectedType === "income" && {
                            backgroundColor: theme.colors.incomeBg,
                            borderColor: theme.colors.income,
                        },
                    ]}
                    onPress={() => setSelectedType("income")}
                >
                    <Text
                        style={[
                            styles.tabText,
                            { color: theme.colors.textSecondary },
                            selectedType === "income" && {
                                color: theme.colors.income,
                                fontWeight: "bold",
                            },
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
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                ListEmptyComponent={
                    <Text
                        style={{
                            textAlign: "center",
                            marginTop: 40,
                            color: theme.colors.textSecondary,
                        }}
                    >
                        No categories found.
                    </Text>
                }
            />

            <TouchableOpacity
                style={[
                    styles.fab,
                    { backgroundColor: theme.colors.primary, bottom: insets.bottom + 20 },
                ]}
                onPress={() => openModal()}
            >
                <Plus size={24} color="white" />
            </TouchableOpacity>

            <Modal visible={modalVisible} transparent animationType="fade">
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                                {editingCategory ? "Edit Category" : "New Category"}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: theme.colors.background,
                                    color: theme.colors.text,
                                    borderColor: theme.colors.border,
                                },
                            ]}
                            placeholder="Category Name"
                            placeholderTextColor={theme.colors.placeholder}
                            value={categoryName}
                            onChangeText={setCategoryName}
                            autoFocus
                        />

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: "bold" },
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
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "transparent",
    },
    tabText: { fontSize: 16 },
    itemContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
    },
    itemText: { fontSize: 16, fontWeight: "500" },
    actions: { flexDirection: "row", alignItems: "center" },
    actionButton: { padding: 8 },
    fab: {
        position: "absolute",
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 20,
    },
    modalContent: {
        borderRadius: 24,
        padding: 24,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    modalTitle: { fontSize: 20, fontWeight: "bold" },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        marginBottom: 24,
    },
    saveButton: {
        height: 50,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
