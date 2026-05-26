import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';

/**
 * Magazine identity (name, slogan, description, logos).
 *
 * Fetched once on app load and refreshed after the super admin edits it via
 * the admin panel. Other components read from here instead of hardcoding
 * "La Rabia" / static logo paths.
 *
 * Logo URLs in the DB can be either:
 *   - A bare front-end-relative path like "/LogoLaRabiaWhite.png" (default seed
 *     value, served from front-end/public)
 *   - A back-end path like "/uploads/magazine-metadata/logo-light.webp"
 *     (after a super admin uploads a new logo)
 *
 * resolveLogoUrl() turns either into a full URL the <img src> can use.
 */
const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://api.larabia.uribarri.online';

const DEFAULTS = {
  name: 'La Rabia',
  slogan: 'Revista comunitaria del distrito 02 de Bilbao',
  description: '',
  logo_light: '/LogoLaRabiaWhite.png',
  logo_dark: '/logoLaRabiaBlack.png'
};

const MetadataContext = createContext();

export const MetadataProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [metadata, setMetadata] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const fetchMetadata = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/magazine-metadata');
      if (!res.data.error && res.data.data) {
        // Merge with defaults so any newly added field falls back to its default
        setMetadata({ ...DEFAULTS, ...res.data.data });
      }
    } catch (err) {
      // Non-fatal — fall back to defaults
      console.warn('Magazine metadata fetch failed, using defaults:', err.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Super-admin actions
  const updateMetadata = useCallback(async ({ name, slogan, description }) => {
    try {
      const res = await axiosInstance.patch(
        '/magazine-metadata',
        { name, slogan, description },
        { headers: { 'x-user-id': currentUser?.id_user } }
      );
      if (res.data.error) return { error: res.data.error };
      setMetadata((prev) => ({ ...prev, ...res.data.data }));
      return { success: res.data.success || 'Datos actualizados', data: res.data.data };
    } catch (err) {
      return { error: err.response?.data?.error || 'Error al actualizar los datos' };
    }
  }, [currentUser]);

  const uploadLogo = useCallback(async (file, variant /* 'light' | 'dark' */) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await axiosInstance.post(
        `/magazine-metadata/upload-logo?variant=${variant}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'x-user-id': currentUser?.id_user
          }
        }
      );
      if (res.data.error) return { error: res.data.error };
      setMetadata((prev) => ({ ...prev, ...res.data.data }));
      return { success: res.data.success || 'Logo actualizado', data: res.data.data };
    } catch (err) {
      return { error: err.response?.data?.error || 'Error al subir el logo' };
    }
  }, [currentUser]);

  /**
   * Turn a stored logo path into a full image URL.
   *   "/uploads/..." → backend URL
   *   "/Foo.png"     → front-end public/ relative (return as-is, browser resolves)
   *   "http(s)://X"  → external URL, return as-is
   *   missing        → null
   */
  const resolveLogoUrl = useCallback((value) => {
    if (!value) return null;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('/uploads/')) return `${apiBaseUrl}${value}`;
    return value;
  }, []);

  const value = {
    metadata,
    loaded,
    fetchMetadata,
    updateMetadata,
    uploadLogo,
    resolveLogoUrl
  };

  return <MetadataContext.Provider value={value}>{children}</MetadataContext.Provider>;
};

export const useMetadata = () => {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error('useMetadata must be used within a MetadataProvider');
  }
  return context;
};

export default MetadataContext;
