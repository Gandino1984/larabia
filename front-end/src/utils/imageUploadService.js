// magazine-front/src/utils/imageUploadService.js
import axiosInstance from './axiosConfig.js';

/**
 * Format image URL for display
 * @param {string} imagePath - Relative path from database
 * @returns {string} - Full URL for image
 */
export const formatImageUrl = (imagePath) => {
  if (!imagePath) {
    console.log('No image path provided to format');
    return null;
  }

  if (typeof imagePath === 'string' && imagePath.trim() === '') {
    console.log('Empty image path provided to format');
    return null;
  }

  try {
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('blob:') || imagePath.startsWith('data:')) {
      return imagePath;
    }

    const cleanPath = imagePath.replace(/^\/+/, '');
    const baseURL = axiosInstance.defaults.baseURL;

    let finalPath;

    if (cleanPath.startsWith('assets/images/')) {
      finalPath = cleanPath;
    } else if (cleanPath.startsWith('assets/')) {
      finalPath = cleanPath;
    } else if (cleanPath.startsWith('images/')) {
      finalPath = cleanPath;
    } else if (cleanPath.startsWith('public/images/')) {
      finalPath = cleanPath.replace('public/', '');
    } else {
      finalPath = cleanPath;
    }

    // Encode each path segment to handle special characters and spaces
    const pathSegments = finalPath.split('/');
    const encodedSegments = pathSegments.map(segment => {
      return encodeURIComponent(segment);
    });
    const encodedPath = encodedSegments.join('/');

    const fullUrl = `${baseURL}/${encodedPath}`;

    console.log('Formatted image URL:', {
      original: imagePath,
      clean: cleanPath,
      final: finalPath,
      encoded: encodedPath,
      fullUrl: fullUrl
    });

    return fullUrl;
  } catch (error) {
    console.error('Error formatting image URL:', error);
    console.error('Problem image path:', imagePath);
    return null;
  }
};

/**
 * Upload user profile image
 * @param {Object} options - Upload options
 * @param {File} options.file - Image file to upload
 * @param {string} options.userName - User name (not ID!)
 * @param {Function} options.onProgress - Progress callback
 * @param {Function} options.onError - Error callback
 * @returns {Promise<string>} - Uploaded image path
 */
export const uploadUserImage = async ({ file, userName, onProgress, onError }) => {
  try {
    if (!file || !userName) {
      const errorMsg = 'Missing required parameters for user image upload';
      console.error(errorMsg);
      if (onError) onError(errorMsg);
      throw new Error(errorMsg);
    }

    console.log('Uploading user image:', {
      fileName: file.name,
      fileSize: Math.round(file.size / 1024) + 'KB',
      fileType: file.type,
      userName
    });

    const formData = new FormData();
    formData.append('profileImage', file);

    console.log('Sending request with headers:', {
      'Content-Type': 'multipart/form-data',
      'x-user-name': userName
    });

    const response = await axiosInstance.post('/user/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-user-name': userName
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
          onProgress(percentCompleted);
        }
      }
    });

    console.log('User image upload response:', response.data);

    if (response.data.error) {
      const errorMsg = response.data.error;
      console.error('Server returned error:', errorMsg);
      if (onError) onError(errorMsg);
      throw new Error(errorMsg);
    }

    if (!response.data.data || !response.data.data.image_user) {
      const errorMsg = 'No image path returned from server';
      console.error(errorMsg);
      if (onError) onError(errorMsg);
      throw new Error(errorMsg);
    }

    const imagePath = response.data.data.image_user;
    console.log('User image uploaded successfully:', imagePath);

    return imagePath;
  } catch (error) {
    console.error('Error uploading user image:', error);

    const errorMsg = error.response?.data?.error
      || error.response?.data?.details
      || error.message
      || 'Error uploading user image';

    if (onError) onError(errorMsg);
    throw new Error(errorMsg);
  }
};

export const uploadProfileImage = uploadUserImage;

export default {
  formatImageUrl,
  uploadUserImage,
  uploadProfileImage
};
