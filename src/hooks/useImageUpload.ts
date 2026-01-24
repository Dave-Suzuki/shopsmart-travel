import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from '../services/firebase';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (file: File, itemId: string): Promise<string> => {
    setUploading(true);
    setError(null);

    try {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Get current user ID
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User must be authenticated to upload images');
      }

      // Create a reference to 'images/{userId}/{itemId}/original'
      const storageRef = ref(storage, `images/${userId}/${itemId}/original`);

      // Upload the file
      await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      setUploading(false);
      return downloadURL;
    } catch (err) {
      console.error('Error uploading image:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      setError(errorMessage);
      setUploading(false);
      throw new Error(errorMessage);
    }
  };

  const deleteImage = async (itemId: string): Promise<void> => {
    try {
      // Get current user ID
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User must be authenticated to delete images');
      }

      const storageRef = ref(storage, `images/${userId}/${itemId}/original`);
      await deleteObject(storageRef);
    } catch (err) {
      console.error('Error deleting image:', err);
      // Don't throw error if image doesn't exist
      if ((err as any).code !== 'storage/object-not-found') {
        throw new Error('Failed to delete image');
      }
    }
  };

  return {
    uploadImage,
    deleteImage,
    uploading,
    error,
  };
}
