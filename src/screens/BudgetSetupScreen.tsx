import React, { useState, useEffect, useMemo } from "react";
import { hapticSuccess } from "../utils/haptics";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Save, Wallet, Plus, Trash } from "lucide-react-native";
import AppModal from "../components/AppModal";
import { useTheme } from "../theme/theme";
import { Business, Budget, Category } from "../types";
import { loadCategories } from "../utils/storage";
import { saveBudget, getBudgetByBusinessId } from "../utils/storage";
import { validateBudget } from "../utils/budgetCalculations";

interface BudgetSetupScreenProps {
    business: Business;
    onBack: () => void;
    onSave?: () => void;
}

export default function BudgetSetupScreen({ business, onBack, onSave }: BudgetSetupScreenProps) {
    const theme = useTheme();
    const s = useMemo(() => createStyles(theme), [theme]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
    const [totalLimit, setTotalLimit] = useState("");
    const [categoryLimits, setCategoryLimits] = useState<{ [key: string]: string }>({});
    const [existingBudget, setExistingBudget] = useState<Budget | null>(null);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const cats = await loadCategories();
        const expenseCats = cats.filter((c) => c.type === "expense");
        setAllCategories(expenseCats);

        // Load existing budget if any
        const budget = await getBudgetByBusinessId(business.id);
        if (budget) {
            setExistingBudget(budget);
            setPeriod(budget.period);
            setTotalLimit(budget.totalLimit.toString());

            const limits: { [key: string]: string } = {};
            const selectedIds: string[] = [];

            Object.keys(budget.categoryBudgets).forEach((catId) => {
                limits[catId] = budget.categoryBudgets[catId].limit.toString();
                selectedIds.push(catId);
            });

            setCategoryLimits(limits);
            setSelectedCategoryIds(selectedIds);
        }

        setLoading(false);
    };

    const handleCategoryLimitChange = (categoryId: string, value: string) => {
        // Only allow numbers and decimals
        if (value === "" || /^\d*\.?\d*$/.test(value)) {
            setCategoryLimits((prev) => ({ ...prev, [categoryId]: value }));
        }
    };

    const handleTotalLimitChange = (value: string) => {
        if (value === "" || /^\d*\.?\d*$/.test(value)) {
            setTotalLimit(value);
        }
    };

    const addCategory = (categoryId: string) => {
        if (!selectedCategoryIds.includes(categoryId)) {
            setSelectedCategoryIds([...selectedCategoryIds, categoryId]);
            setCategoryLimits((prev) => ({ ...prev, [categoryId]: "" }));
        }
        setShowCategoryPicker(false);
    };

    const removeCategory = (categoryId: string) => {
        setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== categoryId));
        const newLimits = { ...categoryLimits };
        delete newLimits[categoryId];
        setCategoryLimits(newLimits);
    };

    const calculateCategorySum = (): number => {
        return Object.values(categoryLimits).reduce((sum, val) => {
            const num = parseFloat(val);
            return sum + (isNaN(num) ? 0 : num);
        }, 0);
    };

    const handleSave = async () => {
        const totalLimitNum = parseFloat(totalLimit);
        if (isNaN(totalLimitNum) || totalLimitNum <= 0) {
            Alert.alert("Invalid Input", "Please enter a valid total budget amount");
            return;
        }

        // Build category budgets object
        const categoryBudgets: { [key: string]: { limit: number } } = {};
        Object.keys(categoryLimits).forEach((catId) => {
            if (selectedCategoryIds.includes(catId)) {
                const limit = parseFloat(categoryLimits[catId]);
                if (!isNaN(limit) && limit > 0) {
                    categoryBudgets[catId] = { limit };
                }
            }
        });

        // Validate
        const validation = validateBudget(totalLimitNum, categoryBudgets);
        if (!validation.valid) {
            Alert.alert("Validation Error", validation.error || "Invalid budget configuration");
            return;
        }

        setSaving(true);

        const budget: Budget = {
            id: existingBudget?.id || `budget_${Date.now()}`,
            businessId: business.id,
            period,
            totalLimit: totalLimitNum,
            categoryBudgets,
            createdAt: existingBudget?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const success = await saveBudget(budget);

        setSaving(false);

        if (success) {
            hapticSuccess();
            Alert.alert(
                "Success",
                existingBudget ? "Budget updated successfully" : "Budget created successfully",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            onSave?.();
                            onBack();
                        },
                    },
                ],
            );
        } else {
            Alert.alert("Error", "Failed to save budget. Please try again.");
        }
    };

    const categorySum = calculateCategorySum();
    const totalLimitNum = parseFloat(totalLimit) || 0;
    const isOverBudget = categorySum > totalLimitNum;

    // Get available categories (not yet selected)
    const availableCategories = allCategories.filter((c) => !selectedCategoryIds.includes(c.id));

    if (loading) {
        return (
            <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
                <View style={s.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={onBack} style={s.backButton}>
                    <ArrowLeft size={24} color={theme.colors.onSurface} />
                </TouchableOpacity>
                <Text style={[s.headerTitle, { color: theme.colors.onSurface }]}>
                    {existingBudget ? "Edit Budget" : "Set Budget"}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
            >
                <ScrollView
                    style={s.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Business Info */}
                    <View style={s.businessCard}>
                        <View style={s.businessIconContainer}>
                            <Wallet size={24} color={theme.colors.onPrimaryContainer} />
                        </View>
                        <View style={s.businessInfo}>
                            <Text style={[s.businessName, { color: theme.colors.onSurface }]}>
                                {business.name}
                            </Text>
                            <Text style={[s.businessSubtext, { color: theme.colors.onSurfaceVariant }]}>
                                Budget Configuration
                            </Text>
                        </View>
                    </View>

                    {/* Period Selection */}
                    <View style={s.section}>
                        <Text style={[s.sectionTitle, { color: theme.colors.onSurface }]}>
                            Budget Period
                        </Text>
                        <View style={s.periodContainer}>
                            {(["weekly", "monthly", "yearly"] as const).map((p) => (
                                <TouchableOpacity
                                    key={p}
                                    onPress={() => setPeriod(p)}
                                    style={[
                                        s.periodButton,
                                        period === p ? s.periodButtonActive : s.periodButtonInactive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            s.periodButtonText,
                                            period === p
                                                ? s.periodButtonTextActive
                                                : s.periodButtonTextInactive,
                                        ]}
                                    >
                                        {p.charAt(0).toUpperCase() + p.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Total Budget */}
                    <View style={s.section}>
                        <Text style={[s.sectionTitle, { color: theme.colors.onSurface }]}>
                            Total Budget Limit
                        </Text>
                        <TextInput
                            style={s.input}
                            placeholder="Enter total budget"
                            placeholderTextColor={theme.colors.onSurfaceVariant}
                            value={totalLimit}
                            onChangeText={handleTotalLimitChange}
                            keyboardType="decimal-pad"
                        />
                    </View>

                    {/* Category Budgets */}
                    <View style={s.section}>
                        <View style={s.categoryHeader}>
                            <View>
                                <Text style={[s.sectionTitle, { color: theme.colors.onSurface, marginBottom: 4 }]}>
                                    Category Budgets
                                </Text>
                                <Text style={[s.sectionSubtitle, { color: theme.colors.onSurfaceVariant, marginBottom: 0 }]}>
                                    Allocate budget to categories
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowCategoryPicker(true)}
                                style={s.addCategoryBtn}
                            >
                                <Plus size={16} color={theme.colors.onSecondaryContainer} />
                                <Text style={s.addCategoryBtnText}>
                                    Add
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {selectedCategoryIds.length === 0 ? (
                            <View style={s.emptyStateContainer}>
                                <Text style={[s.emptyStateText, { color: theme.colors.onSurfaceVariant }]}>
                                    No categories added yet. Tap "Add" to start budgeting for
                                    specific categories.
                                </Text>
                            </View>
                        ) : (
                            selectedCategoryIds.map((catId) => {
                                const category = allCategories.find((c) => c.id === catId);
                                if (!category) return null;

                                return (
                                    <View key={catId} style={s.categoryRow}>
                                        <Text style={[s.categoryName, { color: theme.colors.onSurface }]}>
                                            {category.name}
                                        </Text>
                                        <View style={s.categoryInputRow}>
                                            <TextInput
                                                style={s.categoryInput}
                                                placeholder="0"
                                                placeholderTextColor={theme.colors.onSurfaceVariant}
                                                value={categoryLimits[catId] || ""}
                                                onChangeText={(val) =>
                                                    handleCategoryLimitChange(catId, val)
                                                }
                                                keyboardType="decimal-pad"
                                            />
                                            <TouchableOpacity
                                                onPress={() => removeCategory(catId)}
                                                style={s.removeBtn}
                                            >
                                                <Trash size={18} color={theme.colors.error} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>

                    {/* Summary */}
                    <View
                        style={[
                            s.summaryCard,
                            {
                                backgroundColor: isOverBudget
                                    ? theme.colors.errorContainer
                                    : theme.colors.incomeContainer,
                            },
                        ]}
                    >
                        <View style={s.summaryRow}>
                            <Text style={[s.summaryLabel, { color: isOverBudget ? theme.colors.onErrorContainer : theme.colors.onIncomeContainer }]}>
                                Total Budget:
                            </Text>
                            <Text style={[s.summaryValue, { color: isOverBudget ? theme.colors.onErrorContainer : theme.colors.onIncomeContainer }]}>
                                {business.currency || "₦"}
                                {totalLimitNum.toFixed(2)}
                            </Text>
                        </View>
                        <View style={s.summaryRow}>
                            <Text style={[s.summaryLabel, { color: isOverBudget ? theme.colors.onErrorContainer : theme.colors.onIncomeContainer }]}>
                                Allocated:
                            </Text>
                            <Text
                                style={[
                                    s.summaryValue,
                                    {
                                        color: isOverBudget
                                            ? theme.colors.error
                                            : theme.colors.onIncomeContainer,
                                        fontWeight: "700",
                                    },
                                ]}
                            >
                                {business.currency || "₦"}
                                {categorySum.toFixed(2)}
                            </Text>
                        </View>
                        <View style={s.summaryRow}>
                            <Text style={[s.summaryLabel, { color: isOverBudget ? theme.colors.onErrorContainer : theme.colors.onIncomeContainer }]}>
                                Unallocated:
                            </Text>
                            <Text style={[s.summaryValue, { color: isOverBudget ? theme.colors.onErrorContainer : theme.colors.onIncomeContainer }]}>
                                {business.currency || "₦"}
                                {Math.max(0, totalLimitNum - categorySum).toFixed(2)}
                            </Text>
                        </View>
                        {isOverBudget && (
                            <Text style={[s.errorText, { color: theme.colors.error }]}>
                                ⚠️ Category budgets exceed total budget
                            </Text>
                        )}
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving || isOverBudget}
                        style={[
                            s.saveButton,
                            saving || isOverBudget ? s.saveButtonDisabled : s.saveButtonActive,
                        ]}
                    >
                        {saving ? (
                            <ActivityIndicator color={theme.colors.onPrimary} />
                        ) : (
                            <>
                                <Save
                                    size={20}
                                    color={saving || isOverBudget ? theme.colors.onSurfaceVariant : theme.colors.onPrimary}
                                />
                                <Text
                                    style={[
                                        s.saveButtonText,
                                        {
                                            color: saving || isOverBudget
                                                ? theme.colors.onSurfaceVariant
                                                : theme.colors.onPrimary,
                                        },
                                    ]}
                                >
                                    Save Budget
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            <AppModal
                visible={showCategoryPicker}
                onClose={() => setShowCategoryPicker(false)}
                title="Add Category"
                showHandle={false}
                scrollable
            >
                {availableCategories.length === 0 ? (
                    <Text style={[s.noCategoriesText, { color: theme.colors.onSurfaceVariant }]}>
                        All categories selected
                    </Text>
                ) : (
                    availableCategories.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={s.modalItem}
                            onPress={() => addCategory(cat.id)}
                        >
                            <Text style={[s.modalItemText, { color: theme.colors.onSurface }]}>
                                {cat.name}
                            </Text>
                            <Plus size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                    ))
                )}
            </AppModal>
        </SafeAreaView>
    );
}

const createStyles = (theme: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.outlineVariant,
        },
        backButton: {
            padding: 4,
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: "600",
        },
        content: {
            flex: 1,
            padding: 16,
        },
        businessCard: {
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            borderRadius: theme.shape.large,
            marginBottom: 24,
            backgroundColor: theme.colors.surfaceContainerLow,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        businessIconContainer: {
            width: 48,
            height: 48,
            borderRadius: theme.shape.full,
            backgroundColor: theme.colors.primaryContainer,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
        },
        businessInfo: {
            flex: 1,
        },
        businessName: {
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 4,
        },
        businessSubtext: {
            fontSize: 13,
        },
        section: {
            marginBottom: 24,
        },
        sectionTitle: {
            fontSize: 16,
            fontWeight: "600",
            marginBottom: 8,
        },
        sectionSubtitle: {
            fontSize: 13,
            marginBottom: 12,
        },
        periodContainer: {
            flexDirection: "row",
            gap: 12,
        },
        periodButton: {
            flex: 1,
            paddingVertical: 12,
            borderRadius: theme.shape.full,
            borderWidth: 1,
            alignItems: "center",
            minHeight: 48,
            justifyContent: "center",
        },
        periodButtonActive: {
            backgroundColor: theme.colors.secondaryContainer,
            borderColor: theme.colors.secondaryContainer,
        },
        periodButtonInactive: {
            backgroundColor: theme.colors.surfaceContainerHigh,
            borderColor: theme.colors.outlineVariant,
        },
        periodButtonText: {
            fontSize: 14,
            fontWeight: "500",
        },
        periodButtonTextActive: {
            color: theme.colors.onSecondaryContainer,
            fontWeight: "600",
        },
        periodButtonTextInactive: {
            color: theme.colors.onSurfaceVariant,
        },
        input: {
            borderWidth: 1,
            borderRadius: theme.shape.medium,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
            height: 52,
            backgroundColor: theme.colors.surfaceContainerHighest,
            borderColor: theme.colors.outline,
            color: theme.colors.onSurface,
        },
        categoryHeader: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
        },
        categoryRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
        },
        categoryName: {
            fontSize: 15,
            flex: 1,
        },
        categoryInputRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        categoryInput: {
            borderWidth: 1,
            borderRadius: theme.shape.medium,
            paddingHorizontal: 12,
            paddingVertical: 8,
            fontSize: 15,
            width: 120,
            textAlign: "right",
            backgroundColor: theme.colors.surfaceContainerHighest,
            borderColor: theme.colors.outline,
            color: theme.colors.onSurface,
        },
        removeBtn: {
            padding: 8,
        },
        addCategoryBtn: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: theme.shape.full,
            gap: 4,
            backgroundColor: theme.colors.secondaryContainer,
        },
        addCategoryBtnText: {
            fontSize: 12,
            fontWeight: "600",
            color: theme.colors.onSecondaryContainer,
        },
        emptyStateContainer: {
            borderWidth: 1,
            borderStyle: "dashed",
            borderRadius: theme.shape.medium,
            padding: 24,
            alignItems: "center",
            justifyContent: "center",
            borderColor: theme.colors.outlineVariant,
        },
        emptyStateText: {
            fontSize: 14,
            textAlign: "center",
        },
        summaryCard: {
            padding: 16,
            borderRadius: theme.shape.large,
            marginBottom: 24,
        },
        summaryRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 8,
        },
        summaryLabel: {
            fontSize: 14,
        },
        summaryValue: {
            fontSize: 14,
            fontWeight: "600",
        },
        errorText: {
            fontSize: 13,
            marginTop: 8,
            textAlign: "center",
        },
        saveButton: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 52,
            borderRadius: theme.shape.full,
            gap: 8,
            ...theme.elevation.level1,
            shadowColor: theme.colors.shadow,
        },
        saveButtonActive: {
            backgroundColor: theme.colors.primary,
        },
        saveButtonDisabled: {
            backgroundColor: theme.colors.surfaceContainerHigh,
            ...theme.elevation.level0,
        },
        saveButtonText: {
            fontSize: 15,
            fontWeight: "700",
            letterSpacing: 0.1,
        },
        modalItem: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 16,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.outlineVariant,
        },
        modalItemText: {
            fontSize: 16,
        },
        noCategoriesText: {
            textAlign: "center",
            padding: 20,
        },
    });
