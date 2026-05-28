import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';
import { DEFAULT_NAV } from './navConfig';

/**
 * Configurable top-bar navigation.
 *
 * Fetches /magazine-nav once on load. If the stored nav_config is null/empty
 * (un-customized), `navConfig` resolves to the built-in DEFAULT_NAV so the bar
 * is unchanged. Super admins edit it via the admin panel; the back-end re-checks
 * the role on every mutation. Mirrors MetadataContext / ThemeContext.
 */
const NavContext = createContext();

export const NavProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [rawConfig, setRawConfig] = useState(null); // exactly what the DB holds (may be null)
  const [loaded, setLoaded] = useState(false);

  const fetchNav = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/magazine-nav');
      if (!res.data.error && res.data.data) {
        setRawConfig(res.data.data.nav_config ?? null);
      }
    } catch (err) {
      // Non-fatal — fall back to the default nav.
      console.warn('Magazine nav fetch failed, using default nav:', err.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchNav();
  }, [fetchNav]);

  // Super-admin: replace the nav config (pass null to reset to default).
  const updateNav = useCallback(async (navConfig) => {
    try {
      const res = await axiosInstance.patch(
        '/magazine-nav',
        { nav_config: navConfig },
        { headers: { 'x-user-id': currentUser?.id_user } }
      );
      if (res.data.error) return { error: res.data.error };
      setRawConfig(res.data.data?.nav_config ?? null);
      return { success: res.data.success || 'Navegación actualizada', data: res.data.data };
    } catch (err) {
      return { error: err.response?.data?.error || 'Error al actualizar la navegación' };
    }
  }, [currentUser]);

  // Resolved config the header actually renders: stored config if it has items,
  // otherwise the built-in default.
  const navConfig = Array.isArray(rawConfig) && rawConfig.length > 0 ? rawConfig : DEFAULT_NAV;
  const isCustom = Array.isArray(rawConfig) && rawConfig.length > 0;

  const value = { navConfig, rawConfig, isCustom, loaded, fetchNav, updateNav };

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
};

export const useNav = () => {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within a NavProvider');
  return ctx;
};

export default NavContext;
