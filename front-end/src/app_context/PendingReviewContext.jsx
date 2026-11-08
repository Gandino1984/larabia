// front-end/src/app_context/PendingReviewContext.jsx
//
// Shared in-app "notification" state for the super-admin review queue.
// Holds the articles, projects and contests awaiting approval — and the
// published publications whose author asked to change their magazine
// sections — so both the admin
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
  // Contests (Talleres) by admins, waiting for a super admin.
  const [pendingContests, setPendingContests] = useState([]);
  // Published publications with a section change waiting (utils/sections.js).
  const [sectionRequestArticles, setSectionRequestArticles] = useState([]);
  const [sectionRequestProjects, setSectionRequestProjects] = useState([]);
  // «Espacio abierto» proposals nobody has opened yet.
  const [newProposals, setNewProposals] = useState(0);
  // Works the artists hung, waiting for review (Admin › Galería).
  const [galleryPending, setGalleryPending] = useState(0);
  // «Reportar un error»: how many nobody has looked at, and the latest of
  // them (the bell). Refreshed every minute and when the tab gets focus.
  const [newReports, setNewReports] = useState(0);
  const [latestReports, setLatestReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSuperAdmin || !currentUser?.id_user) {
      setPendingArticles([]);
      setPendingProjects([]);
      setPendingContests([]);
      setSectionRequestArticles([]);
      setSectionRequestProjects([]);
      setNewProposals(0);
      setGalleryPending(0);
      setNewReports(0);
      setLatestReports([]);
      return;
    }
    setLoading(true);
    const authHeader = { headers: { 'x-user-id': currentUser.id_user } };
    try {
      const [articlesRes, projectsRes, proposalsRes, galleryRes, contestsRes] = await Promise.allSettled([
        axiosInstance.get('/magazine-article/pending', authHeader),
        axiosInstance.get('/magazine-project/pending', authHeader),
        axiosInstance.get('/open-space/proposals/count', authHeader),
        axiosInstance.get('/gallery/review/count', authHeader),
        axiosInstance.get('/magazine-workshop/review/pending', authHeader)
      ]);
      if (articlesRes.status === 'fulfilled' && !articlesRes.value.data.error) {
        setPendingArticles(articlesRes.value.data.data || []);
        setSectionRequestArticles(articlesRes.value.data.sectionRequests || []);
      }
      if (projectsRes.status === 'fulfilled' && !projectsRes.value.data.error) {
        setPendingProjects(projectsRes.value.data.data || []);
        setSectionRequestProjects(projectsRes.value.data.sectionRequests || []);
      }
      if (proposalsRes.status === 'fulfilled') {
        setNewProposals(proposalsRes.value.data?.data?.new || 0);
      }
      if (galleryRes.status === 'fulfilled') {
        setGalleryPending(galleryRes.value.data?.data?.pending || 0);
      }
      if (contestsRes.status === 'fulfilled' && !contestsRes.value.data.error) {
        setPendingContests(contestsRes.value.data.data || []);
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

  const refreshReports = useCallback(async () => {
    if (!isSuperAdmin || !currentUser?.id_user) return;
    try {
      const res = await axiosInstance.get('/bug-reports/count', { headers: { 'x-user-id': currentUser.id_user } });
      if (!res.data?.error) {
        setNewReports(res.data?.data?.new || 0);
        setLatestReports(res.data?.data?.latest || []);
      }
    } catch {
      // Next time.
    }
  }, [isSuperAdmin, currentUser]);
  useEffect(() => {
    if (!isSuperAdmin) return undefined;
    refreshReports();
    const timer = setInterval(refreshReports, 60000);
    const onFocus = () => refreshReports();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [isSuperAdmin, refreshReports]);

  const totalPending = pendingArticles.length + pendingProjects.length + pendingContests.length
    + sectionRequestArticles.length + sectionRequestProjects.length;
  // Everything waiting for the super admin (the Admin badge in the header).
  const totalAttention = totalPending + newProposals + galleryPending + newReports;

  const value = {
    pendingArticles,
    pendingProjects,
    pendingContests,
    sectionRequestArticles,
    sectionRequestProjects,
    totalPending,
    newProposals,
    galleryPending,
    newReports,
    latestReports,
    refreshReports,
    totalAttention,
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
