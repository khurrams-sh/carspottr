import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY!,
};

export const initializePurchases = async () => {
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'android') return;

  try {
    await Purchases.configure({
      apiKey: API_KEYS.ios,
      appUserID: null, // RevenueCat will generate a unique ID
    });

    // Enable debug logs in development
    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }
  } catch (error) {
    console.error('Failed to configure RevenueCat:', error);
  }
};

export const getOfferings = async () => {
  if (Platform.OS === 'web') return null;
  if (Platform.OS === 'android') return null;
  
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Error getting offerings:', error);
    return null;
  }
};

export const purchasePackage = async (packageToPurchase: PurchasesPackage) => {
  if (Platform.OS === 'web') return null;
  if (Platform.OS === 'android') return null;

  try {
    const { customerInfo, productIdentifier } = await Purchases.purchasePackage(packageToPurchase);
    
    // Check if user has active subscription
    const isPro = customerInfo.entitlements.active['pro_features'];
    
    return {
      customerInfo,
      isPro: !!isPro,
      productIdentifier
    };
  } catch (error: any) {
    if (!error.userCancelled) {
      console.error('Error purchasing package:', error);
    }
    throw error;
  }
};