import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, TextInput, ActivityIndicator, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, SlideInRight, ZoomIn } from 'react-native-reanimated';

type RarityCount = {
  rarity: string;
  count: number;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<{
    full_name: string | null;
    total_spots: number;
    email: string | null;
    rarityCounts: RarityCount[];
    firstSpotDate: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmSignOut, setShowConfirmSignOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'settings'>('stats');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  
  // Edit profile state
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  
  // Change email state
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  
  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Get spots
      const { data: spots, error: spotsError } = await supabase
        .from('spots')
        .select('id, rarity, created_at')
        .eq('user_id', user.id);

      if (spotsError) throw spotsError;

      // Calculate rarity counts
      const rarityMap: Record<string, number> = {};
      spots?.forEach(spot => {
        rarityMap[spot.rarity] = (rarityMap[spot.rarity] || 0) + 1;
      });

      const rarityCounts: RarityCount[] = Object.entries(rarityMap).map(([rarity, count]) => ({
        rarity,
        count
      }));

      // Sort by rarity level
      const rarityOrder = {
        'Grandmaster': 7,
        'Master': 6,
        'Diamond': 5,
        'Platinum': 4,
        'Gold': 3,
        'Silver': 2,
        'Bronze': 1
      };

      rarityCounts.sort((a, b) => rarityOrder[b.rarity as keyof typeof rarityOrder] - rarityOrder[a.rarity as keyof typeof rarityOrder]);

      // Get first spot date
      let firstSpotDate = null;
      if (spots && spots.length > 0) {
        const sortedSpots = [...spots].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        firstSpotDate = sortedSpots[0].created_at;
      }

      setProfile({
        full_name: profile?.full_name || 'Car Enthusiast',
        email: user.email,
        total_spots: spots?.length || 0,
        rarityCounts,
        firstSpotDate
      });
      
      // Initialize edit name with current name
      if (profile?.full_name) {
        setEditName(profile.full_name);
      }
      
      // Initialize email with current email
      if (user.email) {
        setNewEmail(user.email);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };
  
  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      setEditError('Name cannot be empty');
      return;
    }
    
    try {
      setEditLoading(true);
      setEditError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      // Update local profile state
      if (profile) {
        setProfile({
          ...profile,
          full_name: editName.trim()
        });
      }
      
      setShowEditProfile(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setEditError(error.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };
  
  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      setEmailError('Email cannot be empty');
      return;
    }
    
    if (!emailPassword.trim()) {
      setEmailError('Password is required');
      return;
    }
    
    try {
      setEmailLoading(true);
      setEmailError(null);
      
      // First verify the password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: emailPassword
      });
      
      if (signInError) {
        throw new Error('Incorrect password');
      }
      
      // Then update the email
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim()
      });
      
      if (error) throw error;
      
      // Update local profile state
      if (profile) {
        setProfile({
          ...profile,
          email: newEmail.trim()
        });
      }
      
      setShowChangeEmail(false);
      Alert.alert(
        'Email Updated',
        'Your email has been updated successfully. You may need to verify your new email address.'
      );
    } catch (error: any) {
      console.error('Error changing email:', error);
      setEmailError(error.message || 'Failed to change email');
    } finally {
      setEmailLoading(false);
    }
  };
  
  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      setPasswordError('Current password is required');
      return;
    }
    
    if (!newPassword.trim() || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    try {
      setPasswordLoading(true);
      setPasswordError(null);
      
      // First verify the current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword
      });
      
      if (signInError) {
        throw new Error('Incorrect current password');
      }
      
      // Then update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      Alert.alert(
        'Password Updated',
        'Your password has been updated successfully.'
      );
    } catch (error: any) {
      console.error('Error changing password:', error);
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Password is required');
      return;
    }
    
    if (deleteConfirm !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }
    
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      
      // First verify the password by signing in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth');
        return;
      }
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: deletePassword
      });
      
      if (signInError) {
        throw new Error('Incorrect password');
      }
      
      // Delete the user
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) throw error;
      
      // Sign out and redirect to auth
      await supabase.auth.signOut();
      router.replace('/auth');
      
      Alert.alert(
        'Account Deleted',
        'Your account has been deleted successfully.'
      );
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setDeleteError(error.message || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Bronze': return '#CD7F32';
      case 'Silver': return '#C0C0C0';
      case 'Gold': return '#FFD700';
      case 'Platinum': return '#E5E4E2';
      case 'Diamond': return '#B9F2FF';
      case 'Master': return '#9370DB';
      case 'Grandmaster': return '#FF4500';
      default: return '#ffffff';
    }
  };

  const getRarityBgColor = (rarity: string) => {
    switch (rarity) {
      case 'Bronze': return '#CD7F3222';
      case 'Silver': return '#C0C0C022';
      case 'Gold': return '#FFD70022';
      case 'Platinum': return '#E5E4E222';
      case 'Diamond': return '#B9F2FF22';
      case 'Master': return '#9370DB22';
      case 'Grandmaster': return '#FF450022';
      default: return '#ffffff22';
    }
  };

  const calculateCollectorLevel = (totalSpots: number, rarityCounts: RarityCount[]) => {
    if (totalSpots === 0) return { level: 0, progress: 0, title: 'Beginner' };
    
    // Calculate a weighted score based on rarity
    const rarityWeights = {
      'Bronze': 1,
      'Silver': 2,
      'Gold': 3,
      'Platinum': 5,
      'Diamond': 8,
      'Master': 13,
      'Grandmaster': 21
    };
    
    let totalScore = 0;
    rarityCounts.forEach(item => {
      totalScore += item.count * rarityWeights[item.rarity as keyof typeof rarityWeights];
    });
    
    // Define level thresholds
    const levels = [
      { threshold: 0, title: 'Beginner' },
      { threshold: 10, title: 'Novice Spotter' },
      { threshold: 25, title: 'Car Enthusiast' },
      { threshold: 50, title: 'Dedicated Collector' },
      { threshold: 100, title: 'Automotive Expert' },
      { threshold: 200, title: 'Master Collector' },
      { threshold: 350, title: 'Legendary Spotter' },
      { threshold: 500, title: 'Car Whisperer' }
    ];
    
    // Find current level
    let currentLevel = 0;
    let nextThreshold = levels[1].threshold;
    
    for (let i = 1; i < levels.length; i++) {
      if (totalScore >= levels[i].threshold) {
        currentLevel = i;
      } else {
        nextThreshold = levels[i].threshold;
        break;
      }
    }
    
    // Calculate progress to next level
    const currentThreshold = levels[currentLevel].threshold;
    const progress = Math.min(100, ((totalScore - currentThreshold) / (nextThreshold - currentThreshold)) * 100);
    
    return {
      level: currentLevel + 1,
      progress: progress,
      title: levels[currentLevel].title
    };
  };

  const collectorInfo = profile ? calculateCollectorLevel(profile.total_spots, profile.rarityCounts || []) : { level: 0, progress: 0, title: 'Beginner' };

  // Edit Profile Modal
  const renderEditProfileModal = () => {
    return (
      <Animated.View 
        entering={ZoomIn.springify()}
        style={styles.modalContent}
      >
        <Text style={styles.modalTitle}>Edit Profile</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholder="Enter your name"
            placeholderTextColor="#ffffff66"
          />
        </View>
        
        {editError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color="#ff4444" />
            <Text style={styles.errorText}>{editError}</Text>
          </View>
        )}
        
        <View style={styles.modalButtons}>
          <Pressable 
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => {
              setShowEditProfile(false);
              setEditError(null);
              // Reset to original value
              if (profile?.full_name) {
                setEditName(profile.full_name);
              }
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          
          <Pressable 
            style={[
              styles.modalButton, 
              styles.confirmButton,
              editLoading && styles.buttonDisabled
            ]}
            onPress={handleUpdateProfile}
            disabled={editLoading}
          >
            {editLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.confirmButtonText}>Save</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    );
  };
  
  // Change Email Modal
  const renderChangeEmailModal = () => {
    return (
      <Animated.View 
        entering={ZoomIn.springify()}
        style={styles.modalContent}
      >
        <Text style={styles.modalTitle}>Change Email</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>New Email</Text>
          <TextInput
            style={styles.input}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="Enter new email"
            placeholderTextColor="#ffffff66"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <TextInput
            style={styles.input}
            value={emailPassword}
            onChangeText={setEmailPassword}
            placeholder="Enter your password"
            placeholderTextColor="#ffffff66"
            secureTextEntry
          />
        </View>
        
        {emailError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color="#ff4444" />
            <Text style={styles.errorText}>{emailError}</Text>
          </View>
        )}
        
        <View style={styles.modalButtons}>
          <Pressable 
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => {
              setShowChangeEmail(false);
              setEmailError(null);
              setEmailPassword('');
              // Reset to original value
              if (profile?.email) {
                setNewEmail(profile.email);
              }
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          
          <Pressable 
            style={[
              styles.modalButton, 
              styles.confirmButton,
              emailLoading && styles.buttonDisabled
            ]}
            onPress={handleChangeEmail}
            disabled={emailLoading}
          >
            {emailLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.confirmButtonText}>Update</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    );
  };
  
  // Change Password Modal
  const renderChangePasswordModal = () => {
    return (
      <Animated.View 
        entering={ZoomIn.springify()}
        style={styles.modalContent}
      >
        <Text style={styles.modalTitle}>Change Password</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor="#ffffff66"
            secureTextEntry
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor="#ffffff66"
            secureTextEntry
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor="#ffffff66"
            secureTextEntry
          />
        </View>
        
        {passwordError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color="#ff4444" />
            <Text style={styles.errorText}>{passwordError}</Text>
          </View>
        )}
        
        <View style={styles.modalButtons}>
          <Pressable 
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => {
              setShowChangePassword(false);
              setPasswordError(null);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          
          <Pressable 
            style={[
              styles.modalButton, 
              styles.confirmButton,
              passwordLoading && styles.buttonDisabled
            ]}
            onPress={handleChangePassword}
            disabled={passwordLoading}
          >
            {passwordLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.confirmButtonText}>Update</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    );
  };
  
  // Delete Account Modal
  const renderDeleteAccountModal = () => {
    return (
      <Animated.View 
        entering={ZoomIn.springify()}
        style={styles.modalContent}
      >
        <Text style={styles.modalTitle}>Delete Account</Text>
        <Text style={styles.deleteWarning}>
          Warning: This action cannot be undone. All your data will be permanently deleted.
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Your Password</Text>
          <TextInput
            style={styles.input}
            value={deletePassword}
            onChangeText={setDeletePassword}
            placeholder="Enter your password"
            placeholderTextColor="#ffffff66"
            secureTextEntry
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Type DELETE to confirm</Text>
          <TextInput
            style={styles.input}
            value={deleteConfirm}
            onChangeText={setDeleteConfirm}
            placeholder="Type DELETE"
            placeholderTextColor="#ffffff66"
          />
        </View>
        
        {deleteError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color="#ff4444" />
            <Text style={styles.errorText}>{deleteError}</Text>
          </View>
        )}
        
        <View style={styles.modalButtons}>
          <Pressable 
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => {
              setShowDeleteAccount(false);
              setDeleteError(null);
              setDeletePassword('');
              setDeleteConfirm('');
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          
          <Pressable 
            style={[
              styles.modalButton, 
              styles.deleteButton,
              deleteLoading && styles.buttonDisabled
            ]}
            onPress={handleDeleteAccount}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0A0B1F', '#141537', '#0A0B1F']}
          style={styles.background}
        >
          <View style={styles.loadingContainer}>
            <Animated.View 
              entering={FadeInDown.delay(300)}
              style={styles.loadingIcon}
            >
              <Ionicons name="person" size={48} color="#6C63FF" />
            </Animated.View>
            <Animated.Text 
              entering={FadeInDown.delay(400)}
              style={styles.loadingText}
            >
              Loading profile...
            </Animated.Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0B1F', '#141537', '#0A0B1F']}
        style={styles.background}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <Pressable 
              style={styles.signOutButton}
              onPress={() => setShowConfirmSignOut(true)}
            >
              <Ionicons name="log-out-outline" size={24} color="#ffffff99" />
            </Pressable>
          </View>

          <Animated.View 
            entering={FadeInDown.delay(200)}
            style={styles.profileCard}
          >
            <View style={styles.profileAvatarContainer}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitials}>
                  {profile?.full_name?.charAt(0) || 'U'}
                </Text>
              </View>
              <View style={styles.profileLevelBadge}>
                <Text style={styles.profileLevelText}>{collectorInfo.level}</Text>
              </View>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.full_name}</Text>
              <Text style={styles.profileEmail}>{profile?.email}</Text>
              
              <View style={styles.levelContainer}>
                <View style={styles.levelTitleRow}>
                  <Text style={styles.levelTitle}>{collectorInfo.title}</Text>
                  <Text style={styles.levelValue}>Lvl {collectorInfo.level}</Text>
                </View>
                <View style={styles.levelProgressContainer}>
                  <View 
                    style={[
                      styles.levelProgressBar, 
                      { width: `${collectorInfo.progress}%` }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          <View style={styles.tabsContainer}>
            <Pressable 
              style={[
                styles.tabButton,
                activeTab === 'stats' && styles.activeTabButton
              ]}
              onPress={() => setActiveTab('stats')}
            >
              <Ionicons 
                name="stats-chart" 
                size={20} 
                color={activeTab === 'stats' ? '#6C63FF' : '#ffffff99'} 
              />
              <Text style={[
                styles.tabButtonText,
                activeTab === 'stats' && styles.activeTabText
              ]}>Stats</Text>
            </Pressable>
            
            <Pressable 
              style={[
                styles.tabButton,
                activeTab === 'settings' && styles.activeTabButton
              ]}
              onPress={() => setActiveTab('settings')}
            >
              <Ionicons 
                name="settings-outline" 
                size={20} 
                color={activeTab === 'settings' ? '#6C63FF' : '#ffffff99'} 
              />
              <Text style={[
                styles.tabButtonText,
                activeTab === 'settings' && styles.activeTabText
              ]}>Settings</Text>
            </Pressable>
          </View>

          {activeTab === 'stats' ? (
            <>
              <Animated.View 
                entering={FadeIn.delay(300)}
                style={styles.statsContainer}
              >
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="car-sport" size={24} color="#6C63FF" />
                  </View>
                  <View style={styles.statInfo}>
                    <Text style={styles.statValue}>{profile?.total_spots || 0}</Text>
                    <Text style={styles.statLabel}>Cars Spotted</Text>
                  </View>
                </View>
                
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="calendar" size={24} color="#6C63FF" />
                  </View>
                  <View style={styles.statInfo}>
                    <Text style={styles.statValue}>{formatDate(profile?.firstSpotDate)}</Text>
                    <Text style={styles.statLabel}>First Spot</Text>
                  </View>
                </View>
                
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="diamond" size={24} color="#6C63FF" />
                  </View>
                  <View style={styles.statInfo}>
                    <Text style={styles.statValue}>
                      {profile?.rarityCounts?.filter(r => 
                        ['Diamond', 'Master', 'Grandmaster'].includes(r.rarity)
                      ).reduce((sum, item) => sum + item.count, 0) || 0}
                    </Text>
                    <Text style={styles.statLabel}>Rare Finds</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View 
                entering={FadeIn.delay(400)}
                style={styles.section}
              >
                <Text style={styles.sectionTitle}>Collection Breakdown</Text>
                <View style={styles.rarityBreakdown}>
                  {profile?.rarityCounts?.map((item, index) => (
                    <Animated.View 
                      key={item.rarity}
                      entering={SlideInRight.delay(500 + index * 100)}
                      style={[
                        styles.rarityItem,
                        { backgroundColor: getRarityBgColor(item.rarity) }
                      ]}
                    >
                      <View style={styles.rarityInfo}>
                        <Text style={[
                          styles.rarityName,
                          { color: getRarityColor(item.rarity) }
                        ]}>{item.rarity}</Text>
                        <Text style={styles.rarityCount}>{item.count}</Text>
                      </View>
                      <View style={styles.rarityBar}>
                        <View 
                          style={[
                            styles.rarityBarFill,
                            { 
                              width: `${Math.min(100, (item.count / profile.total_spots) * 100)}%`,
                              backgroundColor: getRarityColor(item.rarity)
                            }
                          ]}
                        />
                      </View>
                    </Animated.View>
                  ))}
                  
                  {(!profile?.rarityCounts || profile.rarityCounts.length === 0) && (
                    <Text style={styles.emptyText}>No cars spotted yet</Text>
                  )}
                </View>
              </Animated.View>

              <Animated.View 
                entering={FadeIn.delay(500)}
                style={styles.section}
              >
                <Text style={styles.sectionTitle}>Achievements</Text>
                <View style={styles.achievementsContainer}>
                  <View style={styles.achievementCard}>
                    <View style={[styles.achievementIcon, styles.achievementCompleted]}>
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    </View>
                    <View style={styles.achievementInfo}>
                      <Text style={styles.achievementTitle}>First Spot</Text>
                      <Text style={styles.achievementDesc}>Scan your first car</Text>
                    </View>
                  </View>
                  
                  <View style={styles.achievementCard}>
                    <View style={[
                      styles.achievementIcon,
                      profile?.total_spots >= 10 ? styles.achievementCompleted : styles.achievementIncomplete
                    ]}>
                      <Ionicons 
                        name={profile?.total_spots >= 10 ? "checkmark-circle" : "time"} 
                        size={24} 
                        color={profile?.total_spots >= 10 ? "#4CAF50" : "#ffffff66"} 
                      />
                    </View>
                    <View style={styles.achievementInfo}>
                      <Text style={styles.achievementTitle}>Dedicated Spotter</Text>
                      <Text style={styles.achievementDesc}>Scan 10 different cars</Text>
                      {profile?.total_spots < 10 && (
                        <View style={styles.achievementProgress}>
                          <View style={styles.achievementProgressBar}>
                            <View 
                              style={[
                                styles.achievementProgressFill,
                                { width: `${Math.min(100, (profile?.total_spots / 10) * 100)}%` }
                              ]}
                            />
                          </View>
                          <Text style={styles.achievementProgressText}>{profile?.total_spots}/10</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.achievementCard}>
                    <View style={[
                      styles.achievementIcon,
                      profile?.rarityCounts?.some(r => r.rarity === 'Diamond' || r.rarity === 'Master' || r.rarity === 'Grandmaster')
                        ? styles.achievementCompleted 
                        : styles.achievementIncomplete
                    ]}>
                      <Ionicons 
                        name={
                          profile?.rarityCounts?.some(r => r.rarity === 'Diamond' || r.rarity === 'Master' || r.rarity === 'Grandmaster')
                            ? "checkmark-circle" 
                            : "diamond-outline"
                        } 
                        size={24} 
                        color={
                          profile?.rarityCounts?.some(r => r.rarity === 'Diamond' || r.rarity === 'Master' || r.rarity === 'Grandmaster')
                            ? "#4CAF50" 
                            : "#ffffff66"
                        } 
                      />
                    </View>
                    <View style={styles.achievementInfo}>
                      <Text style={styles.achievementTitle}>Rare Hunter</Text>
                      <Text style={styles.achievementDesc}>Find a Diamond or higher rarity car</Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            </>
          ) : (
            <Animated.View 
              entering={FadeIn.delay(300)}
              style={styles.settingsContainer}
            >
              <View style={styles.settingsCard}>
                <Text style={styles.settingsCardTitle}>Account</Text>
                <Pressable 
                  style={styles.settingItem}
                  onPress={() => setShowEditProfile(true)}
                >
                  <Ionicons name="person-outline" size={22} color="#ffffff99" />
                  <Text style={styles.settingText}>Edit Profile</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ffffff55" />
                </Pressable>
                
                <Pressable 
                  style={styles.settingItem}
                  onPress={() => setShowChangeEmail(true)}
                >
                  <Ionicons name="mail-outline" size={22} color="#ffffff99" />
                  <Text style={styles.settingText}>Change Email</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ffffff55" />
                </Pressable>
                
                <Pressable 
                  style={styles.settingItem}
                  onPress={() => setShowChangePassword(true)}
                >
                  <Ionicons name="key-outline" size={22} color="#ffffff99" />
                  <Text style={styles.settingText}>Change Password</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ffffff55" />
                </Pressable>
              </View>
              
              <View style={styles.settingsCard}>
                <Text style={styles.settingsCardTitle}>Preferences</Text>
                <Pressable style={styles.settingItem}>
                  <Ionicons name="notifications-outline" size={22} color="#ffffff99" />
                  <Text style={styles.settingText}>Notifications</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ffffff55" />
                </Pressable>
                
                <Pressable style={styles.settingItem}>
                  <Ionicons name="moon-outline" size={22} color="#ffffff99" />
                  <Text style={styles.settingText}>Dark Mode</Text>
                  <View style={styles.settingToggle}>
                    <View style={styles.toggleActive} />
                  </View>
                </Pressable>
                
                <Pressable style={styles.settingItem}>
                  <Ionicons name="globe-outline" size={22} color="#ffffff99" />
                  <Text style={styles.settingText}>Language</Text>
                  <Text style={styles.settingValue}>English</Text>
                </Pressable>
              </View>
              
              <View style={styles.settingsCard}>
                <Text style={styles.settingsCardTitle}>Support</Text>
                <Pressable style={styles.settingItem}>
                  <Ionicons name="help-circle-outline" size={22} color="#ffffff99" />
                  <Text style={styles.settingText}>Help & Support</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ffffff55" />
                </Pressable>
                
                <Pressable style={styles.settingItem}>
                  <Ionicons name="document-text-outline" size={22} color="#ffffff99" />
                  <Text style={styles.settingText}>Terms of Service</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ffffff55" />
                </Pressable>
                
                <Pressable style={styles.settingItem}>
                  <Ionicons name="shield-checkmark-outline" size={22} color="#ffffff99" />
                  <Text style={styles.settingText}>Privacy Policy</Text>
                  <Ionicons name="chevron-forward" size={20} color="#ffffff55" />
                </Pressable>
              </View>
              
              <Pressable 
                style={styles.dangerButton}
                onPress={() => setShowDeleteAccount(true)}
              >
                <Ionicons name="trash-outline" size={22} color="#ff4444" />
                <Text style={styles.dangerButtonText}>Delete Account</Text>
              </Pressable>
              
              <Pressable 
                style={styles.signOutButton2}
                onPress={() => setShowConfirmSignOut(true)}
              >
                <Ionicons name="log-out-outline" size={22} color="#ff4444" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>

        {showConfirmSignOut && (
          <View style={styles.modalOverlay}>
            <Animated.View 
              entering={ZoomIn.springify()}
              style={styles.confirmModal}
            >
              <Text style={styles.confirmTitle}>Sign Out</Text>
              <Text style={styles.confirmText}>Are you sure you want to sign out?</Text>
              
              <View style={styles.confirmButtons}>
                <Pressable 
                  style={[styles.confirmButton, styles.cancelButton]}
                  onPress={() => setShowConfirmSignOut(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                
                <Pressable 
                  style={[styles.confirmButton, styles.signOutConfirmButton]}
                  onPress={handleSignOut}
                >
                  <Text style={styles.signOutConfirmText}>Sign Out</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        )}
        
        {showEditProfile && (
          <View style={styles.modalOverlay}>
            {renderEditProfileModal()}
          </View>
        )}
        
        {showChangeEmail && (
          <View style={styles.modalOverlay}>
            {renderChangeEmailModal()}
          </View>
        )}
        
        {showChangePassword && (
          <View style={styles.modalOverlay}>
            {renderChangePasswordModal()}
          </View>
        )}
        
        {showDeleteAccount && (
          <View style={styles.modalOverlay}>
            {renderDeleteAccountModal()}
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  signOutButton: {
    padding: 8,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff11',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  profileAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#6C63FF33',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#6C63FF',
  },
  profileInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileLevelBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0B1F',
  },
  profileLevelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#ffffff99',
    marginBottom: 12,
  },
  levelContainer: {
    marginTop: 4,
  },
  levelTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6C63FF',
  },
  levelValue: {
    fontSize: 12,
    color: '#ffffff99',
  },
  levelProgressContainer: {
    height: 6,
    backgroundColor: '#ffffff22',
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelProgressBar: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 3,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff11',
    borderRadius: 12,
    marginBottom: 24,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  activeTabButton: {
    backgroundColor: '#ffffff11',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff99',
  },
  activeTabText: {
    color: '#6C63FF',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff11',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6C63FF22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#ffffff99',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  rarityBreakdown: {
    backgroundColor: '#ffffff11',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  rarityItem: {
    borderRadius: 12,
    padding: 12,
  },
  rarityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rarityName: {
    fontSize: 16,
    fontWeight: '600',
  },
  rarityCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  }, rarityBar: {
    height: 6,
    backgroundColor: '#ffffff22',
    borderRadius: 3,
    overflow: 'hidden',
  },
  rarityBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyText: {
    color: '#ffffff66',
    textAlign: 'center',
    padding: 16,
  },
  achievementsContainer: {
    backgroundColor: '#ffffff11',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementCompleted: {
    backgroundColor: '#4CAF5022',
  },
  achievementIncomplete: {
    backgroundColor: '#ffffff11',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 14,
    color: '#ffffff99',
    marginBottom: 8,
  },
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  achievementProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#ffffff22',
    borderRadius: 2,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 2,
  },
  achievementProgressText: {
    fontSize: 12,
    color: '#ffffff99',
  },
  settingsContainer: {
    gap: 16,
  },
  settingsCard: {
    backgroundColor: '#ffffff11',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  settingsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff11',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff11',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 14,
    color: '#ffffff99',
    marginLeft: 8,
  },
  settingToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6C63FF',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-end',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff444422',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ff444444',
  },
  dangerButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff11',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  signOutText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#ffffff22',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 16,
    color: '#ffffff99',
    marginBottom: 24,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ffffff22',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  signOutConfirmButton: {
    backgroundColor: '#ff4444',
  },
  signOutConfirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#ffffff22',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#ffffff99',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff11',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ffffff22',
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
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: '#6C63FF',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  deleteWarning: {
    color: '#ff4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#ff444422',
    padding: 12,
    borderRadius: 8,
  },
});