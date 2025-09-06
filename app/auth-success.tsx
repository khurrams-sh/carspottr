import { View, Text, StyleSheet, TextInput, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInRight,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  useAnimatedStyle,
  runOnJS,
  Easing,
  ZoomIn
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export default function AuthSuccessScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSequence(
          withTiming(0.8, { duration: 200 }),
          withSpring(1.1),
          withSpring(1)
        )
      }
    ]
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: withDelay(400, withTiming(1, { duration: 300 })),
    transform: [
      {
        scale: withDelay(400, withSpring(1, { 
          damping: 12,
          stiffness: 100 
        }))
      },
      {
        translateY: withDelay(400, withSpring(0, {
          damping: 12,
          stiffness: 100
        }))
      }
    ]
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: withDelay(600, withSequence(
      withTiming(0.6, { duration: 500 }),
      withTiming(0.2, { duration: 500 })
    )),
    transform: [
      {
        scale: withDelay(600, withSequence(
          withTiming(1.5, { duration: 500 }),
          withTiming(1.2, { duration: 500 })
        ))
      }
    ]
  }));

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      // Insert new profile, if conflict then update
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          full_name: name.trim(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (upsertError) throw upsertError;
      
      router.push('/(tabs)');
    } catch (err: any) {
      console.error('Profile creation error:', err);
      setError(err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0B1F', '#141537', '#0A0B1F']}
        style={styles.background}
      >
        <Animated.View 
          entering={FadeIn.duration(1000)}
          style={styles.content}
        >
          <Animated.View 
            entering={SlideInRight.duration(800)}
            style={styles.successIcon}
          >
            <Animated.View style={[styles.iconGlow, glowStyle]} />
            <Animated.View style={[styles.iconCircle, circleStyle]}>
              <Animated.View style={[styles.checkmarkContainer, checkmarkStyle]}>
                <Ionicons name="checkmark-sharp" size={48} color="#ffffff" />
              </Animated.View>
            </Animated.View>
          </Animated.View>

          <View style={styles.logoContainer}>
            <View style={styles.logoInner}>
              <Text style={styles.logoTextCar}>CAR</Text>
              <Text style={styles.logoTextSpottr}>SPOTTR</Text>
              <View style={styles.logoAccent} />
            </View>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Welcome Aboard!</Text>
            <Text style={styles.subtitle}>
              Let's personalize your experience. What should we call you?
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#ffffff66" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#ffffff66"
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            {error && (
              <Animated.View 
                entering={FadeIn} 
                exiting={FadeOut}
                style={styles.errorContainer}
              >
                <Ionicons name="alert-circle" size={20} color="#ff4444" />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <Animated.View entering={FadeIn} style={styles.loadingContainer}>
                  <Ionicons name="sync" size={20} color="#ffffff" style={styles.loadingIcon} />
                  <Text style={styles.buttonText}>Please wait...</Text>
                </Animated.View>
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </Pressable>
          </View>

          <Animated.View 
            entering={ZoomIn.delay(1000)}
            style={styles.featuresContainer}
          >
            <Text style={styles.featuresTitle}>What's waiting for you:</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="scan-outline" size={20} color="#6C63FF" />
                </View>
                <Text style={styles.featureText}>Identify any car with AI</Text>
              </View>
              
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="car-sport-outline" size={20} color="#6C63FF" />
                </View>
                <Text style={styles.featureText}>Build your collection</Text>
              </View>
              
              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="people-outline" size={20} color="#6C63FF" />
                </View>
                <Text style={styles.featureText}>Connect with enthusiasts</Text>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#4CAF50',
    opacity: 0,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  checkmarkContainer: {
    opacity: 0,
    transform: [{ scale: 0.5 }, { translateY: 20 }],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoInner: {
    alignItems: 'center',
    position: 'relative',
  },
  logoTextCar: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 3,
    marginBottom: -6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  logoTextSpottr: {
    fontSize: 36,
    fontWeight: '900',
    color: '#6C63FF',
    letterSpacing: 3,
    textShadowColor: 'rgba(108, 99, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  logoAccent: {
    position: 'absolute',
    bottom: -8,
    width: '80%',
    height: 3,
    backgroundColor: '#6C63FF',
    borderRadius: 1.5,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff99',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff11',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffffff22',
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonPressed: {
    backgroundColor: '#5149CC',
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingIcon: {
    transform: [{ rotate: '0deg' }],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff444422',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#ff4444',
    flex: 1,
  },
  featuresContainer: {
    backgroundColor: '#ffffff11',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ffffff22',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C63FF22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    color: '#ffffffdd',
    fontSize: 15,
  },
});