import React, { useState, useEffect, useCallback, useRef } from "react";
import { Alert, Platform, View, StyleSheet, useColorScheme, AppState } from "react-native";

import { StatusBar } from "expo-status-bar";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LayoutGrid, Landmark, Settings, PiggyBank } from "lucide-react-native";
import DashboardScreen from "./src/screens/DashboardScreen";
import BusinessesScreen from "./src/screens/BusinessesScreen";
import BudgetDashboardScreen from "./src/screens/BudgetDashboardScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import SplashScreen from "./src/screens/SplashScreen";
import LockScreen from "./src/screens/LockScreen";
import { Business, Transaction, UserProfile, RecurringTransaction, Debt } from "./src/types";
import { useTheme } from "./src/theme/theme";
import { ThemeProvider, useThemeContext } from "./src/theme/ThemeContext";
import {
    loadBusinesses,
    saveBusinesses,
    loadTransactions,
    saveTransactions,
    loadUserProfile,
    saveUserProfile as apiSaveUserProfile,
    loadRecurringTransactions,
    saveRecurringTransactions as apiSaveRecurringTransactions,
    loadDebts,
    saveDebts as apiSaveDebts,
} from "./src/utils/storage";
import { processRecurringTransactions } from "./src/utils/recurringTransactions";
import { scheduleReminders } from "./src/utils/notifications";
import {
    isPinEnabled,
    isBiometricsEnabled,
    isBiometricsAvailable,
    getBiometricType,
    authenticateWithBiometrics,
} from "./src/utils/security";

const Tab = createBottomTabNavigator();

export default function App() {
    return (
        <ThemeProvider>
            <MainApp />
        </ThemeProvider>
    );
}

function MainApp() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [pinEnabled, setPinEnabled] = useState(false);
    const [biometricsAvailable, setBiometricsAvailable] = useState(false);
    const [biometricsEnabled, setBiometricsEnabled] = useState(false);
    const [biometricType, setBiometricType] = useState("Biometrics");
    const appState = useRef(AppState.currentState);
    const { themeMode, theme } = useThemeContext();
    const systemColorScheme = useColorScheme();

    const isDark = themeMode === "system" ? systemColorScheme === "dark" : themeMode === "dark";

    const loadSecuritySettings = useCallback(async () => {
        const [pinOn, bioAvail, bioOn, bioType] = await Promise.all([
            isPinEnabled(),
            isBiometricsAvailable(),
            isBiometricsEnabled(),
            getBiometricType(),
        ]);
        setPinEnabled(pinOn);
        setBiometricsAvailable(bioAvail);
        setBiometricsEnabled(bioOn);
        setBiometricType(bioType);
        return pinOn;
    }, []);

    useEffect(() => {
        async function loadData() {
            const startTime = Date.now();

            const [loadedBusinesses, loadedTransactions, loadedProfile, loadedRecurring, loadedDebts] = await Promise.all([
                loadBusinesses(),
                loadTransactions(),
                loadUserProfile(),
                loadRecurringTransactions(),
                loadDebts(),
            ]);

            setBusinesses(loadedBusinesses);
            setUserProfile(loadedProfile);
            setDebts(loadedDebts);

            const { newTransactions, updatedRecurring } = processRecurringTransactions(loadedRecurring);
            if (newTransactions.length > 0) {
                const mergedTransactions = [...loadedTransactions, ...newTransactions];
                setTransactions(mergedTransactions);
                await saveTransactions(mergedTransactions);
            } else {
                setTransactions(loadedTransactions);
            }
            setRecurringTransactions(updatedRecurring);
            if (newTransactions.length > 0 || JSON.stringify(updatedRecurring) !== JSON.stringify(loadedRecurring)) {
                await apiSaveRecurringTransactions(updatedRecurring);
            }

            const pinOn = await loadSecuritySettings();
            if (pinOn) {
                setIsLocked(true);
            }

            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, 3000 - elapsedTime);

            setTimeout(() => {
                setIsLoading(false);
            }, remainingTime);
        }
        loadData();
        scheduleReminders();
    }, [loadSecuritySettings]);

    useEffect(() => {
        if (__DEV__ || Platform.OS === "web") return;

        const checkForUpdates = async () => {
            try {
                const ExpoInAppUpdates = await import("expo-in-app-updates");
                if (Platform.OS === "android") {
                    await ExpoInAppUpdates.checkAndStartUpdate(false);
                } else {
                    const result = await ExpoInAppUpdates.checkForUpdate();
                    if (!result.updateAvailable) return;

                    Alert.alert(
                        "Update Available",
                        `A new version (${result.storeVersion}) is available. Update now for the latest features and improvements.`,
                        [
                            { text: "Update", onPress: () => ExpoInAppUpdates.startUpdate() },
                            { text: "Later", style: "cancel" },
                        ],
                    );
                }
            } catch (e) {
                // silently fail — native module unavailable in Expo Go
            }
        };

        checkForUpdates();
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextAppState) => {
            if (
                appState.current.match(/active/) &&
                nextAppState.match(/inactive|background/)
            ) {
                if (pinEnabled) {
                    setIsLocked(true);
                }
            }
            appState.current = nextAppState;
        });
        return () => subscription.remove();
    }, [pinEnabled]);

    const handleUnlock = useCallback(() => {
        setIsLocked(false);
    }, []);

    const handleBiometricAuth = useCallback(async () => {
        const success = await authenticateWithBiometrics();
        if (success) {
            setIsLocked(false);
        }
    }, []);

    const handlePinChanged = useCallback(async () => {
        await loadSecuritySettings();
    }, [loadSecuritySettings]);

    const handleSaveBusinesses = async (newBusinesses: Business[]) => {
        setBusinesses(newBusinesses);
        await saveBusinesses(newBusinesses);
    };

    const handleSaveTransactions = async (newTransactions: Transaction[]) => {
        setTransactions(newTransactions);
        await saveTransactions(newTransactions);
    };

    const handleSaveUserProfile = async (profile: UserProfile) => {
        setUserProfile(profile);
        await apiSaveUserProfile(profile);
    };

    const handleSaveRecurringTransactions = async (items: RecurringTransaction[]) => {
        setRecurringTransactions(items);
        await apiSaveRecurringTransactions(items);
    };

    const handleSaveDebts = async (newDebts: Debt[]) => {
        setDebts(newDebts);
        await apiSaveDebts(newDebts);
    };

    const refreshData = useCallback(async () => {
        const [loadedBusinesses, loadedTransactions, loadedProfile, loadedRecurring, loadedDebts] = await Promise.all([
            loadBusinesses(),
            loadTransactions(),
            loadUserProfile(),
            loadRecurringTransactions(),
            loadDebts(),
        ]);
        setBusinesses(loadedBusinesses);
        setTransactions(loadedTransactions);
        setUserProfile(loadedProfile);
        setRecurringTransactions(loadedRecurring);
        setDebts(loadedDebts);
    }, []);

    const handleDataImported = refreshData;

    if (isLoading) {
        return <SplashScreen />;
    }

    if (isLocked) {
        return (
            <LockScreen
                onUnlock={handleUnlock}
                biometricsAvailable={biometricsAvailable && biometricsEnabled}
                biometricType={biometricType}
                onBiometricAuth={handleBiometricAuth}
            />
        );
    }

    const MyDefaultTheme = {
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            background: theme.colors.background,
            card: theme.colors.card,
            text: theme.colors.text,
            border: theme.colors.border,
        },
    };

    const MyDarkTheme = {
        ...DarkTheme,
        colors: {
            ...DarkTheme.colors,
            background: theme.colors.background,
            card: theme.colors.card,
            text: theme.colors.text,
            border: theme.colors.border,
        },
    };

    return (
        <SafeAreaProvider>
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <StatusBar
                    style={isDark ? "light" : "dark"}
                    backgroundColor={theme.colors.background}
                    translucent={false}
                />
                <NavigationContainer theme={isDark ? MyDarkTheme : MyDefaultTheme}>
                    <Tab.Navigator
                        screenOptions={{
                            tabBarStyle: [
                                styles.tabBar,
                                {
                                    backgroundColor: theme.colors.card,
                                    borderTopColor: theme.colors.border,
                                },
                            ],
                            tabBarActiveTintColor: theme.colors.primary,
                            tabBarInactiveTintColor: theme.colors.textSecondary,
                            headerShown: false,
                        }}
                    >
                        <Tab.Screen
                            name="Dashboard"
                            options={{
                                tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} />,
                            }}
                            listeners={{
                                tabPress: () => setCurrentBusiness(null),
                            }}
                        >
                            {() => (
                                <DashboardScreen
                                    businesses={businesses}
                                    transactions={transactions}
                                    currentBusiness={currentBusiness}
                                    setCurrentBusiness={setCurrentBusiness}
                                    saveTransactions={handleSaveTransactions}
                                    userProfile={userProfile}
                                    onRefresh={refreshData}
                                />
                            )}
                        </Tab.Screen>
                        <Tab.Screen
                            name="Cashbooks"
                            options={{
                                tabBarIcon: ({ color }) => <Landmark size={24} color={color} />,
                            }}
                            listeners={{
                                tabPress: () => setCurrentBusiness(null),
                            }}
                        >
                            {() => (
                                <BusinessesScreen
                                    businesses={businesses}
                                    transactions={transactions}
                                    saveBusinesses={handleSaveBusinesses}
                                    currentBusiness={currentBusiness}
                                    setCurrentBusiness={setCurrentBusiness}
                                />
                            )}
                        </Tab.Screen>
                        <Tab.Screen
                            name="Budget"
                            options={{
                                tabBarIcon: ({ color }) => <PiggyBank size={24} color={color} />,
                            }}
                            listeners={{
                                tabPress: () => setCurrentBusiness(null),
                            }}
                        >
                            {() => (
                                <BudgetDashboardScreen
                                    businesses={businesses}
                                    transactions={transactions}
                                    currentBusiness={currentBusiness}
                                    setCurrentBusiness={setCurrentBusiness}
                                />
                            )}
                        </Tab.Screen>
                        <Tab.Screen
                            name="Settings"
                            options={{
                                tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
                            }}
                            listeners={{
                                tabPress: () => setCurrentBusiness(null),
                            }}
                        >
                            {() => (
                                <SettingsScreen
                                    userProfile={userProfile}
                                    saveUserProfile={handleSaveUserProfile}
                                    onDataImported={handleDataImported}
                                    onPinChanged={handlePinChanged}
                                    recurringTransactions={recurringTransactions}
                                    saveRecurringTransactions={handleSaveRecurringTransactions}
                                    businesses={businesses}
                                    transactions={transactions}
                                    debts={debts}
                                    saveDebts={handleSaveDebts}
                                />
                            )}
                        </Tab.Screen>
                    </Tab.Navigator>
                </NavigationContainer>
            </View>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        borderTopWidth: 1,
        paddingTop: 8,
    },
});
