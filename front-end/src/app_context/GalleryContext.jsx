// magazine-front/src/app_context/GalleryContext.jsx
//
// The Galería's live state for the signed-in user (back-end
// controllers/gallery/gallery_api_controller.js):
// - feed: the artist's works reviewed since they last looked, and — super
//   admins — how many works wait for review. Refreshed every minute and when
//   the tab gets focus; the bell (NotificationContext) and the Admin badge
//   read it. (Talking to artists: the magazine's chat, ChatContext.)
// - invitation: a pending invitation to be a visual artist. App shows
//   GalleryInvitationModal until they accept (→ artist) or decline; «Decidir
//   más tarde» hides it for this browser session (the bell keeps it).
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

const GalleryContext = createContext(null);
const EMPTY_FEED = { reviews: [], pending_review: 0 };
const laterKey = (userId) => `larabia_artist_invite_later_${userId}`;

export const GalleryProvider = ({ children }) => {
  const { t } = useTranslation();
  const { currentUser, setUser } = useAuth();
  const { showSuccess, showError } = useUI();
  const userId = currentUser?.id_user || null;
  const isArtist = currentUser?.is_artist === true || currentUser?.is_artist === 1;

  const [feed, setFeed] = useState(EMPTY_FEED);
  const [invitation, setInvitation] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const auth = useCallback(() => ({ headers: { 'x-user-id': userId } }), [userId]);

  const refreshFeed = useCallback(async () => {
    if (!userId) { setFeed(EMPTY_FEED); return; }
    try {
      const res = await axiosInstance.get('/gallery/feed', auth());
      setFeed(res.data?.data || EMPTY_FEED);
    } catch {
      // Keep what we had; the next refresh will try again.
    }
  }, [userId, auth]);

  const refreshInvitation = useCallback(async () => {
    if (!userId) { setInvitation(null); return; }
    try {
      const res = await axiosInstance.get('/gallery/invitation', auth());
      setInvitation(res.data?.data || null);
    } catch { /* next time */ }
  }, [userId, auth]);

  useEffect(() => {
    refreshFeed();
    refreshInvitation();
    if (!userId) return undefined;
    const timer = setInterval(refreshFeed, 60000);
    const onFocus = () => { refreshFeed(); refreshInvitation(); };
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [userId, refreshFeed, refreshInvitation]);

  // A pending invitation opens the modal, unless it was put off this session.
  const hasInvitation = !!invitation;
  useEffect(() => {
    if (!hasInvitation || !userId) { setInviteModalOpen(false); return; }
    let putOff = false;
    try { putOff = sessionStorage.getItem(laterKey(userId)) === '1'; } catch { /* ignore */ }
    if (!putOff) setInviteModalOpen(true);
  }, [hasInvitation, userId]);

  const later = useCallback(() => {
    if (userId) { try { sessionStorage.setItem(laterKey(userId), '1'); } catch { /* ignore */ } }
    setInviteModalOpen(false);
  }, [userId]);

  const openInviteModal = useCallback(() => setInviteModalOpen(true), []);

  // response: 'accept' | 'decline'. Accepting makes the user an artist at once;
  // declining a gallery prepared for them deletes it (asked first).
  const respond = useCallback(async (response) => {
    if (!userId) return { error: 'login_required' };
    if (response === 'decline' && invitation?.gallery
      && !window.confirm(t('gallery.invitation.confirmDecline', 'Si la rechazas, se borrará la galería que te han preparado, con sus obras. ¿La rechazas?'))) {
      return { cancelled: true };
    }
    setBusy(true);
    try {
      const res = await axiosInstance.post('/gallery/invitation/respond', { response }, auth());
      if (res.data?.data) setUser({ ...currentUser, ...res.data.data });
      setInvitation(null);
      setInviteModalOpen(false);
      showSuccess(res.data?.success || (response === 'accept'
        ? t('gallery.invitation.accepted', 'Invitación aceptada: ya puedes montar tu exposición en la galería')
        : t('gallery.invitation.declined', 'Has rechazado la invitación')));
      return { success: true };
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'no_invitation') { setInvitation(null); setInviteModalOpen(false); }
      const msg = data?.error || t('gallery.invitation.error', 'No se pudo guardar tu respuesta. Inténtalo de nuevo.');
      showError(msg);
      return { error: msg };
    } finally {
      setBusy(false);
    }
  }, [userId, auth, currentUser, setUser, showSuccess, showError, t, invitation]);

  // The artist has seen their reviews (opening «Mi galería» or the bell).
  const markReviewsSeen = useCallback(async () => {
    if (!isArtist || !feed.reviews.length) return;
    setFeed((f) => ({ ...f, reviews: [] }));
    try { await axiosInstance.post('/gallery/feed/reviews-seen', {}, auth()); } catch { /* next feed refresh shows them again */ }
  }, [isArtist, feed.reviews.length, auth]);


  const value = useMemo(() => ({
    isArtist, feed, refreshFeed, markReviewsSeen,
    invitation, inviteModalOpen, busy, openInviteModal, later, respond, refreshInvitation
  }), [isArtist, feed, refreshFeed, markReviewsSeen, invitation, inviteModalOpen, busy, openInviteModal, later, respond, refreshInvitation]);

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
};

export const useGallery = () => {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error('useGallery must be used within a GalleryProvider');
  return ctx;
};

export default GalleryContext;
