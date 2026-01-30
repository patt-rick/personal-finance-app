import AsyncStorage from "@react-native-async-storage/async-storage";
import { Business, Transaction, UserProfile, Category } from "../types";

const STORAGE_KEYS = {
    BUSINESSES: "@businesses",
    TRANSACTIONS: "@transactions",
    USER_PROFILE: "@user_profile",
    CATEGORIES: "@categories",
};

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
