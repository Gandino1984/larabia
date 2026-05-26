// magazine-front/src/components/user/UserInfoCardUtils.jsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../app_context/AuthContext.jsx';
import { useUI } from '../../app_context/UIContext.jsx';
import { uploadProfileImage } from '../../utils/imageUploadService.js';
import axiosInstance from '../../utils/axiosConfig.js';

export const UserInfoCardUtils = () => {
    const { currentUser, setCurrentUser } = useAuth();
    const { setUploading, setError } = useUI();

    const [uploadProgress, setUploadProgress] = useState(0);
    const [localImageUrl, setLocalImageUrl] = useState(null);
    const imageTimestampRef = useRef(null);

    useEffect(() => {
        return () => {
            if (localImageUrl) {
                URL.revokeObjectURL(localImageUrl);
            }
        };
    }, [localImageUrl]);

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];

        setError(prevError => ({ ...prevError, imageError: "" }));

        if (!file) {
            console.log('User cancelled file selection');
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError(prevError => ({
                ...prevError,
                imageError: "Formato de imagen no válido. Use JPEG, PNG o WebP."
            }));
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError(prevError => ({
                ...prevError,
                imageError: "La imagen es demasiado grande. Máximo 10MB antes de la optimización."
            }));
            return;
        }

        try {
            if (!currentUser?.name_user) {
                throw new Error('No hay usuario activo');
            }

            const localUrl = URL.createObjectURL(file);
            setLocalImageUrl(localUrl);

            setUploading(true);
            setUploadProgress(0);

            console.log('Starting profile image upload for user:', currentUser.name_user);

            const imagePath = await uploadProfileImage({
                file,
                userName: currentUser.name_user,
                onProgress: (progress) => {
                    console.log('Upload progress:', progress);
                    setUploadProgress(progress);
                },
                onError: (errorMessage) => {
                    console.error('Upload error:', errorMessage);
                    setError(prevError => ({
                        ...prevError,
                        imageError: errorMessage
                    }));
                    setLocalImageUrl(null);
                }
            });

            console.log('Image uploaded. Path received:', imagePath);

            imageTimestampRef.current = Date.now();

            const updatedUser = {
                ...currentUser,
                image_user: imagePath
            };

            console.log('Updating user with new image:', updatedUser);

            localStorage.setItem('currentUser', JSON.stringify(updatedUser));

            setCurrentUser(updatedUser);

            setError(prevError => ({ ...prevError, imageError: '' }));

            setTimeout(() => {
                setLocalImageUrl(null);
                console.log('Local URL cleared, using server image');
            }, 2000);

        } catch (err) {
            console.error('Error uploading image:', err);
            setError(prevError => ({
                ...prevError,
                imageError: err.message || "Error al subir el archivo"
            }));
            setLocalImageUrl(null);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const getImageUrl = (imagePath) => {
        // If we have a local image URL (from recent upload), use that first
        if (localImageUrl) {
            console.log('Using local image URL for immediate display:', localImageUrl);
            return localImageUrl;
        }

        if (!imagePath) {
            console.error('No image path provided');
            return null;
        }

        try {
            const baseURL = axiosInstance.defaults.baseURL;

            // Check if it's just a username (no slashes) or a simple path
            const isUsernameOnly = !imagePath.includes('/') && !imagePath.startsWith('http');

            let imageUrl;
            if (isUsernameOnly) {
                // Use the dedicated user image endpoint
                const encodedUsername = encodeURIComponent(imagePath);
                imageUrl = `${baseURL}/user/image/${encodedUsername}`;
            } else if (imagePath.startsWith('http') || imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
                // Already a full URL
                imageUrl = imagePath;
            } else {
                // Legacy path format - try to construct from assets path
                const cleanPath = imagePath.replace(/^\/+/, '');
                const pathSegments = cleanPath.split('/');
                const encodedSegments = pathSegments.map(segment => encodeURIComponent(segment));
                const encodedPath = encodedSegments.join('/');
                imageUrl = `${baseURL}/${encodedPath}`;
            }

            // Add cache-busting timestamp if we recently uploaded
            if (imageTimestampRef.current) {
                imageUrl += (imageUrl.includes('?') ? '&' : '?') + '_t=' + imageTimestampRef.current;
            }

            console.log('Generated user image URL:', {
                originalPath: imagePath,
                generatedUrl: imageUrl
            });

            return imageUrl;
        } catch (error) {
            console.error('Error generating image URL:', error);
            return null;
        }
    };

    return {
        getImageUrl,
        handleImageUpload,
        uploadProgress,
        localImageUrl
    };
};
