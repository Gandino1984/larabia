// magazine-front/src/app_context/AuthorContext.jsx
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import i18n from '../i18n/config';
import axiosInstance from '../utils/axiosConfig';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

const AuthorContext = createContext();

export const AuthorProvider = ({ children }) => {
  const { showSuccess, showError } = useUI();
  const { currentUser } = useAuth();
  const callerId = currentUser?.id_user;

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
      showError(i18n.t('messages.error.loadAuthorProfiles', 'Error al cargar los perfiles de autores'));
      return { error: i18n.t('messages.error.loadProfiles', 'Error al cargar los perfiles') };
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
      showError(i18n.t('messages.error.loadAllProfiles', 'Error al cargar todos los perfiles'));
      return { error: i18n.t('messages.error.loadProfiles', 'Error al cargar los perfiles') };
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Fetch all editor users (super admin only) — with the authors they
   * invited who haven't answered yet.
   */
  const fetchEditorUsers = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/user/editors', { headers: { 'x-user-id': callerId } });
      if (!response.data.error) {
        setEditorUsers(response.data.data || []);
        return { success: true, data: response.data.data };
      }
      return { error: response.data.error };
    } catch (err) {
      console.error('AuthorContext - fetchEditorUsers error:', err);
      return { error: i18n.t('messages.error.loadEditors', 'Error al cargar los editores') };
    }
  }, [callerId]);

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
      showError(i18n.t('messages.error.loadFeaturedProfiles', 'Error al cargar perfiles destacados'));
      return { error: i18n.t('messages.error.loadFeaturedProfiles', 'Error al cargar perfiles destacados') };
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
      showError(i18n.t('messages.error.loadProfile', 'Error al cargar el perfil'));
      return { error: i18n.t('messages.error.loadProfile', 'Error al cargar el perfil') };
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
      return { error: i18n.t('messages.error.loadMyProfile', 'Error al cargar tu perfil') };
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
        showSuccess(response.data.success || i18n.t('messages.success.profileCreated', 'Perfil creado exitosamente'));
        // Refresh profiles list
        await fetchAllProfiles();
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('AuthorContext - createProfile error:', err);
      const errorMsg = err.response?.data?.error || i18n.t('messages.error.createProfile', 'Error al crear el perfil');
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
        showSuccess(response.data.success || i18n.t('messages.success.profileUpdated', 'Perfil actualizado exitosamente'));
        // Refresh published profiles list
        await fetchAllProfiles();
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('AuthorContext - updateProfile error:', err);
      const errorMsg = err.response?.data?.error || i18n.t('messages.error.updateProfile', 'Error al actualizar el perfil');
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

      // x-profile-user-id: whose profile (a super admin may edit someone's);
      // who is sending it goes in x-user-id (utils/axiosConfig.js).
      const response = await axiosInstance.post('/author-profile/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-profile-user-id': userId
        }
      });

      if (!response.data.error) {
        showSuccess(response.data.success || i18n.t('messages.success.imageUpdated', 'Imagen actualizada correctamente'));
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('AuthorContext - uploadProfileImage error:', err);
      const errorMsg = err.response?.data?.error || i18n.t('messages.error.uploadImage', 'Error al subir la imagen');
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
        showSuccess(response.data.success || i18n.t('messages.success.profileDeleted', 'Perfil eliminado exitosamente'));
        // Refresh profiles list
        await fetchAllProfiles();
        return { success: true };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('AuthorContext - deleteProfile error:', err);
      const errorMsg = err.response?.data?.error || i18n.t('messages.error.deleteProfile', 'Error al eliminar el perfil');
      showError(errorMsg);
      return { error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [showSuccess, showError, fetchAllProfiles]);

  // An author's photo, the one «Autoras/es» shows: their profile's own photo
  // (uploaded in the profile editor), else their account image. Avatars next
  // to names and the author card used only the account image, so an author
  // whose photo is only on the profile (Sidd Joag) showed none there.
  // The published profiles from the start, quietly (no error card): the
  // avatars next to names use their photos — they used to load only when a
  // page asked for them (Autoras/es, a search, the author card).
  useEffect(() => {
    axiosInstance.get('/author-profile')
      .then((res) => {
        if (!res.data?.error) setAuthorProfiles((prev) => (prev.length ? prev : res.data.data || []));
      })
      .catch(() => { /* the avatars fall back to the account images */ });
  }, []);

  const profilePhotoByUser = useMemo(() => {
    const byUser = new Map();
    for (const p of authorProfiles) {
      if (p.profile_image) byUser.set(String(p.user_id), `${apiUrl}/uploads/author-profiles/${encodeURIComponent(p.profile_image)}`);
    }
    return byUser;
  }, [authorProfiles]);
  const authorPhotoOf = useCallback((person) => {
    if (!person) return null;
    const own = person.id_user != null ? profilePhotoByUser.get(String(person.id_user)) : null;
    if (own) return own;
    const img = person.image_user;
    if (!img) return null;
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    return `${apiUrl}/user/image/${encodeURIComponent(img)}`;
  }, [profilePhotoByUser]);

  const value = {
    authorProfiles,
    authorPhotoOf,
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

// The photo to show for a person credited as author (see authorPhotoOf).
export const useAuthorPhoto = () => useAuthor().authorPhotoOf;

export default AuthorContext;
