import { View, Text, StyleSheet, Pressable, Platform, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useRef, useState, useCallback } from 'react';
import { openai } from '../../lib/openai';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeOut, 
  SlideInUp, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming, 
  Easing,
  ZoomIn,
  ZoomOut
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

type CarAnalysis = {
  make: string;
  model: string;
  year: number;
  performance: string;
  features: string;
  rarity: string;
  value_range: string;
  trivia: string;
};

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ analysis: CarAnalysis } | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const scanButtonScale = useSharedValue(1);
  const scanRingOpacity = useSharedValue(0);
  const scanRingScale = useSharedValue(1);
  const scanPulseOpacity = useSharedValue(0);
  const scanPulseScale = useSharedValue(1);
  const [scanningProgress, setScanningProgress] = useState(0);
  const [scanningMessage, setScanningMessage] = useState('Analyzing image...');

  useEffect(() => {
    (async () => {
      // Request camera permission
      if (Platform.OS === 'web') {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            }
          });
          setStream(mediaStream);
          setHasPermission(true);

          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.setAttribute('playsinline', 'true');
            await videoRef.current.play();
          }
        } catch (err) {
          console.error('Camera permission error:', err);
          setHasPermission(false);
        }
      } else {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      }

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({});
          const [place] = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          
          if (place) {
            const locationParts = [
              place.city,
              place.region,
              place.country
            ].filter(Boolean);
            setLocation(locationParts.join(', '));
          }
        } catch (error) {
          console.error('Error getting location:', error);
          setLocation('Unknown Location');
        }
      } else {
        setLocation('Location not available');
      }
    })();

    if (Platform.OS === 'web') {
      canvasRef.current = document.createElement('canvas');
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Simulate scanning progress
  useEffect(() => {
    if (scanning) {
      const messages = [
        'Analyzing image...',
        'Identifying vehicle...',
        'Detecting make and model...',
        'Analyzing features...',
        'Determining rarity...',
        'Gathering specifications...',
        'Almost there...'
      ];
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        if (progress <= 100) {
          setScanningProgress(progress);
          
          // Update message at certain progress points
          if (progress % 15 === 0) {
            const messageIndex = Math.floor(progress / 15) % messages.length;
            setScanningMessage(messages[messageIndex]);
          }
        } else {
          clearInterval(interval);
        }
      }, 200);
      
      // Start the pulse animation
      scanPulseOpacity.value = 0.7;
      
      const startPulseAnimation = () => {
        scanPulseScale.value = withTiming(1.5, { duration: 1000 }, () => {
          scanPulseScale.value = 1;
          scanPulseOpacity.value = withTiming(0.7, { duration: 300 }, () => {
            if (scanning) {
              startPulseAnimation();
            }
          });
        });
      };
      
      startPulseAnimation();
      
      return () => {
        clearInterval(interval);
        scanPulseOpacity.value = 0;
      };
    }
  }, [scanning]);

  const parseAnalysisResponse = (content: string): CarAnalysis => {
    // Extract information from the formatted response
    const makeModelMatch = content.match(/🚗 Make & Model: (.+)/);
    const yearMatch = content.match(/📅 Year: (\d{4})/);
    const performanceMatch = content.match(/🏎️ Performance: (.+)/);
    const featuresMatch = content.match(/💫 Notable Features: (.+)/);
    const rarityMatch = content.match(/💎 Rarity: (.+)/);
    const valueMatch = content.match(/💰 Estimated Value Range: (.+)/);
    
    // Extract make and model from the combined string
    const makeModel = makeModelMatch?.[1].split(' ') || [];
    const make = makeModel[0] || 'Unknown';
    const model = makeModel.slice(1).join(' ') || 'Unknown';

    // Find trivia section (everything after the structured data)
    const sections = content.split('\n\n');
    const trivia = sections[sections.length - 1] || '';

    return {
      make,
      model,
      year: parseInt(yearMatch?.[1] || '0', 10) || 0,
      performance: performanceMatch?.[1] || '',
      features: featuresMatch?.[1] || '',
      rarity: rarityMatch?.[1] || 'Common',
      value_range: valueMatch?.[1] || '',
      trivia
    };
  };

  const analyzeImage = async (base64Image: string) => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "You are an expert automotive analyst with deep knowledge of cars. I'll show you a car image, and I need you to analyze it in detail. Even if you're not 100% certain, provide your best analysis based on visible features and characteristics.\n\n" +
                    "If you can identify the exact model, provide precise details. If not, describe what you can see and make educated guesses based on visible features (body style, design elements, badges, etc.).\n\n" +
                    "Format your response exactly like this:\n\n" +
                    "🚗 Make & Model: [Make and full model name - if uncertain, provide your best guess and note why]\n" +
                    "📅 Year: [Year or year range - specify if it's an estimate]\n" +
                    "🏎️ Performance: [Engine specs, horsepower, 0-60 time, top speed - be specific if known, or provide typical specs for this type of vehicle]\n" +
                    "💫 Notable Features: [Key design elements, technology, unique characteristics you can see]\n" +
                    "💎 Rarity: [Use one of these tiers based on production numbers, value, and historical significance:\n" +
                    "- Bronze: Common production cars\n" +
                    "- Silver: Limited production or special editions\n" +
                    "- Gold: Rare models, high-performance variants\n" +
                    "- Platinum: Very rare, exotic or limited production supercars\n" +
                    "- Diamond: Ultra-rare hypercars or significant historical models\n" +
                    "- Master: Extremely rare, one-of-few production models\n" +
                    "- Grandmaster: One-offs or historically important prototypes]\n" +
                    "💰 Estimated Value Range: [Current market value range - if uncertain, provide range for similar vehicles]\n\n" +
                    "Then add interesting technical details, historical significance, or notable facts about this model or similar vehicles in this category. If you're making educated guesses, explain your reasoning based on visible features."
            },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');
    
    return parseAnalysisResponse(content);
  };

  const saveToCollection = async () => {
    if (!result) return;

    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }

      // Save spot to database
      const { error: spotError } = await supabase
        .from('spots')
        .insert({
          user_id: user.id,
          location: location || 'Unknown Location',
          ...result.analysis
        });

      if (spotError) throw spotError;

      // Navigate to collection
      router.push('/(tabs)/collection');
    } catch (error) {
      console.error('Error saving spot:', error);
      // TODO: Show error message to user
    } finally {
      setSaving(false);
    }
  };

  const handleScan = async () => {
    if (scanning) return;
    try {
      setScanning(true);
      setResult(null);
      
      // Animate scan button
      scanButtonScale.value = withSpring(0.9, { damping: 12 });
      scanRingOpacity.value = withTiming(0.8, { duration: 300 });
      scanRingScale.value = withTiming(1.8, { duration: 1000 });
      
      setTimeout(() => {
        scanButtonScale.value = withSpring(1, { damping: 12 });
        scanRingOpacity.value = withTiming(0, { duration: 300 });
        scanRingScale.value = withTiming(1, { duration: 300 });
      }, 800);

      let base64Image: string | undefined;
      
      if (Platform.OS === 'web') {
        if (!videoRef.current || !canvasRef.current) throw new Error('Camera not ready');
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        base64Image = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      } else {
        if (!cameraRef.current) throw new Error('Camera not ready');

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: true,
        });

        if (!photo.base64) throw new Error('Failed to capture image');
        base64Image = photo.base64;
      }

      if (!base64Image) throw new Error('Failed to process image');
      
      const analysis = await analyzeImage(base64Image);
      setResult({ analysis });
    } catch (error: any) {
      console.error('Scan error:', error);
      setResult(null);
    } finally {
      setScanning(false);
    }
  };

  const pickImage = async () => {
    try {
      setShowGallery(false);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setScanning(true);
        const analysis = await analyzeImage(result.assets[0].base64);
        setResult({ analysis });
      }
    } catch (error) {
      console.error('Error picking image:', error);
    } finally {
      setScanning(false);
    }
  };

  const scanButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scanButtonScale.value }]
  }));

  const scanRingStyle = useAnimatedStyle(() => ({
    opacity: scanRingOpacity.value,
    transform: [{ scale: scanRingScale.value }]
  }));

  const scanPulseStyle = useAnimatedStyle(() => ({
    opacity: scanPulseOpacity.value,
    transform: [{ scale: scanPulseScale.value }]
  }));

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#0A0B1F', '#141537', '#0A0B1F']}
          style={styles.background}
        >
          <View style={styles.permissionContainer}>
            <Animated.View 
              entering={FadeInDown.delay(300)}
              style={styles.permissionIconContainer}
            >
              <Ionicons name="camera-off-outline" size={64} color="#ffffff44" />
            </Animated.View>
            <Animated.Text 
              entering={FadeInDown.delay(400)}
              style={styles.permissionTitle}
            >
              Camera Access Required
            </Animated.Text>
            <Animated.Text 
              entering={FadeInDown.delay(500)}
              style={styles.permissionText}
            >
              Please enable camera access in your device settings to scan cars
            </Animated.Text>
            <Animated.View entering={FadeInDown.delay(600)}>
              <Pressable
                style={({ pressed }) => [
                  styles.permissionButton,
                  pressed && styles.buttonPressed
                ]}
                onPress={() => router.push('/(tabs)/collection')}
              >
                <Text style={styles.permissionButtonText}>View My Collection</Text>
              </Pressable>
            </Animated.View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        {Platform.OS === 'web' ? (
          <video
            ref={videoRef as any}
            style={styles.camera}
            autoPlay
            playsInline
            muted
          />
        ) : (
          hasPermission && (
            <Camera
              ref={cameraRef}
              style={styles.camera}
              type={CameraType.back}
              ratio="16:9"
            />
          )
        )}
      </View>

      <View style={styles.overlay}>
        {!result && (
          <View style={styles.header}>
            <Pressable 
              style={styles.tipButton}
              onPress={() => setShowTips(true)}
            >
              <Ionicons name="information-circle-outline" size={24} color="#ffffff" />
            </Pressable>
            
            <Pressable 
              style={styles.galleryButton}
              onPress={() => setShowGallery(true)}
            >
              <Ionicons name="images-outline" size={24} color="#ffffff" />
            </Pressable>
          </View>
        )}

        {location && !result && (
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color="#ffffff" />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        )}

        {result ? (
          <Animated.View 
            entering={SlideInUp.springify().damping(15)}
            style={styles.result}
          >
            <View style={styles.resultHeader}>
              <View style={[
                styles.rarityBadge,
                result.analysis.rarity === 'Bronze' && styles.bronzeBadge,
                result.analysis.rarity === 'Silver' && styles.silverBadge,
                result.analysis.rarity === 'Gold' && styles.goldBadge,
                result.analysis.rarity === 'Platinum' && styles.platinumBadge,
                result.analysis.rarity === 'Diamond' && styles.diamondBadge,
                result.analysis.rarity === 'Master' && styles.masterBadge,
                result.analysis.rarity === 'Grandmaster' && styles.grandmasterBadge,
              ]}>
                <Text style={[
                  styles.rarityText,
                  result.analysis.rarity === 'Bronze' && styles.bronzeText,
                  result.analysis.rarity === 'Silver' && styles.silverText,
                  result.analysis.rarity === 'Gold' && styles.goldText,
                  result.analysis.rarity === 'Platinum' && styles.platinumText,
                  result.analysis.rarity === 'Diamond' && styles.diamondText,
                  result.analysis.rarity === 'Master' && styles.masterText,
                  result.analysis.rarity === 'Grandmaster' && styles.grandmasterText,
                ]}>{result.analysis.rarity}</Text>
              </View>
              <Text style={styles.resultTitle}>
                {result.analysis.year} {result.analysis.make} {result.analysis.model}
              </Text>
            </View>
            <ScrollView style={styles.resultScroll}>
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>Performance</Text>
                <Text style={styles.resultInfo}>{result.analysis.performance}</Text>
              </View>
              
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>Notable Features</Text>
                <Text style={styles.resultInfo}>{result.analysis.features}</Text>
              </View>
              
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>Value Range</Text>
                <Text style={styles.resultInfo}>{result.analysis.value_range}</Text>
              </View>
              
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>Interesting Facts</Text>
                <Text style={styles.resultInfo}>{result.analysis.trivia}</Text>
              </View>
            </ScrollView>
            <View style={styles.buttonRow}>
              <Pressable 
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setResult(null)}
              >
                <Ionicons name="scan-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Scan Again</Text>
              </Pressable>
              <Pressable 
                style={[styles.button, saving && styles.buttonDisabled]}
                onPress={saveToCollection}
                disabled={saving}
              >
                <Ionicons name="add-circle-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>
                  {saving ? 'Saving...' : 'Add to Collection'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.scanContainer}>
            <Animated.View style={[styles.scanRing, scanRingStyle]} />
            <Animated.View style={[styles.scanPulse, scanPulseStyle]} />
            <Animated.View style={[styles.scanButtonContainer, scanButtonStyle]}>
              <Pressable 
                style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
                onPress={handleScan}
                disabled={scanning}
              >
                {scanning ? (
                  <View style={styles.scanningContainer}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.scanningProgressText}>{scanningProgress}%</Text>
                  </View>
                ) : (
                  <Ionicons name="scan-outline" size={32} color="#ffffff" />
                )}
              </Pressable>
            </Animated.View>
            <Text style={styles.scanText}>
              {scanning ? scanningMessage : 'Tap to scan car'}
            </Text>
          </View>
        )}
      </View>

      {showGallery && (
        <Animated.View 
          entering={FadeIn}
          exiting={FadeOut}
          style={styles.modalOverlay}
        >
          <BlurView intensity={30} tint="dark" style={styles.blurView}>
            <Animated.View 
              entering={ZoomIn.springify()}
              style={styles.galleryModal}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Image</Text>
                <Pressable 
                  style={styles.modalCloseButton}
                  onPress={() => setShowGallery(false)}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </Pressable>
              </View>
              <View style={styles.modalContent}>
                <Pressable 
                  style={styles.galleryOption}
                  onPress={pickImage}
                >
                  <View style={styles.galleryOptionIcon}>
                    <Ionicons name="images" size={32} color="#6C63FF" />
                  </View>
                  <Text style={styles.galleryOptionText}>Choose from Gallery</Text>
                </Pressable>
              </View>
            </Animated.View>
          </BlurView>
        </Animated.View>
      )}

      {showTips && (
        <Animated.View 
          entering={FadeIn}
          exiting={FadeOut}
          style={styles.modalOverlay}
        >
          <BlurView intensity={30} tint="dark" style={styles.blurView}>
            <Animated.View 
              entering={ZoomIn.springify()}
              style={styles.tipsModal}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Scanning Tips</Text>
                <Pressable 
                  style={styles.modalCloseButton}
                  onPress={() => setShowTips(false)}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </Pressable>
              </View>
              <ScrollView style={styles.modalContent}>
                <View style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <Ionicons name="sunny" size={24} color="#6C63FF" />
                  </View>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>Good Lighting</Text>
                    <Text style={styles.tipText}>Scan cars in good lighting conditions for better results</Text>
                  </View>
                </View>
                
                <View style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <Ionicons name="resize" size={24} color="#6C63FF" />
                  </View>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>Clear View</Text>
                    <Text style={styles.tipText}>Capture the entire car or a distinctive angle</Text>
                  </View>
                </View>
                
                <View style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <Ionicons name="car" size={24} color="#6C63FF" />
                  </View>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>Include Badges</Text>
                    <Text style={styles.tipText}>Try to include make/model badges in your scan</Text>
                  </View>
                </View>
                
                <View style={styles.tipItem}>
                  <View style={styles.tipIcon}>
                    <Ionicons name="hand-left" size={24} color="#6C63FF" />
                  </View>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>Hold Steady</Text>
                    <Text style={styles.tipText}>Keep your device steady when scanning</Text>
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          </BlurView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 10,
  },
  tipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 20,
    marginLeft: 10,
    gap: 6,
  },
  locationText: {
    color: '#ffffff',
    fontSize: 14,
  },
  scanContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanButtonContainer: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  scanButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  scanButtonDisabled: {
    backgroundColor: '#5149CC',
  },
  scanRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#6C63FF',
    opacity: 0,
  },
  scanPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(108, 99, 255, 0.3)',
    opacity: 0,
  },
  scanningContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningProgressText: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  scanText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  result: {
    backgroundColor: 'rgba(10,11,31,0.9)',
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
    marginTop: 'auto',
    marginBottom: Platform.OS === 'ios' ? 100 : 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
  },
  resultHeader: {
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  resultScroll: {
    marginBottom: 20,
  },
  resultSection: {
    marginBottom: 16,
  },
  resultSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6C63FF',
    marginBottom: 8,
  },
  resultInfo: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#6C63FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonSecondary: {
    backgroundColor: '#ffffff22',
  },
  buttonDisabled: {
    backgroundColor: '#6C63FF88',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryModal: {
    width: '80%',
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffffff22',
  },
  tipsModal: {
    width: '80%',
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffffff22',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff11',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  galleryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff11',
    borderRadius: 12,
  },
  galleryOptionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff11',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  galleryOptionText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#ffffff11',
    borderRadius: 12,
    padding: 16,
  },
  tipIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff11',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#ffffff99',
    lineHeight: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff11',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#ffffff99',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 280,
  },
  permissionButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    backgroundColor: '#5149CC',
    transform: [{ scale: 0.98 }],
  },
  rarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff22',
    alignSelf: 'flex-start',
  },
  bronzeBadge: {
    backgroundColor: '#CD7F3222',
    borderWidth: 1,
    borderColor: '#CD7F32',
  },
  silverBadge: {
    backgroundColor: '#C0C0C022',
    borderWidth: 1,
    borderColor: '#C0C0C0',
  },
  goldBadge: {
    backgroundColor: '#FFD70022',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  platinumBadge: {
    backgroundColor: '#E5E4E222',
    borderWidth: 1,
    borderColor: '#E5E4E2',
  },
  diamondBadge: {
    backgroundColor: '#B9F2FF22',
    borderWidth: 1,
    borderColor: '#B9F2FF',
  },
  masterBadge: {
    backgroundColor: '#9370DB22',
    borderWidth: 1,
    borderColor: '#9370DB',
  },
  grandmasterBadge: {
    backgroundColor: '#FF450022',
    borderWidth: 1,
    borderColor: '#FF4500',
  },
  rarityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  bronzeText: {
    color: '#CD7F32',
  },
  silverText: {
    color: '#C0C0C0',
  },
  goldText: {
    color: '#FFD700',
  },
  platinumText: {
    color: '#E5E4E2',
  },
  diamondText: {
    color: '#B9F2FF',
  },
  masterText: {
    color: '#9370DB',
  },
  grandmasterText: {
    color: '#FF4500',
  },
});