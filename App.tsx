import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TrendingUp, Plus, Building2 } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

import DashboardScreen from './src/screens/DashboardScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import BusinessesScreen from './src/screens/BusinessesScreen';
import { loadBusinesses, loadTransactions, saveBusinesses, saveTransactions } from './src/utils/storage';
import { styles } from './src/styles/globalStyles';
import { theme } from './src/theme/theme';
import { Business, Transaction } from './src/types';

const Tab = createBottomTabNavigator();

export default function App() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const businessesData = await loadBusinesses();
    const transactionsData = await loadTransactions();
    
    if (businessesData) setBusinesses(businessesData);
    if (transactionsData) setTransactions(transactionsData);
  };

  const handleSaveBusinesses = async (data: Business[]) => {
    await saveBusinesses(data);
    setBusinesses(data);
  };

  const handleSaveTransactions = async (data: Transaction[]) => {
    await saveTransactions(data);
    setTransactions(data);
  };

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            headerStyle: styles.header,
            headerTitleStyle: styles.headerTitle,
          }}
        >
          <Tab.Screen 
            name="Dashboard" 
            options={{
              tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />,
            }}
          >
            {() => (
              <DashboardScreen 
                businesses={businesses}
                transactions={transactions}
                currentBusiness={currentBusiness}
                setCurrentBusiness={setCurrentBusiness}
              />
            )}
          </Tab.Screen>
          <Tab.Screen 
            name="Transactions"
            options={{
              tabBarIcon: ({ color }) => <Plus size={24} color={color} />,
            }}
          >
            {() => (
              <TransactionsScreen 
                businesses={businesses}
                transactions={transactions}
                saveTransactions={handleSaveTransactions}
                currentBusiness={currentBusiness}
              />
            )}
          </Tab.Screen>
          <Tab.Screen 
            name="Businesses"
            options={{
              tabBarIcon: ({ color }) => <Building2 size={24} color={color} />,
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
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}
