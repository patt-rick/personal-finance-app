import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { LayoutGrid, Landmark, Settings } from 'lucide-react-native';
import DashboardScreen from './src/screens/DashboardScreen';
import BusinessesScreen from './src/screens/BusinessesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SplashScreen from './src/screens/SplashScreen';
import { Business, Transaction, UserProfile } from './src/types';
import { theme } from './src/theme/theme';
import { 
  loadBusinesses, 
  saveBusinesses, 
  loadTransactions, 
  saveTransactions,
  loadUserProfile,
  saveUserProfile as apiSaveUserProfile 
} from './src/utils/storage';

const Tab = createBottomTabNavigator();

export default function App() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);

  useEffect(() => {
    async function loadData() {
      const loadedBusinesses = await loadBusinesses();
      const loadedTransactions = await loadTransactions();
      const loadedProfile = await loadUserProfile();
      setBusinesses(loadedBusinesses);
      setTransactions(loadedTransactions);
      setUserProfile(loadedProfile);
      setIsLoading(false);
    }
    loadData();
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

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" backgroundColor={theme.colors.primary} translucent={false} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: styles.tabBar,
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
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    paddingBottom: 12,
    paddingTop: 8,
    borderTopColor: '#f0f0f0',
  },
});
