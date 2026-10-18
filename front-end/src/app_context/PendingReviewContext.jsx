// front-end/src/app_context/PendingReviewContext.jsx
//
// Shared in-app "notification" state for the super-admin review queue.
// Holds the articles and projects awaiting approval — and the published ones
// whose author asked to change their magazine sections — so both the admin
// panel badge and the pending tab read one source of truth. Super-admin only
// — for anyone else it stays empty and makes no requests.
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';

const PendingReviewContext = createContext(null);

export const PendingReviewProvider = ({ children }) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [pendingArticles, setPendingArticles] = useState([]);
  const [pendingProjects, setPendingProjects] = useState([]);
  // Published publications with a section change waiting (utils/sections.js).
  const [sectionRequestArticles, setSectionRequestArticles] = useState([]);
  const [sectionRequestProjects, setSectionRequestProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSuperAdmin || !currentUser?.id_user) {
      setPendingArticles([]);
      setPendingProjects([]);
      setSectionRequestArticles([]);
      setSectionRequestProjects([]);
      return;
    }
    setLoading(true);
    const authHeader = { headers: { 'x-user-id': currentUser.id_user } };
    try {
      const [articlesRes, projectsRes] = await Promise.allSettled([
        axiosInstance.get('/magazine-article/pending', authHeader),
        axiosInstance.get('/magazine-project/pending', authHeader)
      ]);
      if (articlesRes.status === 'fulfilled' && !articlesRes.value.data.error) {
        setPendingArticles(articlesRes.value.data.data || []);
        setSectionRequestArticles(articlesRes.value.data.sectionRequests || []);
      }
      if (projectsRes.status === 'fulfilled' && !projectsRes.value.data.error) {
        setPendingProjects(projectsRes.value.data.data || []);
        setSectionRequestProjects(projectsRes.value.data.sectionRequests || []);
      }
    } catch (err) {
      console.error('Error fetching pending review queue:', err);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, currentUser]);

  // Load (or clear) the queue whenever the super-admin status changes.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalPending = pendingArticles.length + pendingProjects.length
    + sectionRequestArticles.length + sectionRequestProjects.length;

  const value = {
    pendingArticles,
    pendingProjects,
    sectionRequestArticles,
    sectionRequestProjects,
    totalPending,
    loading,
    refresh,
    setPendingArticles,
    setPendingProjects
  };

  return (
    <PendingReviewContext.Provider value={value}>
      {children}
    </PendingReviewContext.Provider>
  );
};

export const usePendingReview = () => {
  const ctx = useContext(PendingReviewContext);
  if (!ctx) {
    throw new Error('usePendingReview must be used within a PendingReviewProvider');
  }
  return ctx;
};

export default PendingReviewContext;
