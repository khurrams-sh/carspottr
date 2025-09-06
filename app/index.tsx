import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  withRepeat, 
  withSequence,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  SlideInUp
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const Star = ({ delay = 0, size = 2 }) => {
  const style = useAnimatedStyle(() => ({
    opacity: withRepeat(
      withSequence(
        withDelay(delay, withTiming(0.8, { duration: 1000 })),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    ),
    transform: [{
      scale: withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(0.8, { duration: 1000 })
        ),
        -1,
        true
      )
    }]
  }));

  return (
    <Animated.View
      style={[
        styles.star,
        style,
        {
          width: size,
          height: size,
          left: Math.random() * width,
          top: Math.random() * height * 0.7,
        }
      ]}
    />
  );
};

const Logo = () => {
  const spottrStyle = useAnimatedStyle(() => ({
    opacity: withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0.7, { duration: 2000 })
      ),
      -1,
      true
    ),
  }));

  return (
    <View style={styles.logoContainer}>
      <Text style={styles.logoTextCar}>CAR</Text>
      <Animated.Text style={[styles.logoTextSpottr, spottrStyle]}>SPOTTR</Animated.Text>
      <View style={styles.logoAccent} />
    </View>
  );
};

const Moon = () => {
  const style = useAnimatedStyle(() => ({
    transform: [{
      rotate: withRepeat(
        withTiming('5deg', { 
          duration: 4000,
          easing: Easing.inOut(Easing.ease)
        }),
        -1,
        true
      )
    }]
  }));

  return (
    <Animated.View style={[styles.moonContainer, style]}>
      <View style={styles.moon}>
        <View style={styles.moonCrater1} />
        <View style={styles.moonCrater2} />
      </View>
    </Animated.View>
  );
};

const ShootingStar = ({ delay = 0, duration = 1500, startPosition = { x: 0, y: 0 } }) => {
  const style = useAnimatedStyle(() => ({
    transform: [{
      translateX: withRepeat(
        withDelay(
          delay,
          withTiming(-width * 1.5, { 
            duration,
            easing: Easing.linear
          })
        ),
        -1,
        delay * 2
      )
    }, {
      translateY: withRepeat(
        withDelay(
          delay,
          withTiming(height * 0.5, { 
            duration,
            easing: Easing.linear
          })
        ),
        -1,
        delay * 2
      )
    }, {
      rotate: '-35deg'
    }],
    opacity: withRepeat(
      withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: duration * 0.1 }),
          withTiming(1, { duration: duration * 0.7 }),
          withTiming(0, { duration: duration * 0.2 })
        )
      ),
      -1,
      false
    )
  }));

  return (
    <Animated.View 
      style={[
        styles.shootingStar,
        style,
        {
          left: startPosition.x,
          top: startPosition.y,
        }
      ]}
    >
      <View style={styles.shootingStarTail} />
    </Animated.View>
  );
};

const FeatureItem = ({ icon, text, delay }) => {
  return (
    <Animated.View 
      entering={SlideInUp.delay(delay).springify()}
      style={styles.featureItem}
    >
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={22} color="#6C63FF" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </Animated.View>
  );
};

export default function LandingScreen() {
  const stars = useMemo(() => 
    Array.from({ length: 50 }).map((_, i) => (
      <Star 
        key={i} 
        delay={Math.random() * 2000}
        size={Math.random() * 2 + 1}
      />
    )),
    []
  );

  const shootingStars = useMemo(() => 
    Array.from({ length: 5 }).map((_, i) => (
      <ShootingStar 
        key={i} 
        delay={i * 3000} 
        duration={1500 + Math.random() * 1000}
        startPosition={{
          x: width * (0.5 + Math.random() * 0.5),
          y: height * (Math.random() * 0.3)
        }}
      />
    )),
    []
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0B1F', '#141537', '#0A0B1F']}
        style={styles.background}
      >
        {stars}
        {shootingStars}
        <Moon />

        <Animated.View 
          entering={FadeIn.duration(1000)}
          style={styles.content}
        >
          <Logo />
          
          <View style={styles.taglineContainer}>
            <Text style={styles.primaryTagline}>Spot. Scan. Collect.</Text>
            <Text style={styles.secondaryTagline}>
              Instantly identify any car and get complete specs through AI
            </Text>
          </View>
          
          <View style={styles.featuresContainer}>
            <FeatureItem 
              icon="scan-outline" 
              text="Identify any car with AI" 
              delay={300}
            />
            <FeatureItem 
              icon="trophy-outline" 
              text="Build your collection" 
              delay={400}
            />
            <FeatureItem 
              icon="people-outline" 
              text="Connect with enthusiasts" 
              delay={500}
            />
          </View>
          
          <Animated.View 
            entering={FadeIn.delay(600)}
            style={styles.buttonContainer}
          >
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed
              ]}
              onPress={() => router.push('/auth')}
            >
              <Text style={styles.buttonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" style={styles.buttonIcon} />
            </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  logoTextCar: {
    fontSize: 44,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 3,
    marginBottom: -6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  logoTextSpottr: {
    fontSize: 44,
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
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  primaryTagline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  secondaryTagline: {
    fontSize: 16,
    color: '#ffffffcc',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: 40,
    width: '100%',
    maxWidth: 320,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff11',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C63FF22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
  },
  button: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  moonContainer: {
    position: 'absolute',
    top: height * 0.15,
    right: width * 0.15,
  },
  moon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  moonCrater1: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  moonCrater2: {
    position: 'absolute',
    top: '50%',
    right: '25%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f0f0f0',
  },
  shootingStar: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#ffffff',
    borderRadius: 1.5,
  },
  shootingStarTail: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
    opacity: 0.6,
    transform: [{ translateX: 10 }],
  },
});