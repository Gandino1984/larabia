// magazine-front/src/app_context/EngagementContext.jsx
//
// Likes, favorites and comments for articles. Likes/favorites are per-user
// toggles; the card icons fill based on likedIds / favoritedIds. Comments live
// in a modal opened from the card.
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

const EngagementContext = createContext(null);

export const EngagementProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { showError } = useUI();
  const [likedIds, setLikedIds] = useState([]);
  const [favoritedIds, setFavoritedIds] = useState([]);

  const authHeader = useCallback(
    () => ({ headers: { 'x-user-id': currentUser?.id_user } }),
    [currentUser]
  );

  // Load the current user's liked/favorited article ids whenever they log in.
  const fetchMyEngagement = useCallback(async () => {
    if (!currentUser?.id_user) {
      setLikedIds([]);
      setFavoritedIds([]);
      return;
    }
    try {
      const res = await axiosInstance.get('/engagement/my', authHeader());
      if (!res.data.error && res.data.data) {
        setLikedIds(res.data.data.likedIds || []);
        setFavoritedIds(res.data.data.favoritedIds || []);
      }
    } catch (err) {
      // Non-fatal — the icons just stay empty.
      console.warn('fetchMyEngagement failed:', err.message);
    }
  }, [currentUser, authHeader]);

  useEffect(() => {
    fetchMyEngagement();
  }, [fetchMyEngagement]);

  const isLiked = useCallback((id) => likedIds.includes(id), [likedIds]);
  const isFavorited = useCallback((id) => favoritedIds.includes(id), [favoritedIds]);

  const toggleLike = useCallback(async (id_article) => {
    if (!currentUser?.id_user) {
      showError('Inicia sesión para dar me gusta');
      return;
    }
    // Optimistic update.
    setLikedIds(prev => prev.includes(id_article) ? prev.filter(x => x !== id_article) : [...prev, id_article]);
    try {
      const res = await axiosInstance.post(`/engagement/like/${id_article}`, {}, authHeader());
      if (res.data.error) throw new Error(res.data.error);
      // Reconcile with server truth.
      setLikedIds(prev => {
        const has = prev.includes(id_article);
        if (res.data.data.liked && !has) return [...prev, id_article];
        if (!res.data.data.liked && has) return prev.filter(x => x !== id_article);
        return prev;
      });
    } catch (err) {
      // Roll back on failure.
      setLikedIds(prev => prev.includes(id_article) ? prev.filter(x => x !== id_article) : [...prev, id_article]);
      showError('No se pudo actualizar el me gusta');
    }
  }, [currentUser, authHeader, showError]);

  const toggleFavorite = useCallback(async (id_article) => {
    if (!currentUser?.id_user) {
      showError('Inicia sesión para guardar en favoritos');
      return;
    }
    setFavoritedIds(prev => prev.includes(id_article) ? prev.filter(x => x !== id_article) : [...prev, id_article]);
    try {
      const res = await axiosInstance.post(`/engagement/favorite/${id_article}`, {}, authHeader());
      if (res.data.error) throw new Error(res.data.error);
      setFavoritedIds(prev => {
        const has = prev.includes(id_article);
        if (res.data.data.favorited && !has) return [...prev, id_article];
        if (!res.data.data.favorited && has) return prev.filter(x => x !== id_article);
        return prev;
      });
    } catch (err) {
      setFavoritedIds(prev => prev.includes(id_article) ? prev.filter(x => x !== id_article) : [...prev, id_article]);
      showError('No se pudo actualizar favoritos');
    }
  }, [currentUser, authHeader, showError]);

  // ---- Comments ----
  const fetchComments = useCallback(async (id_article) => {
    try {
      const res = await axiosInstance.get(`/engagement/comments/${id_article}`);
      if (res.data.error) return { error: res.data.error };
      return { data: res.data.data || [] };
    } catch (err) {
      return { error: 'Error al cargar los comentarios' };
    }
  }, []);

  const createComment = useCallback(async (id_article, content) => {
    if (!currentUser?.id_user) return { error: 'Debes iniciar sesión para comentar' };
    try {
      const res = await axiosInstance.post(`/engagement/comments/${id_article}`, { content_comment: content }, authHeader());
      if (res.data.error) return { error: res.data.error };
      return { data: res.data.data };
    } catch (err) {
      return { error: err.response?.data?.error || 'Error al publicar el comentario' };
    }
  }, [currentUser, authHeader]);

  const deleteComment = useCallback(async (id_comment) => {
    try {
      const res = await axiosInstance.delete(`/engagement/comments/${id_comment}`, authHeader());
      if (res.data.error) return { error: res.data.error };
      return { success: true };
    } catch (err) {
      return { error: err.response?.data?.error || 'Error al eliminar el comentario' };
    }
  }, [authHeader]);

  const value = {
    likedIds, favoritedIds,
    isLiked, isFavorited,
    toggleLike, toggleFavorite,
    fetchComments, createComment, deleteComment,
    refreshMyEngagement: fetchMyEngagement,
  };

  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
};

export const useEngagement = () => {
  const ctx = useContext(EngagementContext);
  if (!ctx) throw new Error('useEngagement must be used within an EngagementProvider');
  return ctx;
};

export default EngagementContext;
