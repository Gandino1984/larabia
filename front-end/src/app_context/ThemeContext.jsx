import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';
import {
  resolveTokens,
  resolveLandingColor,
  ANIMATION_SPEED_SCALE
} from './themePresets';

/**
 * Magazine theme (color scheme, landing background, animation behavior).
 *
 * Fetched once on app load and applied to <html> as CSS custom properties +
 * data-attributes. Components read colors via var(--color-…) (see index.css),
 * so re-applying here re-themes the whole app live. Defaults reproduce the
 * original design, so nothing changes until a super admin edits the theme.
 *
 * Mirrors MetadataContext: super-admin mutations send the x-user-id header;
 * the back-end re-checks the role (never trust the client).
 */
const DEFAULT_THEME = {
  preset: 'default',
  tokens: {},
  landing_bg_type: 'color',
  landing_bg_value: null,
  animations_enabled: true,
  animation_speed: 'normal',
  respect_reduced_motion: true
};

const flag = (v) => v === true || v === 1;

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [loaded, setLoaded] = useState(false);

  // Apply a theme object to the document root. Pure DOM side-effect — safe to
  // call repeatedly (used for live preview in the admin panel too).
  const applyTheme = useCallback((t) => {
    const root = document.documentElement;
    const tokens = resolveTokens(t);
    for (const [key, value] of Object.entries(tokens)) {
      root.style.setProperty(key, value);
    }
    root.style.setProperty('--landing-bg', resolveLandingColor(t));
    root.style.setProperty('--anim-scale', String(ANIMATION_SPEED_SCALE[t.animation_speed] ?? 1));
    root.setAttribute('data-animations', flag(t.animations_enabled) ? 'on' : 'off');
    root.setAttribute('data-respect-reduced-motion', flag(t.respect_reduced_motion) ? 'true' : 'false');
  }, []);

  const fetchTheme = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/magazine-theme');
      if (!res.data.error && res.data.data) {
        setTheme({ ...DEFAULT_THEME, ...res.data.data });
      }
    } catch (err) {
      // Non-fatal — fall back to defaults (the original look).
      console.warn('Magazine theme fetch failed, using defaults:', err.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  // Re-apply whenever the stored theme changes.
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Super-admin: persist a patch. On success the local state updates, which
  // re-applies the theme via the effect above.
  const updateTheme = useCallback(async (patch) => {
    try {
      const res = await axiosInstance.patch('/magazine-theme', patch, {
        headers: { 'x-user-id': currentUser?.id_user }
      });
      if (res.data.error) return { error: res.data.error };
      setTheme((prev) => ({ ...prev, ...res.data.data }));
      return { success: res.data.success || 'Tema actualizado', data: res.data.data };
    } catch (err) {
      return { error: err.response?.data?.error || 'Error al actualizar el tema' };
    }
  }, [currentUser]);

  const uploadBackground = useCallback(async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await axiosInstance.post('/magazine-theme/upload-background', formData, {
        headers: { 'x-user-id': currentUser?.id_user, 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.error) return { error: res.data.error };
      setTheme((prev) => ({ ...prev, ...res.data.data }));
      return { success: res.data.success || 'Fondo actualizado', data: res.data.data };
    } catch (err) {
      return { error: err.response?.data?.error || 'Error al subir el fondo' };
    }
  }, [currentUser]);

  const value = {
    theme,
    loaded,
    fetchTheme,
    updateTheme,
    uploadBackground,
    applyTheme // exposed for live preview in the admin panel
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};

export default ThemeContext;
