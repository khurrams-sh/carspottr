import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, RefreshControl, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadImageAsync } from '../../lib/storage';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInUp, ZoomIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming, withSpring, Easing, FadeOut } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Camera, CameraType } from 'expo-camera';
import { v4 as uuidv4 } from 'uuid';
import { BlurView } from 'expo-blur';

type Profile = {
  id: string;
  full_name: string;
};

type Post = {
  id: string;
  content: string;
  subject: string | null;
  created_at: string;
  user_id: string;
  image_url: string | null;
  profiles: Profile;
};

export default function ConnectScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [showInput, setShowInput] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState<boolean | null>(null);
  const [showPostOptions, setShowPostOptions] = useState<string | null>(null);
  const cameraRef = useRef<Camera>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const fabScale = useSharedValue(1);
  const inputHeight = useSharedValue(0);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setCurrentUserName(profile.full_name || 'Anonymous User');
        } else if (!profileError) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              full_name: 'Anonymous User',
              updated_at: new Date().toISOString(),
            });

          if (insertError) throw insertError;
          setCurrentUserName('Anonymous User');
        }
      }

      // Log the query to debug
      console.log('Fetching posts with profiles...');
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          subject,
          created_at,
          user_id,
          image_url,
          profiles (
            id,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Log the returned data to debug
      console.log('Posts data:', JSON.stringify(data, null, 2));
      
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPosts();

    const channel = supabase
      .channel('posts_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    // Request camera and media library permissions
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraPermission.status === 'granted');

      const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
      setHasMediaLibraryPermission(mediaLibraryPermission.status === 'granted');
    })();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handlePost = async () => {
    if (!newPost.trim() && !imageUri) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/auth');
        return;
      }

      // Upload image if available
      let imageUrl = null;
      if (imageUri) {
        setUploadingImage(true);
        imageUrl = await uploadImageAsync(imageUri);
        setUploadingImage(false);
        
        if (!imageUrl) {
          setError('Failed to upload image. Your post will be created without the image.');
        }
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: newPost.trim(),
          subject: postTitle.trim() || null,
          image_url: imageUrl,
        });

      if (error) throw error;

      setNewPost('');
      setPostTitle('');
      setImageUri(null);
      setShowInput(false);
      loadPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      // Get the post to delete its image if it has one
      const { data: post } = await supabase
        .from('posts')
        .select('image_url')
        .eq('id', postId)
        .single();
      
      // Delete the post
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      
      setShowPostOptions(null);
      // Post will be removed through the realtime subscription
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post');
    }
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diff = now.getTime() - postDate.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const getDisplayName = (post: Post) => {
    // Debug the post object to see what's available
    console.log(`Post ${post.id} profile:`, post.profiles);
    
    // Always show the actual name from the profile
    if (post.profiles && post.profiles.full_name) {
      return post.profiles.full_name;
    }
    
    return 'Anonymous User';
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setError('Failed to pick image');
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      
      setImageUri(photo.uri);
      setShowCamera(false);
    } catch (error) {
      console.error('Error taking picture:', error);
      setError('Failed to take picture');
    }
  };

  const togglePostOptions = (postId: string | null) => {
    setShowPostOptions(postId);
  };

  const toggleInput = () => {
    if (showInput) {
      // Hide input
      inputHeight.value = withTiming(0, { duration: 300 });
      fabScale.value = withSpring(1);
      
      // Delay setting showInput to false to allow animation to complete
      setTimeout(() => {
        setShowInput(false);
      }, 300);
    } else {
      // Show input
      setShowInput(true);
      inputHeight.value = withTiming(1, { duration: 300 });
      fabScale.value = withSpring(0);
      
      // Scroll to top after input is shown
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }]
  }));

  const inputStyle = useAnimatedStyle(() => ({
    opacity: inputHeight.value,
    transform: [{ translateY: (1 - inputHeight.value) * 50 }]
  }));

  if (showCamera) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0A0B1F', '#141537', '#0A0B1F']}
          style={styles.background}
        >
          {hasCameraPermission ? (
            <View style={styles.cameraContainer}>
              <Camera
                ref={cameraRef}
                style={styles.camera}
                type={CameraType.back}
              />
              <View style={styles.cameraControls}>
                <Pressable
                  style={styles.cameraButton}
                  onPress={() => setShowCamera(false)}
                >
                  <Ionicons name="close" size={28} color="#ffffff" />
                </Pressable>
                <Pressable
                  style={styles.captureButton}
                  onPress={takePicture}
                >
                  <View style={styles.captureButtonInner} />
                </Pressable>
                <Pressable
                  style={styles.cameraButton}
                  onPress={() => {
                    // Toggle camera type
                  }}
                >
                  <Ionicons name="camera-reverse" size={28} color="#ffffff" />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.noCameraContainer}>
              <Text style={styles.noCameraText}>Camera permission not granted</Text>
              <Pressable
                style={styles.button}
                onPress={() => setShowCamera(false)}
              >
                <Text style={styles.buttonText}>Go Back</Text>
              </Pressable>
            </View>
          )}
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
        <View style={styles.header}>
          <Text style={styles.title}>Community</Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#ffffff"
            />
          }
        >
          {showInput && (
            <Animated.View 
              style={[styles.createPostContainer, inputStyle]}
            >
              <View style={styles.createPost}>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userInitial}>{currentUserName.charAt(0)}</Text>
                  </View>
                  <View style={styles.userNameContainer}>
                    <Text style={styles.userName}>{currentUserName}</Text>
                    <Text style={styles.userPrompt}>What's on your mind?</Text>
                  </View>
                </View>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.titleInput}
                    placeholder="Add a title (optional)"
                    placeholderTextColor="#ffffff66"
                    value={postTitle}
                    onChangeText={setPostTitle}
                    maxLength={100}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Share your thoughts..."
                    placeholderTextColor="#ffffff66"
                    value={newPost}
                    onChangeText={setNewPost}
                    multiline
                    maxLength={280}
                    autoFocus
                  />
                  
                  {imageUri && (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                      <Pressable
                        style={styles.removeImageButton}
                        onPress={() => setImageUri(null)}
                      >
                        <Ionicons name="close-circle" size={24} color="#ffffff" />
                      </Pressable>
                    </View>
                  )}
                  
                  <View style={styles.mediaButtons}>
                    <Pressable 
                      style={({ pressed }) => [
                        styles.mediaButton,
                        pressed && styles.mediaButtonPressed
                      ]}
                      onPress={pickImage}
                    >
                      <Ionicons name="image-outline" size={22} color="#ffffff99" />
                    </Pressable>
                    <Pressable 
                      style={({ pressed }) => [
                        styles.mediaButton,
                        pressed && styles.mediaButtonPressed
                      ]}
                      onPress={() => setShowCamera(true)}
                    >
                      <Ionicons name="camera-outline" size={22} color="#ffffff99" />
                    </Pressable>
                    <Pressable 
                      style={({ pressed }) => [
                        styles.mediaButton,
                        pressed && styles.mediaButtonPressed
                      ]}
                    >
                      <Ionicons name="location-outline" size={22} color="#ffffff99" />
                    </Pressable>
                    <View style={styles.mediaButtonSpacer} />
                    <Pressable
                      style={({ pressed }) => [
                        styles.postButton,
                        pressed && styles.buttonPressed,
                        ((!newPost.trim() && !imageUri) || loading) && styles.buttonDisabled
                      ]}
                      onPress={handlePost}
                      disabled={(!newPost.trim() && !imageUri) || loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Ionicons 
                          name="paper-plane" 
                          size={20} 
                          color={(!newPost.trim() && !imageUri) ? '#ffffff44' : '#ffffff'} 
                        />
                      )}
                    </Pressable>
                  </View>
                </View>
                
                <Pressable
                  style={styles.cancelButton}
                  onPress={toggleInput}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {error && (
            <Animated.View 
              entering={FadeIn}
              exiting={FadeOut}
              style={styles.errorContainer}
            >
              <Ionicons name="alert-circle" size={20} color="#ff4444" />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => setError(null)}>
                <Ionicons name="close-circle" size={20} color="#ff4444" />
              </Pressable>
            </Animated.View>
          )}

          {loading && !refreshing && posts.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text style={styles.loadingText}>Loading posts...</Text>
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Animated.View 
                entering={FadeInDown.delay(300)}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="chatbubble-outline" size={64} color="#ffffff44" />
              </Animated.View>
              <Animated.Text 
                entering={FadeInDown.delay(400)}
                style={styles.emptyTitle}
              >
                No posts yet
              </Animated.Text>
              <Animated.Text 
                entering={FadeInDown.delay(500)}
                style={styles.emptyText}
              >
                Be the first to share something with the community
              </Animated.Text>
              <Animated.View entering={FadeInDown.delay(600)}>
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyButton,
                    pressed && styles.buttonPressed
                  ]}
                  onPress={toggleInput}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.emptyButtonText}>Create Post</Text>
                </Pressable>
              </Animated.View>
            </View>
          ) : (
            <View style={styles.posts}>
              {posts.map((post, index) => (
                <Animated.View
                  key={post.id}
                  entering={FadeInDown.delay(index * 100).springify()}
                  style={styles.post}
                >
                  <View style={styles.postHeader}>
                    <View style={styles.postUser}>
                      <View style={styles.postAvatar}>
                        <Text style={styles.postAvatarText}>
                          {post.profiles?.full_name?.charAt(0) || 'A'}
                        </Text>
                      </View>
                      <View style={styles.postUserInfo}>
                        <Text style={styles.postUserName}>
                          {getDisplayName(post)}
                        </Text>
                        <Text style={styles.postTime}>
                          {formatDate(post.created_at)}
                        </Text>
                      </View>
                    </View>
                    
                    <Pressable
                      style={styles.postOptionsButton}
                      onPress={() => togglePostOptions(post.id)}
                    >
                      <Ionicons name="ellipsis-horizontal" size={20} color="#ffffff99" />
                    </Pressable>
                    
                    {showPostOptions === post.id && (
                      <Animated.View 
                        entering={ZoomIn.springify()}
                        style={styles.postOptionsMenu}
                      >
                        {post.user_id === currentUserId && (
                          <Pressable
                            style={styles.postOptionItem}
                            onPress={() => handleDeletePost(post.id)}
                          >
                            <Ionicons name="trash-outline" size={18} color="#ff4444" />
                            <Text style={styles.postOptionTextDelete}>Delete</Text>
                          </Pressable>
                        )}
                        <Pressable
                          style={styles.postOptionItem}
                          onPress={() => togglePostOptions(null)}
                        >
                          <Ionicons name="close-outline" size={18} color="#ffffff" />
                          <Text style={styles.postOptionText}>Cancel</Text>
                        </Pressable>
                      </Animated.View>
                    )}
                  </View>
                  
                  {post.subject && (
                    <Text style={styles.postTitle}>{post.subject}</Text>
                  )}
                  
                  <Text style={styles.postContent}>{post.content}</Text>
                  
                  {post.image_url && (
                    <Image 
                      source={{ uri: post.image_url }} 
                      style={styles.postImage}
                      resizeMode="cover"
                    />
                  )}
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>

        <Animated.View style={[styles.fabContainer, fabStyle]}>
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              pressed && styles.fabPressed
            ]}
            onPress={toggleInput}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </Pressable>
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
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  createPostContainer: {
    padding: 20,
  },
  createPost: {
    backgroundColor: '#ffffff11',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffffff22',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6C63FF33',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  userInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  userNameContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  userPrompt: {
    fontSize: 14,
    color: '#ffffff66',
    marginTop: 2,
  },
  inputContainer: {
    backgroundColor: '#ffffff11',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  titleInput: {
    color: '#ffffff',
    fontSize: 16,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff22',
  },
  input: {
    color: '#ffffff',
    fontSize: 16,
    minHeight: 80,
    maxHeight: 120,
    padding: 8,
    textAlignVertical: 'top',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 8,
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
  },
  mediaButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  mediaButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff11',
    marginRight: 12,
  },
  mediaButtonPressed: {
    backgroundColor: '#ffffff22',
    transform: [{ scale: 0.95 }],
  },
  mediaButtonSpacer: {
    flex: 1,
  },
  postButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: '#5149CC',
    transform: [{ scale: 0.95 }],
  },
  buttonDisabled: {
    backgroundColor: '#ffffff11',
  },
  cancelButton: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: '#ffffff99',
    fontSize: 15,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff444422',
    padding: 12,
    borderRadius: 8,
    margin: 16,
    gap: 8,
  },
  errorText: {
    color: '#ff4444',
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff99',
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 60,
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
  posts: {
    padding: 20,
    gap: 20,
  },
  post: {
    backgroundColor: '#ffffff11',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffffff11',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    position: 'relative',
  },
  postUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C63FF33',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  postUserInfo: {
    flex: 1,
  },
  postUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  postTime: {
    fontSize: 14,
    color: '#ffffff66',
  },
  postOptionsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postOptionsMenu: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 8,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#ffffff22',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  postOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  postOptionText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 14,
  },
  postOptionTextDelete: {
    color: '#ff4444',
    marginLeft: 8,
    fontSize: 14,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  postContent: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 250,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabPressed: {
    backgroundColor: '#5149CC',
    transform: [{ scale: 0.95 }],
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
  },
  noCameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noCameraText: {
    color: '#ffffff',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});