// magazine-front/src/app_context/AuthorContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { useUI } from './UIContext';

const AuthorContext = createContext();

export const AuthorProvider = ({ children }) => {
  const { showSuccess, showError } = useUI();

  const [authorProfiles, setAuthorProfiles] = useState([]);
  const [allProfilesAdmin, setAllProfilesAdmin] = useState([]);
  const [editorUsers, setEditorUsers] = useState([]);
  const [featuredProfiles, setFeaturedProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authorSearch, setAuthorSearch] = useState('');

  /**
   * Fetch all published author profiles
   */
  const fetchAllProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/author-profile');

      if (!response.data.error) {
        setAuthorProfiles(response.data.data || []);
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('AuthorContext - fetchAllProfiles error:', err);
      showError('Error al cargar los perfiles de autores');
      return { error: 'Error al cargar los perfiles' };
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Fetch ALL author profiles including drafts (super admin only)
   */
  const fetchAllProfilesAdmin = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/author-profile/all');

      if (!response.data.error) {
        setAllProfilesAdmin(response.data.data || []);
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('AuthorContext - fetchAllProfilesAdmin error:', err);
      showError('Error al cargar todos los perfiles');
      return { error: 'Error al cargar los perfiles' };
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Fetch all editor users (super admin only)
   */
  const fetchEditorUsers = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/user/editors');
      if (!response.data.error) {
        setEditorUsers(response.data.data || []);
        return { success: true, data: response.data.data };
      }
      return { error: response.data.error };
    } catch (err) {
      console.error('AuthorContext - fetchEditorUsers error:', err);
      return { error: 'Error al cargar los editores' };
    }
  }, []);

  /**
   * Fetch featured author profiles only
   */
  const fetchFeaturedProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/author-profile/featured');

      if (!response.data.error) {
        setFeaturedProfiles(response.data.data || []);
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('AuthorContext - fetchFeaturedProfiles error:', err);
      showError('Error al cargar perfiles destacados');
      return { error: 'Error al cargar perfiles destacados' };
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Fetch a single profile by ID
   */
  const fetchProfileById = useCallback(async (id_author_profile) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/author-profile/by-id/${id_author_profile}`);

      if (!response.data.error) {
        setSelectedProfile(response.data.data);
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('AuthorContext - fetchProfileById error:', err);
      showError('Error al cargar el perfil');
      return { error: 'Error al cargar el perfil' };
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Fetch profile by user ID (for editors to load their own profile)
   */
  const fetchMyProfile = useCallback(async (userId) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/author-profile/by-user/${userId}`);

      if (!response.data.error) {
        setMyProfile(response.data.data);
        return { success: true, data: response.data.data };
      } else {
        // Not an error if profile doesn't exist yet
        setMyProfile(null);
        return { success: true, data: null };
      }
    } catch (err) {
      console.error('AuthorContext - fetchMyProfile error:', err);
      setMyProfile(null);
      return { error: 'Error al cargar tu perfil' };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new author profile
   */
  const createProfile = useCallback(async (profileData) => {
    try {
      setLoading(true);
      const response = await axiosInstance.post('/author-profile/create', profileData);

      if (!response.data.error) {
        setMyProfile(response.data.data);
        showSuccess(response.data.success || 'Perfil creado exitosamente');
        // Refresh profiles list
        await fetchAllProfiles();
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('AuthorContext - createProfile error:', err);
      const errorMsg = err.response?.data?.error || 'Error al crear el perfil';
      showError(errorMsg);
      return { error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError, fetchAllProfiles]);

  /**
   * Update an existing author profile.
   * Pass { updateMyProfile: false } when super admin is editing another user's profile
   * to avoid corrupting the super admin's own myProfile state.
   */
  const updateProfile = useCallback(async (id_author_profile, profileData, { updateMyProfile = true } = {}) => {
    try {
      setLoading(true);
      const response = await axiosInstance.patch(`/author-profile/update/${id_author_profile}`, profileData);

      if (!response.data.error) {
        if (updateMyProfile) {
          setMyProfile(response.data.data);
        }
        showSuccess(response.data.success || 'Perfil actualizado exitosamente');
        // Refresh published profiles list
        await fetchAllProfiles();
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('AuthorContext - updateProfile error:', err);
      const errorMsg = err.response?.data?.error || 'Error al actualizar el perfil';
      showError(errorMsg);
      return { error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError, fetchAllProfiles]);

  /**
   * Upload a custom profile image for the author
   */
  const uploadProfileImage = useCallback(async (userId, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await axiosInstance.post('/author-profile/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-user-id': userId
        }
      });

      if (!response.data.error) {
        showSuccess(response.data.success || 'Imagen actualizada correctamente');
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('AuthorContext - uploadProfileImage error:', err);
      const errorMsg = err.response?.data?.error || 'Error al subir la imagen';
      showError(errorMsg);
      return { error: errorMsg };
    }
  }, [showSuccess, showError]);

  /**
   * Delete an author profile
   */
  const deleteProfile = useCallback(async (id_author_profile) => {
    try {
      setLoading(true);
      const response = await axiosInstance.delete(`/author-profile/remove-by-id/${id_author_profile}`);

      if (!response.data.error) {
        setMyProfile(null);
        showSuccess(response.data.success || 'Perfil eliminado exitosamente');
        // Refresh profiles list
        await fetchAllProfiles();
        return { success: true };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('AuthorContext - deleteProfile error:', err);
      const errorMsg = err.response?.data?.error || 'Error al eliminar el perfil';
      showError(errorMsg);
      return { error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError, fetchAllProfiles]);

  const value = {
    authorProfiles,
    allProfilesAdmin,
    editorUsers,
    featuredProfiles,
    selectedProfile,
    myProfile,
    loading,
    authorSearch,
    setAuthorSearch,
    setSelectedProfile,
    setMyProfile,
    fetchAllProfiles,
    fetchAllProfilesAdmin,
    fetchEditorUsers,
    fetchFeaturedProfiles,
    fetchProfileById,
    fetchMyProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    uploadProfileImage
  };

  return <AuthorContext.Provider value={value}>{children}</AuthorContext.Provider>;
};

export const useAuthor = () => {
  const context = useContext(AuthorContext);
  if (!context) {
    throw new Error('useAuthor must be used within an AuthorProvider');
  }
  return context;
};

export default AuthorContext;
