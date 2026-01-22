import AsyncStorage from '@react-native-async-storage/async-storage';
import { Business, Transaction } from '../types';

const STORAGE_KEYS = {
  BUSINESSES: '@businesses',
  TRANSACTIONS: '@transactions',
};

export const loadBusinesses = async (): Promise<Business[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BUSINESSES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading businesses:', error);
    return [];
  }
};

export const saveBusinesses = async (businesses: Business[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.BUSINESSES, JSON.stringify(businesses));
    return true;
  } catch (error) {
    console.error('Error saving businesses:', error);
    return false;
  }
};

export const loadTransactions = async (): Promise<Transaction[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading transactions:', error);
    return [];
  }
};

export const saveTransactions = async (transactions: Transaction[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    return true;
  } catch (error) {
    console.error('Error saving transactions:', error);
    return false;
  }
};
