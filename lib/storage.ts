import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { decode } from 'base64-js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads an image to Supabase Storage
 * @param uri Local URI of the image
 * @param bucket Bucket name
 * @param path Path within the bucket
 * @returns URL of the uploaded image or null if upload failed
 */
export const uploadImageAsync = async (
  uri: string,
  bucket: string = 'images',
  path: string = 'posts'
): Promise<string | null> => {
  try {
    // Generate a unique filename
    const filename = `${path}/${uuidv4()}.jpg`;
    
    // Handle different platforms
    if (Platform.OS === 'web') {
      // For web, fetch the image and upload directly
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      
      if (error) {
        console.error('Error uploading web image:', error);
        return null;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename);
      
      return publicUrl;
    } else {
      // For native platforms, read the file and upload
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert base64 to Uint8Array
      const binaryData = decode(base64);
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, binaryData, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      
      if (error) {
        console.error('Error uploading native image:', error);
        return null;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename);
      
      return publicUrl;
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

/**
 * Deletes an image from Supabase Storage
 * @param url Full URL of the image
 * @param bucket Bucket name
 * @returns True if deletion was successful, false otherwise
 */
export const deleteImageAsync = async (
  url: string,
  bucket: string = 'images'
): Promise<boolean> => {
  try {
    // Extract the path from the URL
    const urlObj = new URL(url);
    const path = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`)[1];
    
    if (!path) {
      console.error('Invalid image URL format');
      return false;
    }
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
};