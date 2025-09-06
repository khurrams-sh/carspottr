import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Animated, { 
  FadeInDown, 
  SlideInRight, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming, 
  Easing,
  ZoomIn,
  FadeIn
} from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';

type Spot = {
  id: string;
  make: string;
  model: string;
  year: number;
  created_at: string;
  location: string;
  rarity: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster';
  performance: string;
  features: string;
  value_range: string;
  trivia: string;
};

// Mock car images based on make
const getCarImage = (make: string, model: string) => {
  const makeNormalized = make.toLowerCase();
  
  if (makeNormalized.includes('ferrari')) {
    return 'https://images.unsplash.com/photo-1592198084033-aade902d1aae?q=80&w=500&auto=format&fit=crop';
  } else if (makeNormalized.includes('lamborghini')) {
    return 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?q=80&w=500&auto=format&fit=crop';
  } else if (makeNormalized.includes('porsche')) {
    return 'https://images.unsplash.com/photo-1611651338412-8403fa6e3599?q=80&w=500&auto=format&fit=crop';
  } else if (makeNormalized.includes('bmw')) {
    return 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=500&auto=format&fit=crop';
  } else if (makeNormalized.includes('mercedes')) {
    return 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=500&auto=format&fit=crop';
  } else if (makeNormalized.includes('audi')) {
    return 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=500&auto=format&fit=crop';
  } else if (makeNormalized.includes('tesla')) {
    return 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?q=80&w=500&auto=format&fit=crop';
  } else if (makeNormalized.includes('ford')) {
    return 'https://images.unsplash.com/photo-1551830820-330a71b99659?q=80&w=500&auto=format&fit=crop';
  } else if (makeNormalized.includes('toyota')) {
    return 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?q=80&w=500&auto=format&fit=crop';
  } else if (makeNormalized.includes('honda')) {
    return 'https://images.unsplash.com/photo-1600793575654-910699b5e4d4?q=80&w=500&auto=format&fit=crop';
  } else {
    // Default image
    return 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=500&auto=format&fit=crop';
  }
};

export default function CollectionScreen() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'rarity'>('newest');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const detailsHeight = useSharedValue(0);
  const detailsOpacity = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const filterBarOpacity = useSharedValue(1);
  const filterMenuHeight = useSharedValue(0);

  const loadSpots = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }

      let query = supabase
        .from('spots')
        .select('*')
        .eq('user_id', user.id);
      
      if (rarityFilter) {
        query = query.eq('rarity', rarityFilter);
      }
      
      let { data, error } = await query;

      if (error) throw error;
      
      // Sort the data based on the selected option
      if (data) {
        if (sortOption === 'newest') {
          data = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sortOption === 'oldest') {
          data = data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        } else if (sortOption === 'rarity') {
          const rarityOrder = {
            'Grandmaster': 7,
            'Master': 6,
            'Diamond': 5,
            'Platinum': 4,
            'Gold': 3,
            'Silver': 2,
            'Bronze': 1
          };
          data = data.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
        }
      }
      
      setSpots(data || []);
    } catch (error) {
      console.error('Error loading spots:', error);
    } finally {
      setLoading(false);
    }
  }, [rarityFilter, sortOption]);

  useFocusEffect(
    useCallback(() => {
      loadSpots();
    }, [loadSpots])
  );

  const handleSpotPress = (spot: Spot) => {
    setSelectedSpot(spot);
    setShowDetails(true);
    detailsHeight.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
    });
    detailsOpacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    headerOpacity.value = withTiming(0, {
      duration: 200,
    });
    filterBarOpacity.value = withTiming(0, {
      duration: 200,
    });
  };

  const handleCloseDetails = () => {
    detailsHeight.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
    });
    detailsOpacity.value = withTiming(0, {
      duration: 200,
      easing: Easing.in(Easing.ease),
    });
    headerOpacity.value = withTiming(1, {
      duration: 300,
    });
    filterBarOpacity.value = withTiming(1, {
      duration: 300,
    });
    
    // Delay setting showDetails to false to allow animation to complete
    setTimeout(() => {
      setShowDetails(false);
      setSelectedSpot(null);
    }, 300);
  };

  const handleFilterPress = (rarity: string | null) => {
    setRarityFilter(rarityFilter === rarity ? null : rarity);
    setShowFilterMenu(false);
  };

  const handleSortPress = (option: 'newest' | 'oldest' | 'rarity') => {
    setSortOption(option);
    setShowFilterMenu(false);
  };

  const toggleFilterMenu = () => {
    setShowFilterMenu(!showFilterMenu);
    filterMenuHeight.value = withSpring(showFilterMenu ? 0 : 1, {
      damping: 15,
      stiffness: 100,
    });
  };

  const detailsStyle = useAnimatedStyle(() => ({
    opacity: detailsOpacity.value,
    transform: [{ translateY: (1 - detailsHeight.value) * 100 }],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const filterBarStyle = useAnimatedStyle(() => ({
    opacity: filterBarOpacity.value,
  }));

  const filterMenuStyle = useAnimatedStyle(() => ({
    height: filterMenuHeight.value * 280,
    opacity: filterMenuHeight.value,
  }));

  const getRarityCount = (rarity: string) => {
    return spots.filter(spot => spot.rarity === rarity).length;
  };

  const getFilterLabel = () => {
    if (rarityFilter) {
      return rarityFilter;
    }
    return 'All Cars';
  };

  const getSortLabel = () => {
    switch (sortOption) {
      case 'newest': return 'Newest First';
      case 'oldest': return 'Oldest First';
      case 'rarity': return 'Rarity';
      default: return 'Sort';
    }
  };

  const SpotCard = ({ spot, index }: { spot: Spot; index: number }) => (
    <Animated.View 
      entering={FadeInDown.delay(index * 100).springify()}
      style={styles.card}
    >
      <Pressable 
        style={({ pressed }) => [
          styles.cardPressable,
          pressed && styles.cardPressed
        ]}
        onPress={() => handleSpotPress(spot)}
        android_ripple={{ color: '#ffffff22', borderless: false }}
      >
        <Image 
          source={{ uri: getCarImage(spot.make, spot.model) }}
          style={styles.cardImage}
        />
        <View style={styles.cardGradient}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.cardGradientInner}
          />
        </View>
        <View style={styles.cardContent}>
          <View>
            <Text style={styles.carName}>{spot.year} {spot.make} {spot.model}</Text>
            <View style={styles.cardDetails}>
              <Ionicons name="time-outline" size={14} color="#ffffff99" />
              <Text style={styles.detailText}>
                {new Date(spot.created_at).toLocaleDateString()}
              </Text>
              <Ionicons name="location-outline" size={14} color="#ffffff99" />
              <Text style={styles.detailText}>{spot.location}</Text>
            </View>
          </View>
          <View style={[
            styles.rarityBadge,
            spot.rarity === 'Bronze' && styles.bronzeBadge,
            spot.rarity === 'Silver' && styles.silverBadge,
            spot.rarity === 'Gold' && styles.goldBadge,
            spot.rarity === 'Platinum' && styles.platinumBadge,
            spot.rarity === 'Diamond' && styles.diamondBadge,
            spot.rarity === 'Master' && styles.masterBadge,
            spot.rarity === 'Grandmaster' && styles.grandmasterBadge,
          ]}>
            <Text style={[
              styles.rarityText,
              spot.rarity === 'Bronze' && styles.bronzeText,
              spot.rarity === 'Silver' && styles.silverText,
              spot.rarity === 'Gold' && styles.goldText,
              spot.rarity === 'Platinum' && styles.platinumText,
              spot.rarity === 'Diamond' && styles.diamondText,
              spot.rarity === 'Master' && styles.masterText,
              spot.rarity === 'Grandmaster' && styles.grandmasterText,
            ]}>{spot.rarity}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0B1F', '#141537', '#0A0B1F']}
        style={styles.background}
      >
        <Animated.View style={[styles.header, headerStyle]}>
          <Text style={styles.title}>Collection</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{spots.length}</Text>
              <Text style={styles.statLabel}>Cars Spotted</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {spots.filter(s => ['Diamond', 'Master', 'Grandmaster'].includes(s.rarity)).length}
              </Text>
              <Text style={styles.statLabel}>Rare Finds</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.filterBar, filterBarStyle]}>
          <Pressable 
            style={styles.filterButton}
            onPress={toggleFilterMenu}
          >
            <Ionicons name="filter" size={18} color="#ffffff" />
            <Text style={styles.filterButtonText}>{getFilterLabel()}</Text>
            <Ionicons 
              name={showFilterMenu ? "chevron-up" : "chevron-down"} 
              size={18} 
              color="#ffffff" 
            />
          </Pressable>
          
          <Pressable 
            style={styles.sortButton}
            onPress={toggleFilterMenu}
          >
            <Ionicons name="swap-vertical" size={18} color="#ffffff" />
            <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
          </Pressable>
        </Animated.View>

        {showFilterMenu && (
          <Animated.View 
            style={[styles.filterMenu, filterMenuStyle]}
            entering={ZoomIn.springify()}
          >
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Filter by Rarity</Text>
              <View style={styles.filterOptions}>
                <Pressable 
                  style={[
                    styles.filterOption,
                    rarityFilter === null && styles.filterOptionActive
                  ]}
                  onPress={() => handleFilterPress(null)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    rarityFilter === null && styles.filterOptionTextActive
                  ]}>All</Text>
                </Pressable>
                
                <Pressable 
                  style={[
                    styles.filterOption,
                    styles.bronzeOption,
                    rarityFilter === 'Bronze' && styles.filterOptionActive
                  ]}
                  onPress={() => handleFilterPress('Bronze')}
                >
                  <Text style={[
                    styles.filterOptionText,
                    styles.bronzeText,
                    rarityFilter === 'Bronze' && styles.filterOptionTextActive
                  ]}>Bronze</Text>
                  <Text style={styles.filterCount}>{getRarityCount('Bronze')}</Text>
                </Pressable>
                
                <Pressable 
                  style={[
                    styles.filterOption,
                    styles.silverOption,
                    rarityFilter === 'Silver' && styles.filterOptionActive
                  ]}
                  onPress={() => handleFilterPress('Silver')}
                >
                  <Text style={[
                    styles.filterOptionText,
                    styles.silverText,
                    rarityFilter === 'Silver' && styles.filterOptionTextActive
                  ]}>Silver</Text>
                  <Text style={styles.filterCount}>{getRarityCount('Silver')}</Text>
                </Pressable>
                
                <Pressable 
                  style={[
                    styles.filterOption,
                    styles.goldOption,
                    rarityFilter === 'Gold' && styles.filterOptionActive
                  ]}
                  onPress={() => handleFilterPress('Gold')}
                >
                  <Text style={[
                    styles.filterOptionText,
                    styles.goldText,
                    rarityFilter === 'Gold' && styles.filterOptionTextActive
                  ]}>Gold</Text>
                  <Text style={styles.filterCount}>{getRarityCount('Gold')}</Text>
                </Pressable>
                
                <Pressable 
                  style={[
                    styles.filterOption,
                    styles.platinumOption,
                    rarityFilter === 'Platinum' && styles.filterOptionActive
                  ]}
                  onPress={() => handleFilterPress('Platinum')}
                >
                  <Text style={[
                    styles.filterOptionText,
                    styles.platinumText,
                    rarityFilter === 'Platinum' && styles.filterOptionTextActive
                  ]}>Platinum</Text>
                  <Text style={styles.filterCount}>{getRarityCount('Platinum')}</Text>
                </Pressable>
                
                <Pressable 
                  style={[
                    styles.filterOption,
                    styles.diamondOption,
                    rarityFilter === 'Diamond' && styles.filterOptionActive
                  ]}
                  onPress={() => handleFilterPress('Diamond')}
                >
                  <Text style={[
                    styles.filterOptionText,
                    styles.diamondText,
                    rarityFilter === 'Diamond' && styles.filterOptionTextActive
                  ]}>Diamond</Text>
                  <Text style={styles.filterCount}>{getRarityCount('Diamond')}</Text>
                </Pressable>
                
                <Pressable 
                  style={[
                    styles.filterOption,
                    styles.masterOption,
                    rarityFilter === 'Master' && styles.filterOptionActive
                  ]}
                  onPress={() => handleFilterPress('Master')}
                >
                  <Text style={[
                    styles.filterOptionText,
                    styles.masterText,
                    rarityFilter === 'Master' && styles.filterOptionTextActive
                  ]}>Master</Text>
                  <Text style={styles.filterCount}>{getRarityCount('Master')}</Text>
                </Pressable>
                
                <Pressable 
                  style={[
                    styles.filterOption,
                    styles.grandmasterOption,
                    rarityFilter === 'Grandmaster' && styles.filterOptionActive
                  ]}
                  onPress={() => handleFilterPress('Grandmaster')}
                >
                  <Text style={[
                    styles.filterOptionText,
                    styles.grandmasterText,
                    rarityFilter === 'Grandmaster' && styles.filterOptionTextActive
                  ]}>Grandmaster</Text>
                  <Text style={styles.filterCount}>{getRarityCount('Grandmaster')}</Text>
                </Pressable>
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.sortOptions}>
                <Pressable 
                  style={[
                    styles.sortOption,
                    sortOption === 'newest' && styles.sortOptionActive
                  ]}
                  onPress={() => handleSortPress('newest')}
                >
                  <Ionicons 
                    name="time-outline" 
                    size={18} 
                    color={sortOption === 'newest' ? '#6C63FF' : '#ffffff99'} 
                  />
                  <Text style={[
                    styles.sortOptionText,
                    sortOption === 'newest' && styles.sortOptionTextActive
                  ]}>Newest First</Text>
                </Pressable>
                
                <Pressable 
                  style={[
                    styles.sortOption,
                    sortOption === 'oldest' && styles.sortOptionActive
                  ]}
                  onPress={() => handleSortPress('oldest')}
                >
                  <Ionicons 
                    name="calendar-outline" 
                    size={18} 
                    color={sortOption === 'oldest' ? '#6C63FF' : '#ffffff99'} 
                  />
                  <Text style={[
                    styles.sortOptionText,
                    sortOption === 'oldest' && styles.sortOptionTextActive
                  ]}>Oldest First</Text>
                </Pressable>
                
                <Pressable 
                  style={[
                    styles.sortOption,
                    sortOption === 'rarity' && styles.sortOptionActive
                  ]}
                  onPress={() => handleSortPress('rarity')}
                >
                  <Ionicons 
                    name="diamond-outline" 
                    size={18} 
                    color={sortOption === 'rarity' ? '#6C63FF' : '#ffffff99'} 
                  />
                  <Text style={[
                    styles.sortOptionText,
                    sortOption === 'rarity' && styles.sortOptionTextActive
                  ]}>Rarity (Highest First)</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <Animated.View 
              entering={FadeInDown.delay(300)}
              style={styles.loadingIcon}
            >
              <Ionicons name="car-sport" size={48} color="#6C63FF" />
            </Animated.View>
            <Animated.Text 
              entering={FadeInDown.delay(400)}
              style={styles.loadingText}
            >
              Loading collection...
            </Animated.Text>
          </View>
        ) : spots.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Animated.View 
              entering={FadeInDown.delay(300)}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="car-sport-outline" size={64} color="#ffffff44" />
            </Animated.View>
            <Animated.Text 
              entering={FadeInDown.delay(400)}
              style={styles.emptyTitle}
            >
              No cars spotted yet
            </Animated.Text>
            <Animated.Text 
              entering={FadeInDown.delay(500)}
              style={styles.emptyText}
            >
              Start scanning cars to build your collection
            </Animated.Text>
            <Animated.View entering={FadeInDown.delay(600)}>
              <Pressable
                style={({ pressed }) => [
                  styles.emptyButton,
                  pressed && styles.buttonPressed
                ]}
                onPress={() => router.push('/(tabs)')}
              >
                <Ionicons name="scan-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.emptyButtonText}>Scan Your First Car</Text>
              </Pressable>
            </Animated.View>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {spots.map((spot, index) => (
              <SpotCard key={spot.id} spot={spot} index={index} />
            ))}
          </ScrollView>
        )}

        {showDetails && selectedSpot && (
          <Animated.View style={[styles.detailsContainer, detailsStyle]}>
            <View style={styles.detailsHeader}>
              <Pressable 
                style={styles.closeButton}
                onPress={handleCloseDetails}
              >
                <Ionicons name="chevron-down" size={24} color="#ffffff" />
              </Pressable>
            </View>
            
            <ScrollView 
              style={styles.detailsScroll}
              contentContainerStyle={styles.detailsContent}
              showsVerticalScrollIndicator={false}
            >
              <Image 
                source={{ uri: getCarImage(selectedSpot.make, selectedSpot.model) }}
                style={styles.detailsImage}
              />
              
              <View style={styles.detailsInfo}>
                <View style={styles.detailsNameRow}>
                  <Text style={styles.detailsName}>
                    {selectedSpot.year} {selectedSpot.make} {selectedSpot.model}
                  </Text>
                  <View style={[
                    styles.rarityBadge,
                    selectedSpot.rarity === 'Bronze' && styles.bronzeBadge,
                    selectedSpot.rarity === 'Silver' && styles.silverBadge,
                    selectedSpot.rarity === 'Gold' && styles.goldBadge,
                    selectedSpot.rarity === 'Platinum' && styles.platinumBadge,
                    selectedSpot.rarity === 'Diamond' && styles.diamondBadge,
                    selectedSpot.rarity === 'Master' && styles.masterBadge,
                    selectedSpot.rarity === 'Grandmaster' && styles.grandmasterBadge,
                  ]}>
                    <Text style={[
                      styles.rarityText,
                      selectedSpot.rarity === 'Bronze' && styles.bronzeText,
                      selectedSpot.rarity === 'Silver' && styles.silverText,
                      selectedSpot.rarity === 'Gold' && styles.goldText,
                      selectedSpot.rarity === 'Platinum' && styles.platinumText,
                      selectedSpot.rarity === 'Diamond' && styles.diamondText,
                      selectedSpot.rarity === 'Master' && styles.masterText,
                      selectedSpot.rarity === 'Grandmaster' && styles.grandmasterText,
                    ]}>{selectedSpot.rarity}</Text>
                  </View>
                </View>
                
                <View style={styles.detailsMetaRow}>
                  <View style={styles.detailsMetaItem}>
                    <Ionicons name="time-outline" size={16} color="#ffffff99" />
                    <Text style={styles.detailsMetaText}>
                      {new Date(selectedSpot.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailsMetaItem}>
                    <Ionicons name="location-outline" size={16} color="#ffffff99" />
                    <Text style={styles.detailsMetaText}>{selectedSpot.location}</Text>
                  </View>
                </View>
                
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Performance</Text>
                  <Text style={styles.detailsSectionText}>{selectedSpot.performance}</Text>
                </View>
                
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Notable Features</Text>
                  <Text style={styles.detailsSectionText}>{selectedSpot.features}</Text>
                </View>
                
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Value Range</Text>
                  <Text style={styles.detailsSectionText}>{selectedSpot.value_range}</Text>
                </View>
                
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Interesting Facts</Text>
                  <Text style={styles.detailsSectionText}>{selectedSpot.trivia}</Text>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        )}
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
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff11',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#ffffff99',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#ffffff22',
    marginHorizontal: 16,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff11',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  filterButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff11',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  sortButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  filterMenu: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffffff22',
    overflow: 'hidden',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff11',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  filterOptionActive: {
    backgroundColor: '#6C63FF33',
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  filterOptionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  filterCount: {
    fontSize: 12,
    color: '#ffffff66',
    backgroundColor: '#ffffff11',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  bronzeOption: {
    backgroundColor: '#CD7F3222',
  },
  silverOption: {
    backgroundColor: '#C0C0C022',
  },
  goldOption: {
    backgroundColor: '#FFD70022',
  },
  platinumOption: {
    backgroundColor: '#E5E4E222',
  },
  diamondOption: {
    backgroundColor: '#B9F2FF22',
  },
  masterOption: {
    backgroundColor: '#9370DB22',
  },
  grandmasterOption: {
    backgroundColor: '#FF450022',
  },
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff11',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  sortOptionActive: {
    backgroundColor: '#6C63FF33',
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  sortOptionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    marginBottom: 16,
  },
  loadingText: {
    color: '#ffffff99',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff11',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#ffffff99',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 280,
  },
  emptyButton: {
    flexDirection: 'row',
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    backgroundColor: '#5149CC',
    transform: [{ scale: 0.98 }],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 20,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 200,
    backgroundColor: '#ffffff11',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardPressable: {
    flex: 1,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  cardGradientInner: {
    flex: 1,
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  carName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#ffffffcc',
    marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  rarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff22',
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
  detailsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0B1F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  detailsHeader: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff11',
  },
  closeButton: {
    padding: 8,
  },
  detailsScroll: {
    flex: 1,
  },
  detailsContent: {
    paddingBottom: 40,
  },
  detailsImage: {
    width: '100%',
    height: 250,
  },
  detailsInfo: {
    padding: 20,
  },
  detailsNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  detailsMetaRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  detailsMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailsMetaText: {
    fontSize: 14,
    color: '#ffffff99',
    marginLeft: 4,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  detailsSectionText: {
    fontSize: 16,
    color: '#ffffffee',
    lineHeight: 24,
  },
});