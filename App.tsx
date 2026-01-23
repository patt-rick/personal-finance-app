import React, { useState, useEffect } from "react";
import { View, StyleSheet, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LayoutGrid, Landmark, Settings } from "lucide-react-native";
import DashboardScreen from "./src/screens/DashboardScreen";
import BusinessesScreen from "./src/screens/BusinessesScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import SplashScreen from "./src/screens/SplashScreen";
import { Business, Transaction, UserProfile } from "./src/types";
import { useTheme } from "./src/theme/theme";
import { ThemeProvider, useThemeContext } from "./src/theme/ThemeContext";
import {
    loadBusinesses,
    saveBusinesses,
    loadTransactions,
    saveTransactions,
    loadUserProfile,
    saveUserProfile as apiSaveUserProfile,
} from "./src/utils/storage";
import { scheduleReminders } from "./src/utils/notifications";

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
    const [isLoading, setIsLoading] = useState(true);
    const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
    const { themeMode, theme } = useThemeContext();
    const systemColorScheme = useColorScheme();

    const isDark = themeMode === "system" ? systemColorScheme === "dark" : themeMode === "dark";

    useEffect(() => {
        async function loadData() {
            const startTime = Date.now();

            const loadedBusinesses = await loadBusinesses();
            const loadedTransactions = await loadTransactions();
            const loadedProfile = await loadUserProfile();

            setBusinesses(loadedBusinesses);
            setTransactions(loadedTransactions);
            setUserProfile(loadedProfile);

            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, 3000 - elapsedTime);

            setTimeout(() => {
                setIsLoading(false);
            }, remainingTime);
        }
        loadData();
        scheduleReminders();
    }, []);

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

    if (isLoading) {
        return <SplashScreen />;
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
                                    saveBusinesses={handleSaveBusinesses}
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
