import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Save, Wallet } from "lucide-react-native";
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
    const [totalLimit, setTotalLimit] = useState("");
    const [categoryLimits, setCategoryLimits] = useState<{ [key: string]: string }>({});
    const [existingBudget, setExistingBudget] = useState<Budget | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const cats = await loadCategories();
        const expenseCats = cats.filter((c) => c.type === "expense");
        setCategories(expenseCats);

        // Load existing budget if any
        const budget = await getBudgetByBusinessId(business.id);
        if (budget) {
            setExistingBudget(budget);
            setPeriod(budget.period);
            setTotalLimit(budget.totalLimit.toString());

            const limits: { [key: string]: string } = {};
            Object.keys(budget.categoryBudgets).forEach((catId) => {
                limits[catId] = budget.categoryBudgets[catId].limit.toString();
            });
            setCategoryLimits(limits);
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
            const limit = parseFloat(categoryLimits[catId]);
            if (!isNaN(limit) && limit > 0) {
                categoryBudgets[catId] = { limit };
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

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <ArrowLeft size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                    {existingBudget ? "Edit Budget" : "Set Budget"}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Business Info */}
                <View style={[styles.businessCard, { backgroundColor: theme.colors.card }]}>
                    <View style={styles.businessIconContainer}>
                        <Wallet size={24} color={theme.colors.primary} />
                    </View>
                    <View style={styles.businessInfo}>
                        <Text style={[styles.businessName, { color: theme.colors.text }]}>
                            {business.name}
                        </Text>
                        <Text
                            style={[styles.businessSubtext, { color: theme.colors.textSecondary }]}
                        >
                            Budget Configuration
                        </Text>
                    </View>
                </View>

                {/* Period Selection */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Budget Period
                    </Text>
                    <View style={styles.periodContainer}>
                        {(["weekly", "monthly", "yearly"] as const).map((p) => (
                            <TouchableOpacity
                                key={p}
                                onPress={() => setPeriod(p)}
                                style={[
                                    styles.periodButton,
                                    {
                                        backgroundColor:
                                            period === p ? theme.colors.primary : theme.colors.card,
                                        borderColor: theme.colors.border,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.periodButtonText,
                                        {
                                            color: period === p ? "#fff" : theme.colors.text,
                                        },
                                    ]}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Total Budget */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Total Budget Limit
                    </Text>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: theme.colors.card,
                                color: theme.colors.text,
                                borderColor: theme.colors.border,
                            },
                        ]}
                        placeholder="Enter total budget"
                        placeholderTextColor={theme.colors.placeholder}
                        value={totalLimit}
                        onChangeText={handleTotalLimitChange}
                        keyboardType="decimal-pad"
                    />
                </View>

                {/* Category Budgets */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Category Budgets
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                        Allocate budget to each expense category
                    </Text>

                    {categories.map((category) => (
                        <View key={category.id} style={styles.categoryRow}>
                            <Text style={[styles.categoryName, { color: theme.colors.text }]}>
                                {category.name}
                            </Text>
                            <TextInput
                                style={[
                                    styles.categoryInput,
                                    {
                                        backgroundColor: theme.colors.card,
                                        color: theme.colors.text,
                                        borderColor: theme.colors.border,
                                    },
                                ]}
                                placeholder="0"
                                placeholderTextColor={theme.colors.placeholder}
                                value={categoryLimits[category.id] || ""}
                                onChangeText={(val) => handleCategoryLimitChange(category.id, val)}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    ))}
                </View>

                {/* Summary */}
                <View
                    style={[
                        styles.summaryCard,
                        {
                            backgroundColor: isOverBudget
                                ? theme.colors.expenseBg
                                : theme.colors.incomeBg,
                        },
                    ]}
                >
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                            Total Budget:
                        </Text>
                        <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                            {business.currency || "₦"}
                            {totalLimitNum.toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                            Allocated:
                        </Text>
                        <Text
                            style={[
                                styles.summaryValue,
                                {
                                    color: isOverBudget ? theme.colors.error : theme.colors.text,
                                },
                            ]}
                        >
                            {business.currency || "₦"}
                            {categorySum.toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                            Unallocated:
                        </Text>
                        <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                            {business.currency || "₦"}
                            {Math.max(0, totalLimitNum - categorySum).toFixed(2)}
                        </Text>
                    </View>
                    {isOverBudget && (
                        <Text style={[styles.errorText, { color: theme.colors.error }]}>
                            ⚠️ Category budgets exceed total budget
                        </Text>
                    )}
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving || isOverBudget}
                    style={[
                        styles.saveButton,
                        {
                            backgroundColor:
                                saving || isOverBudget ? theme.colors.border : theme.colors.primary,
                        },
                    ]}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Save size={20} color="#fff" />
                            <Text style={styles.saveButtonText}>Save Budget</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
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
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        fontFamily: "Inter",
    },
    content: {
        flex: 1,
        padding: 16,
    },
    businessCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    businessIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(99, 102, 241, 0.1)",
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
        fontFamily: "Inter",
        marginBottom: 4,
    },
    businessSubtext: {
        fontSize: 13,
        fontFamily: "Inter",
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        fontFamily: "Inter",
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 13,
        fontFamily: "Inter",
        marginBottom: 12,
    },
    periodContainer: {
        flexDirection: "row",
        gap: 12,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: "center",
    },
    periodButtonText: {
        fontSize: 14,
        fontWeight: "500",
        fontFamily: "Inter",
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: "Inter",
    },
    categoryRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    categoryName: {
        fontSize: 15,
        fontFamily: "Inter",
        flex: 1,
    },
    categoryInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 15,
        fontFamily: "Inter",
        width: 120,
        textAlign: "right",
    },
    summaryCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        fontFamily: "Inter",
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: "600",
        fontFamily: "Inter",
    },
    errorText: {
        fontSize: 13,
        fontFamily: "Inter",
        marginTop: 8,
        textAlign: "center",
    },
    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
        fontFamily: "Inter",
    },
});
