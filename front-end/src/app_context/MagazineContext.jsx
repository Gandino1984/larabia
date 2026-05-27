// magazine-front/src/app_context/MagazineContext.jsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';

const MagazineContext = createContext();

export const MagazineProvider = ({ children }) => {
  const { showSuccess, showError } = useUI();
  const { currentUser, canCreateContent } = useAuth();

  const [articles, setArticles] = useState([]);
  const [allArticles, setAllArticles] = useState([]);
  const [editorArticles, setEditorArticles] = useState([]);
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [featuredLoaded, setFeaturedLoaded] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editors, setEditors] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: null,
    searchTerm: ''
  });

  // Fetch all articles
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category) params.category = filters.category;

      const response = await axiosInstance.get('/magazine-article', { params });

      if (!response.data.error) {
        let articlesList = response.data.data || [];

        // Apply search filter on client side
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          articlesList = articlesList.filter(article =>
            article.title_article.toLowerCase().includes(searchLower) ||
            article.excerpt_article?.toLowerCase().includes(searchLower) ||
            article.content_article.toLowerCase().includes(searchLower)
          );
        }

        setArticles(articlesList);
      } else {
        // Only show error if it's not just "no articles available"
        setArticles([]);
        const errorMsg = response.data.error.toLowerCase();
        if (!errorMsg.includes('no hay artículos') && !errorMsg.includes('no articles')) {
          showError(response.data.error);
        }
      }
    } catch (err) {
      console.error('Error fetching articles:', err);
      // Only show error for actual network/server errors, not 404
      if (err.response?.status !== 404) {
        showError('Error al cargar los artículos');
      }
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [filters, showError]);

  // Fetch all published articles without any category filter (used for global search)
  const fetchAllArticles = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/magazine-article');
      if (!response.data.error) {
        setAllArticles(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching all articles:', err);
    }
  }, []);

  // Fetch all articles including drafts (for editor use)
  const fetchEditorArticles = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/magazine-article', { params: { status: 'all' } });

      if (!response.data.error) {
        setEditorArticles(response.data.data || []);
      } else {
        setEditorArticles([]);
      }
    } catch (err) {
      console.error('Error fetching editor articles:', err);
      setEditorArticles([]);
    }
  }, []);

  // Fetch all published projects
  const fetchProjects = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/magazine-project', { params: { status: 'published' } });
      if (!response.data.error) {
        setProjects(response.data.data || []);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
    }
  }, []);

  // Fetch featured articles — uses a short timeout so the preloader is never blocked
  // long by cold-start retries. A 5s timeout + 1 fast retry = at most ~6s before
  // featuredLoaded is set to true and the preloader can proceed.
  const fetchFeaturedArticles = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/magazine-article/featured', {
        timeout: 5000,
        _skipRetry: true
      });

      if (!response.data.error) {
        setFeaturedArticles(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching featured articles:', err);
      // Retry once after a short pause (covers cold-start where backend just needs
      // a moment to be ready), then give up so featuredLoaded is set quickly.
      try {
        await new Promise(r => setTimeout(r, 1500));
        const retry = await axiosInstance.get('/magazine-article/featured', {
          timeout: 5000,
          _skipRetry: true
        });
        if (!retry.data.error) {
          setFeaturedArticles(retry.data.data || []);
        }
      } catch {
        // Backend unreachable — continue with empty featured list
      }
    } finally {
      setFeaturedLoaded(true);
    }
  }, []);

  // Fetch editors (users with is_editor=true)
  const fetchEditors = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/magazine-article/editors');

      if (!response.data.error) {
        setEditors(response.data.data || []);
        return { success: true, data: response.data.data };
      } else {
        console.error('Error fetching editors:', response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('Error fetching editors:', err);
      return { error: 'Error al cargar editores' };
    }
  }, []);

  // Fetch article by ID
  const fetchArticleById = useCallback(async (id_article) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/magazine-article/by-id/${id_article}`);

      if (!response.data.error) {
        setSelectedArticle(response.data.data);
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('Error fetching article:', err);
      showError('Error al cargar el artículo');
      return { error: 'Error al cargar el artículo' };
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Track article view (called once per navigation to the article)
  const trackArticleView = useCallback(async (id_article) => {
    try {
      await axiosInstance.post(`/magazine-article/track-view/${id_article}`);
    } catch (err) {
      // Non-critical — silently ignore
    }
  }, []);

  // Create article
  const createArticle = useCallback(async (articleData) => {
    try {
      const response = await axiosInstance.post('/magazine-article/create', articleData);

      if (!response.data.error) {
        showSuccess(response.data.success || 'Artículo creado exitosamente');
        await Promise.all([fetchArticles(), fetchEditorArticles(), fetchAllArticles()]);
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('Error creating article:', err);
      showError('Error al crear el artículo');
      return { error: 'Error al crear el artículo' };
    }
  }, [fetchArticles, fetchEditorArticles, fetchAllArticles, showSuccess, showError]);

  // Update article
  const updateArticle = useCallback(async (id_article, articleData) => {
    try {
      const response = await axiosInstance.patch(`/magazine-article/update/${id_article}`, articleData, {
        headers: { 'x-user-id': currentUser?.id_user }
      });

      if (!response.data.error) {
        showSuccess(response.data.success || 'Artículo actualizado exitosamente');
        await Promise.all([fetchArticles(), fetchEditorArticles(), fetchAllArticles()]);
        if (selectedArticle?.id_article === id_article) {
          setSelectedArticle(response.data.data);
        }
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('Error updating article:', err);
      showError('Error al actualizar el artículo');
      return { error: 'Error al actualizar el artículo' };
    }
  }, [fetchArticles, fetchEditorArticles, fetchAllArticles, selectedArticle, showSuccess, showError, currentUser]);

  // Delete article
  const deleteArticle = useCallback(async (id_article) => {
    try {
      const response = await axiosInstance.delete(`/magazine-article/remove-by-id/${id_article}`, {
        headers: { 'x-user-id': currentUser?.id_user }
      });

      if (!response.data.error) {
        showSuccess(response.data.message || 'Artículo eliminado exitosamente');
        await Promise.all([fetchArticles(), fetchEditorArticles(), fetchAllArticles()]);
        if (selectedArticle?.id_article === id_article) {
          setSelectedArticle(null);
        }
        return { success: true };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('Error deleting article:', err);
      showError('Error al eliminar el artículo');
      return { error: 'Error al eliminar el artículo' };
    }
  }, [fetchArticles, fetchEditorArticles, fetchAllArticles, selectedArticle, showSuccess, showError, currentUser]);

  // Upload cover image
  const uploadCoverImage = useCallback(async (id_article, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await axiosInstance.post('/magazine-article/upload-cover-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-article-id': id_article
        }
      });

      if (!response.data.error) {
        showSuccess(response.data.message || 'Imagen subida exitosamente');
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('Error uploading cover image:', err);
      showError('Error al subir la imagen');
      return { error: 'Error al subir la imagen' };
    }
  }, [showSuccess, showError]);

  // Article Blocks API Functions

  // Fetch blocks by article ID
  const fetchBlocksByArticleId = useCallback(async (article_id) => {
    try {
      const response = await axiosInstance.get(`/article-blocks/by-article/${article_id}`);

      if (!response.data.error) {
        return { success: true, data: response.data.data };
      } else {
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('Error fetching blocks:', err);
      return { error: 'Error al cargar bloques' };
    }
  }, []);

  // Create a new block
  const createBlock = useCallback(async (blockData) => {
    try {
      const response = await axiosInstance.post('/article-blocks/create', blockData);

      if (!response.data.error) {
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('Error creating block:', err);
      showError('Error al crear bloque');
      return { error: 'Error al crear bloque' };
    }
  }, [showError]);

  // Update a block
  const updateBlock = useCallback(async (id_block, blockData) => {
    try {
      const response = await axiosInstance.patch(`/article-blocks/update/${id_block}`, blockData);

      if (!response.data.error) {
        return { success: true, data: response.data.data };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('Error updating block:', err);
      showError('Error al actualizar bloque');
      return { error: 'Error al actualizar bloque' };
    }
  }, [showError]);

  // Delete a block
  const deleteBlock = useCallback(async (id_block) => {
    try {
      const response = await axiosInstance.delete(`/article-blocks/remove-by-id/${id_block}`);

      if (!response.data.error) {
        return { success: true };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('Error deleting block:', err);
      showError('Error al eliminar bloque');
      return { error: 'Error al eliminar bloque' };
    }
  }, [showError]);

  // Reorder blocks
  const reorderBlocks = useCallback(async (article_id, blocks) => {
    try {
      const response = await axiosInstance.post(`/article-blocks/reorder/${article_id}`, { blocks });

      if (!response.data.error) {
        return { success: true };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('Error reordering blocks:', err);
      showError('Error al reordenar bloques');
      return { error: 'Error al reordenar bloques' };
    }
  }, [showError]);

  // Upload block image
  const uploadBlockImage = useCallback(async (imageFile) => {
    try {
      // DEBUG: Log file being uploaded
      console.log('📤 MagazineContext.uploadBlockImage - Uploading file:', {
        name: imageFile.name,
        type: imageFile.type,
        size: imageFile.size
      });

      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await axiosInstance.post('/article-blocks/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!response.data.error) {
        const data = response.data.data;

        // Show notification if image was converted
        if (data.converted) {
          const savedKB = data.savedSpace;
          const savedPercent = Math.round((savedKB / data.originalSize) * 100);
          showSuccess(
            `Imagen convertida de ${data.originalFormat} a WebP. ` +
            `Espacio ahorrado: ${savedKB}KB (${savedPercent}%) · ` +
            `Tamaño final: ${data.finalSize}KB`
          );
        }

        return data.image_url;
      } else {
        console.error('❌ Backend returned error:', response.data.error);
        showError(response.data.error);
        throw new Error(response.data.error);
      }
    } catch (err) {
      console.error('❌ Error uploading block image:', err);
      if (err.response) {
        console.error('Backend response:', err.response.data);
      }
      showError('Error al subir imagen del bloque');
      throw err;
    }
  }, [showError, showSuccess]);

  // Upload panel audio
  const uploadPanelAudio = useCallback(async (audioFile) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);

      const response = await axiosInstance.post('/article-blocks/upload-audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!response.data.error) {
        return response.data.data.audio_url;
      } else {
        showError(response.data.error);
        throw new Error(response.data.error);
      }
    } catch (err) {
      console.error('Error uploading panel audio:', err);
      showError('Error al subir audio del panel');
      throw err;
    }
  }, [showError]);

  // Invite a co-author to an article
  const inviteCoAuthor = useCallback(async (article_id, invitee_user_id) => {
    try {
      const response = await axiosInstance.post('/magazine-article/invite-coauthor',
        { article_id, invitee_user_id },
        { headers: { 'x-user-id': currentUser?.id_user } }
      );
      if (!response.data.error) {
        showSuccess(response.data.success || 'Invitación enviada');
        return { success: true };
      } else {
        showError(response.data.error);
        return { error: response.data.error };
      }
    } catch (err) {
      console.error('Error inviting co-author:', err);
      const msg = err.response?.data?.error || 'Error al enviar la invitación';
      showError(msg);
      return { error: msg };
    }
  }, [currentUser, showSuccess, showError]);

  // Fetch pending invitations for the current user
  const fetchPendingInvitations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const response = await axiosInstance.get('/magazine-article/pending-invitations', {
        headers: { 'x-user-id': currentUser.id_user }
      });
      if (!response.data.error) {
        setPendingInvitations(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching pending invitations:', err);
    }
  }, [currentUser]);

  // Submit a draft article for super-admin approval.
  // Available to article authors + super admins. Used by the editor UI's
  // "Publicar" button when the user isn't a super admin.
  const submitForApproval = useCallback(async (id_article) => {
    try {
      const res = await axiosInstance.post(
        `/magazine-article/submit-for-approval/${id_article}`,
        {},
        { headers: { 'x-user-id': currentUser?.id_user } }
      );
      if (res.data.error) {
        showError(res.data.error);
        return { error: res.data.error };
      }
      showSuccess(res.data.success || 'Artículo enviado para aprobación');
      await Promise.all([fetchArticles(), fetchEditorArticles(), fetchAllArticles()]);
      return { success: true, data: res.data.data };
    } catch (err) {
      console.error('Error submitting for approval:', err);
      const msg = err.response?.data?.error || 'Error al enviar el artículo para aprobación';
      showError(msg);
      return { error: msg };
    }
  }, [currentUser, fetchArticles, fetchEditorArticles, fetchAllArticles, showSuccess, showError]);

  // Respond to a co-author invitation
  const respondToInvitation = useCallback(async (invitationId, response) => {
    try {
      const res = await axiosInstance.patch(
        `/magazine-article/invitation/${invitationId}/respond`,
        { response },
        { headers: { 'x-user-id': currentUser?.id_user } }
      );
      if (!res.data.error) {
        showSuccess(res.data.success);
        await fetchPendingInvitations();
        if (response === 'accepted') {
          await fetchEditorArticles();
        }
        return { success: true };
      } else {
        showError(res.data.error);
        return { error: res.data.error };
      }
    } catch (err) {
      console.error('Error responding to invitation:', err);
      const msg = err.response?.data?.error || 'Error al responder la invitación';
      showError(msg);
      return { error: msg };
    }
  }, [currentUser, fetchPendingInvitations, fetchEditorArticles, showSuccess, showError]);

  // Load all articles on mount (no category filter — used for global search)
  useEffect(() => {
    fetchAllArticles();
  }, [fetchAllArticles]);

  // Load featured articles on mount
  useEffect(() => {
    fetchFeaturedArticles();
  }, [fetchFeaturedArticles]);

  // Load editors only for users who can create content (not needed for regular visitors)
  useEffect(() => {
    if (canCreateContent) {
      fetchEditors();
    }
  }, [canCreateContent, fetchEditors]);

  // Load pending invitations when user changes
  useEffect(() => {
    if (currentUser) {
      fetchPendingInvitations();
    }
  }, [currentUser, fetchPendingInvitations]);

  const value = {
    articles,
    allArticles,
    editorArticles,
    featuredArticles,
    featuredLoaded,
    selectedArticle,
    projects,
    selectedProject,
    setSelectedProject,
    editors,
    pendingInvitations,
    loading,
    filters,
    setFilters,
    fetchArticles,
    fetchEditorArticles,
    fetchFeaturedArticles,
    fetchProjects,
    fetchArticleById,
    trackArticleView,
    fetchEditors,
    createArticle,
    updateArticle,
    deleteArticle,
    uploadCoverImage,
    setSelectedArticle,
    inviteCoAuthor,
    fetchPendingInvitations,
    respondToInvitation,
    submitForApproval,
    // Block functions
    fetchBlocksByArticleId,
    createBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    uploadBlockImage,
    uploadPanelAudio
  };

  return <MagazineContext.Provider value={value}>{children}</MagazineContext.Provider>;
};

export const useMagazine = () => {
  const context = useContext(MagazineContext);
  if (!context) {
    throw new Error('useMagazine must be used within a MagazineProvider');
  }
  return context;
};

export default MagazineContext;
