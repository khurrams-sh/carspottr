import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { BlurView } from 'expo-blur';
import { Platform, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export default function TabLayout() {
  const activeTabValue = useSharedValue(0);
  
  const screenOptions = useMemo(() => ({
    headerShown: false,
    tabBarStyle: {
      backgroundColor: Platform.select({
        ios: 'transparent',
        android: '#1a1a2eee',
        default: '#1a1a2e'
      }),
      borderTopColor: '#ffffff11',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 85,
      paddingBottom: 25,
      paddingTop: 12,
      elevation: 0,
    },
    tabBarBackground: Platform.OS === 'ios' ? () => (
      <BlurView
        tint="dark"
        intensity={95}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
    ) : undefined,
    tabBarActiveTintColor: '#6C63FF',
    tabBarInactiveTintColor: '#ffffff66',
    tabBarIconStyle: {
      marginTop: 4,
    },
    tabBarLabelStyle: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '500',
    },
    tabBarItemStyle: {
      paddingVertical: 4,
    },
  }), []);

  return (
    <Tabs 
      screenOptions={screenOptions}
      screenListeners={{
        tabPress: (e) => {
          const target = e.target?.split('-')[0];
          if (target === 'index') activeTabValue.value = withSpring(0);
          else if (target === 'connect') activeTabValue.value = withSpring(1);
          else if (target === 'collection') activeTabValue.value = withSpring(2);
          else if (target === 'profile') activeTabValue.value = withSpring(3);
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          tabBarIcon: ({ size, color }) => (
            <Animated.View 
              entering={FadeIn}
              style={{ 
                backgroundColor: color === '#6C63FF' ? '#6C63FF22' : 'transparent',
                padding: 8,
                borderRadius: 12
              }}
            >
              <Ionicons name="scan" size={size} color={color} />
            </Animated.View>
          ),
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: 'Connect',
          tabBarIcon: ({ size, color }) => (
            <Animated.View 
              entering={FadeIn}
              style={{ 
                backgroundColor: color === '#6C63FF' ? '#6C63FF22' : 'transparent',
                padding: 8,
                borderRadius: 12
              }}
            >
              <Ionicons name="people" size={size} color={color} />
            </Animated.View>
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Collection',
          tabBarIcon: ({ size, color }) => (
            <Animated.View 
              entering={FadeIn}
              style={{ 
                backgroundColor: color === '#6C63FF' ? '#6C63FF22' : 'transparent',
                padding: 8,
                borderRadius: 12
              }}
            >
              <Ionicons name="car-sport" size={size} color={color} />
            </Animated.View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <Animated.View 
              entering={FadeIn}
              style={{ 
                backgroundColor: color === '#6C63FF' ? '#6C63FF22' : 'transparent',
                padding: 8,
                borderRadius: 12
              }}
            >
              <Ionicons name="person" size={size} color={color} />
            </Animated.View>
          ),
        }}
      />
    </Tabs>
  );
}