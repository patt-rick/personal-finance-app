import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { Business, Transaction, UserProfile, Category, Budget, RecurringTransaction, Debt } from "../types";
import { AutoLogSettings, SenderMapping, ReviewItem } from "../features/autoLogging/types";
import { STORAGE_KEYS } from "./storageKeys";

export { STORAGE_KEYS };

const DEFAULT_CATEGORIES: Category[] = [
    { id: "1", name: "Salary", type: "income", isDefault: true },
    { id: "2", name: "Business", type: "income", isDefault: true },
    { id: "3", name: "Freelance", type: "income", isDefault: true },
    { id: "4", name: "Investment", type: "income", isDefault: true },
    { id: "5", name: "Other Income", type: "income", isDefault: true },
    { id: "6", name: "Food", type: "expense", isDefault: true },
    { id: "7", name: "Transportation", type: "expense", isDefault: true },
    { id: "8", name: "Housing", type: "expense", isDefault: true },
    { id: "9", name: "Utilities", type: "expense", isDefault: true },
    { id: "10", name: "Healthcare", type: "expense", isDefault: true },
    { id: "11", name: "Insurance", type: "expense", isDefault: true },
    { id: "12", name: "Personal", type: "expense", isDefault: true },
    { id: "13", name: "Education", type: "expense", isDefault: true },
    { id: "14", name: "Savings", type: "expense", isDefault: true },
    { id: "15", name: "Other Expense", type: "expense", isDefault: true },
];

export const loadBusinesses = async (): Promise<Business[]> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.BUSINESSES);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Error loading businesses:", error);
        return [];
    }
};

export const saveBusinesses = async (businesses: Business[]): Promise<boolean> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.BUSINESSES, JSON.stringify(businesses));
        return true;
    } catch (error) {
        console.error("Error saving businesses:", error);
        return false;
    }
};

export const loadTransactions = async (): Promise<Transaction[]> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Error loading transactions:", error);
        return [];
    }
};

export const saveTransactions = async (transactions: Transaction[]): Promise<boolean> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
        return true;
    } catch (error) {
        console.error("Error saving transactions:", error);
        return false;
    }
};

export const loadUserProfile = async (): Promise<UserProfile | null> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        return data ? JSON.parse(data) : { name: "New User" };
    } catch (error) {
        console.error("Error loading user profile:", error);
        return null;
    }
};

export const saveUserProfile = async (profile: UserProfile): Promise<boolean> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
        return true;
    } catch (error) {
        return false;
    }
};

export const loadCategories = async (): Promise<Category[]> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
        if (data) {
            return JSON.parse(data);
        }
        // Return default categories if none exist
        return DEFAULT_CATEGORIES;
    } catch (error) {
        console.error("Error loading categories:", error);
        return DEFAULT_CATEGORIES;
    }
};

export const saveCategories = async (categories: Category[]): Promise<boolean> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
        return true;
    } catch (error) {
        console.error("Error saving categories:", error);
        return false;
    }
};

// Budget Storage Functions
export const loadBudgets = async (): Promise<Budget[]> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.BUDGETS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Error loading budgets:", error);
        return [];
    }
};

export const saveBudgets = async (budgets: Budget[]): Promise<boolean> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
        return true;
    } catch (error) {
        console.error("Error saving budgets:", error);
        return false;
    }
};

export const getBudgetByBusinessId = async (businessId: string): Promise<Budget | null> => {
    try {
        const budgets = await loadBudgets();
        return budgets.find((b) => b.businessId === businessId) || null;
    } catch (error) {
        console.error("Error getting budget:", error);
        return null;
    }
};

export const saveBudget = async (budget: Budget): Promise<boolean> => {
    try {
        const budgets = await loadBudgets();
        const index = budgets.findIndex((b) => b.id === budget.id);

        if (index >= 0) {
            budgets[index] = budget;
        } else {
            budgets.push(budget);
        }

        return await saveBudgets(budgets);
    } catch (error) {
        console.error("Error saving budget:", error);
        return false;
    }
};

export const deleteBudget = async (budgetId: string): Promise<boolean> => {
    try {
        const budgets = await loadBudgets();
        const filtered = budgets.filter((b) => b.id !== budgetId);
        return await saveBudgets(filtered);
    } catch (error) {
        console.error("Error deleting budget:", error);
        return false;
    }
};

// Recurring Transactions Storage
export const loadRecurringTransactions = async (): Promise<RecurringTransaction[]> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.RECURRING_TRANSACTIONS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Error loading recurring transactions:", error);
        return [];
    }
};

export const saveRecurringTransactions = async (items: RecurringTransaction[]): Promise<boolean> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.RECURRING_TRANSACTIONS, JSON.stringify(items));
        return true;
    } catch (error) {
        console.error("Error saving recurring transactions:", error);
        return false;
    }
};

// Debts Storage
export const loadDebts = async (): Promise<Debt[]> => {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.DEBTS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Error loading debts:", error);
        return [];
    }
};

export const saveDebts = async (debts: Debt[]): Promise<boolean> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
        return true;
    } catch (error) {
        console.error("Error saving debts:", error);
        return false;
    }
};

// Full Data Export/Import

interface AppBackupV2Data {
    businesses: Business[];
    transactions: Transaction[];
    userProfile: UserProfile | null;
    categories: Category[];
    budgets: Budget[];
    recurringTransactions: RecurringTransaction[];
    debts: Debt[];
}

interface AppBackupV3Data extends AppBackupV2Data {
    autoLogSettings: AutoLogSettings | null;
    senderMappings: SenderMapping[];
    reviewQueue: ReviewItem[];
}

interface AppBackup {
    version: 2 | 3;
    exportedAt: string;
    data: AppBackupV2Data | AppBackupV3Data;
}

export const exportAllData = async (): Promise<boolean> => {
    try {
        const [
            businesses,
            transactions,
            userProfile,
            categories,
            budgets,
            recurringTransactions,
            debts,
            autoLogSettingsRaw,
            senderMappingsRaw,
            reviewQueueRaw,
        ] = await Promise.all([
            loadBusinesses(),
            loadTransactions(),
            loadUserProfile(),
            loadCategories(),
            loadBudgets(),
            loadRecurringTransactions(),
            loadDebts(),
            AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOG_SETTINGS),
            AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOG_SENDER_MAPPINGS),
            AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOG_REVIEW_QUEUE),
        ]);

        const autoLogSettings: AutoLogSettings | null = autoLogSettingsRaw ? JSON.parse(autoLogSettingsRaw) : null;
        const senderMappings: SenderMapping[] = senderMappingsRaw ? JSON.parse(senderMappingsRaw) : [];
        const reviewQueue: ReviewItem[] = reviewQueueRaw ? JSON.parse(reviewQueueRaw) : [];

        const backup: AppBackup = {
            version: 3,
            exportedAt: new Date().toISOString(),
            data: {
                businesses,
                transactions,
                userProfile,
                categories,
                budgets,
                recurringTransactions,
                debts,
                autoLogSettings,
                senderMappings,
                reviewQueue,
            },
        };

        const fileName = `finance_tracker_backup_${Date.now()}.json`;
        const fileUri = FileSystem.cacheDirectory + fileName;

        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backup), {
            encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
                mimeType: "application/json",
                dialogTitle: "Export App Data",
                UTI: "public.json",
            });
            return true;
        }

        return false;
    } catch (error) {
        console.error("Error exporting data:", error);
        return false;
    }
};

export const importAllData = async (): Promise<boolean> => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: "application/json",
            copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets?.length) {
            return false;
        }

        const fileUri = result.assets[0].uri;
        const content = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.UTF8,
        });

        const backup: AppBackup = JSON.parse(content);

        if (!backup.version || !backup.data) {
            throw new Error("Invalid backup file format");
        }
        if (backup.version !== 2 && backup.version !== 3) {
            throw new Error(`Unsupported backup version: ${backup.version}`);
        }

        const { businesses, transactions, userProfile, categories, budgets, recurringTransactions, debts } = backup.data;

        if (!Array.isArray(businesses) || !Array.isArray(transactions) || !Array.isArray(categories)) {
            throw new Error("Invalid backup data structure");
        }

        const writes: Promise<unknown>[] = [
            saveBusinesses(businesses),
            saveTransactions(transactions),
            userProfile ? saveUserProfile(userProfile) : Promise.resolve(true),
            saveCategories(categories),
            saveBudgets(budgets || []),
            saveRecurringTransactions(recurringTransactions || []),
            saveDebts(debts || []),
        ];

        if (backup.version === 3) {
            const v3 = backup.data as AppBackupV3Data;
            writes.push(
                v3.autoLogSettings
                    ? AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOG_SETTINGS, JSON.stringify(v3.autoLogSettings))
                    : AsyncStorage.removeItem(STORAGE_KEYS.AUTO_LOG_SETTINGS),
                AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOG_SENDER_MAPPINGS, JSON.stringify(v3.senderMappings || [])),
                AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOG_REVIEW_QUEUE, JSON.stringify(v3.reviewQueue || [])),
            );
        } else {
            writes.push(
                AsyncStorage.removeItem(STORAGE_KEYS.AUTO_LOG_SETTINGS),
                AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOG_SENDER_MAPPINGS, JSON.stringify([])),
                AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOG_REVIEW_QUEUE, JSON.stringify([])),
            );
        }

        await Promise.all(writes);

        return true;
    } catch (error) {
        console.error("Error importing data:", error);
        throw error;
    }
};
