import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initializePurchases } from '../lib/purchases';

export default function RootLayout() {
  useEffect(() => {
    initializePurchases();
  }, []);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 200,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen 
          name="auth-success" 
          options={{
            animation: 'slide_from_right',
            animationDuration: 300,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}