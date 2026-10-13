import React, { useState, useEffect, useCallback, useRef } from "react";
import { Platform, View, useColorScheme, AppState, Linking } from "react-native";
import { appAlert } from "./src/components/dialog";

import { StatusBar } from "expo-status-bar";
import {
    useFonts,
    Manrope_300Light,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
    NavigationContainer,
    DefaultTheme,
    DarkTheme,
    createNavigationContainerRef,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import FloatingTabBar from "./src/components/FloatingTabBar";
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
import QuickAddModal from "./src/components/QuickAddModal";
import { drainNativeQueue } from "./src/features/autoLogging/services/ingestion/drainNativeQueue";
import { autoLogNative } from "./src/features/autoLogging/services/ingestion/nativeBridge";
import { refreshCashbookWidgets } from "./src/features/widgets/services/widgetSync";
import { removeMappingsForBusiness } from "./src/features/widgets/services/widgetConfig";
import { parseQuickAddLink } from "./src/features/widgets/services/deepLink";
import WidgetPreviewScreen from "./src/features/widgets/screens/WidgetPreviewScreen";
import { AppDialogHost } from "./src/components/dialog";
import { registerBudgetAlerts } from "./src/features/budget/alerts/registerBudgetAlerts";
import { setBudgetAlertGate } from "./src/features/budget/alerts/deliverAlerts";
import { deleteBudgetsForBusinesses, persistBudgetMigration } from "./src/features/budget/storage/budgetStore";
import TourHost, { TourShield } from "./src/features/tour/TourHost";
import { useTourSheet } from "./src/features/tour/hooks";
import { onTourEnd, setTourContext, setTourNavigator } from "./src/features/tour/tourStore";
import { TabName } from "./src/features/tour/types";
import { maybeRequestReview } from "./src/utils/storeReview";

// TEMP: flip to true (in a dev build) to preview the widgets, then revert.
const PREVIEW_WIDGETS = false;

const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef<Record<TabName, undefined>>();

const syncTourTab = () => {
    const name = navigationRef.getCurrentRoute()?.name;
    if (name) setTourContext({ activeTab: name as TabName });
};

export default function App() {
    const scheme = useColorScheme();
    const [fontsLoaded] = useFonts({
        Manrope_300Light,
        Manrope_400Regular,
        Manrope_600SemiBold,
        Manrope_700Bold,
    });

    if (!fontsLoaded) {
        return (
            <View
                style={{ flex: 1, backgroundColor: scheme === "dark" ? "#15130F" : "#F7F4EF" }}
            />
        );
    }

    if (PREVIEW_WIDGETS) {
        return <WidgetPreviewScreen />;
    }

    return (
        <ThemeProvider>
            <MainApp />
            <AppDialogHost />
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
    const [quickAddVisible, setQuickAddVisible] = useState(false);
    const [quickAddBusinessId, setQuickAddBusinessId] = useState<string | undefined>(undefined);
    const quickAddVisibleRef = useRef(false);
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

    useEffect(() => registerBudgetAlerts(), []);

    useEffect(() => {
        setBudgetAlertGate(!isLoading && !isLocked);
    }, [isLoading, isLocked]);

    useEffect(() => {
        async function loadData() {
            const startTime = Date.now();
            await persistBudgetMigration();

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
                await saveTransactions(mergedTransactions, { prev: loadedTransactions });
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

                    appAlert(
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

    useEffect(() => {
        quickAddVisibleRef.current = quickAddVisible;
    }, [quickAddVisible]);

    useTourSheet("quickAdd", quickAddVisible);

    useEffect(() => {
        if (isLoading) return;
        setTourContext({ cashbookCount: businesses.length, transactionCount: transactions.length });
    }, [isLoading, businesses.length, transactions.length]);

    useEffect(() => {
        setTourNavigator((tab) => {
            if (navigationRef.isReady()) navigationRef.navigate(tab);
        });
        const unsubscribe = onTourEnd((id, outcome) => {
            if (id !== "journey" || outcome !== "finished") return;
            setTimeout(() => maybeRequestReview({ kind: "tour_completed" }), 600);
        });
        return () => {
            setTourNavigator(null);
            unsubscribe();
        };
    }, []);

    useEffect(() => {
        const openFromUrl = (url: string | null) => {
            const link = parseQuickAddLink(url);
            if (!link) return;
            if (quickAddVisibleRef.current) return; // don't hijack an already-open modal
            setQuickAddBusinessId(link.businessId ?? undefined);
            setQuickAddVisible(true);
        };
        Linking.getInitialURL()
            .then(openFromUrl)
            .catch(() => {});
        const sub = Linking.addEventListener("url", (e) => openFromUrl(e.url));
        return () => sub.remove();
    }, []);

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
        const removedIds = businesses
            .filter((b) => !newBusinesses.some((n) => n.id === b.id))
            .map((b) => b.id);
        setBusinesses(newBusinesses);
        await saveBusinesses(newBusinesses);
        if (removedIds.length) await deleteBudgetsForBusinesses(removedIds);
        for (const id of removedIds) await removeMappingsForBusiness(id);
        await refreshCashbookWidgets();
    };

    const handleSaveTransactions = async (newTransactions: Transaction[], opts?: { silent?: boolean }) => {
        setTransactions(newTransactions);
        await saveTransactions(newTransactions, opts?.silent ? undefined : { prev: transactions });
        await refreshCashbookWidgets();
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

    const drainingRef = useRef(false);
    const drainPendingRef = useRef(false);

    const runDrain = useCallback(async () => {
        if (Platform.OS !== "android" || !autoLogNative.isAvailable()) return;
        if (drainingRef.current) {
            drainPendingRef.current = true;
            return;
        }
        drainingRef.current = true;
        try {
            do {
                drainPendingRef.current = false;
                try {
                    const result = await drainNativeQueue();
                    if (result.saved > 0 || result.queued > 0) {
                        await refreshData();
                    }
                    if (result.saved > 0) {
                        await refreshCashbookWidgets();
                    }
                } catch {
                    // swallow — drain errors must not crash the UI
                }
            } while (drainPendingRef.current);
        } finally {
            drainingRef.current = false;
        }
    }, [refreshData]);

    useEffect(() => {
        if (isLoading || Platform.OS !== "android" || !autoLogNative.isAvailable()) return;
        runDrain();
        const stateSub = AppState.addEventListener("change", (next) => {
            if (next === "active") runDrain();
        });
        const liveSub = autoLogNative.subscribe(() => {
            runDrain();
        });
        return () => {
            stateSub.remove();
            liveSub.remove();
        };
    }, [isLoading, runDrain]);

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
                <TourShield>
                    <NavigationContainer
                        ref={navigationRef}
                        theme={isDark ? MyDarkTheme : MyDefaultTheme}
                        onReady={syncTourTab}
                        onStateChange={syncTourTab}
                    >
                        <Tab.Navigator
                            tabBar={(props) =>
                                currentBusiness ? null : (
                                    <FloatingTabBar {...props} onQuickAdd={() => setQuickAddVisible(true)} />
                                )
                            }
                            screenOptions={{
                                headerShown: false,
                                tabBarShowLabel: false,
                            }}
                        >
                            <Tab.Screen
                                name="Dashboard"
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
                                listeners={{
                                    tabPress: () => setCurrentBusiness(null),
                                }}
                            >
                                {() => (
                                    <BusinessesScreen
                                        businesses={businesses}
                                        transactions={transactions}
                                        saveBusinesses={handleSaveBusinesses}
                                        saveTransactions={handleSaveTransactions}
                                        currentBusiness={currentBusiness}
                                        setCurrentBusiness={setCurrentBusiness}
                                    />
                                )}
                            </Tab.Screen>
                            <Tab.Screen
                                name="Budget"
                                listeners={{
                                    tabPress: () => setCurrentBusiness(null),
                                }}
                            >
                                {() => (
                                    <BudgetDashboardScreen
                                        businesses={businesses}
                                        transactions={transactions}
                                        currentBusiness={currentBusiness}
                                    />
                                )}
                            </Tab.Screen>
                            <Tab.Screen
                                name="Settings"
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
                </TourShield>
                <QuickAddModal
                    visible={quickAddVisible}
                    businesses={businesses}
                    initialBusinessId={quickAddBusinessId}
                    onClose={() => {
                        setQuickAddVisible(false);
                        setQuickAddBusinessId(undefined);
                    }}
                    onCreate={(tx) => handleSaveTransactions([...transactions, tx])}
                />
                <TourHost />
            </View>
        </SafeAreaProvider>
    );
}

