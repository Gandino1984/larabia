// magazine-front/src/app_context/AuthorInvitationContext.jsx
//
// Authors a super admin signed up in «Autoras/es» before they had an account
// (back-end controllers/user/author_invitation_controller.js). While the
// invited person is signed in, `invitation` holds their pending invitation:
// App shows AuthorInvitationModal and the bell an item until they accept
// (→ editora) or decline. Closing the modal («Decidir más tarde») hides it
// for this browser session; the bell keeps the invitation.
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

const AuthorInvitationContext = createContext(null);
const laterKey = (userId) => `larabia_author_invite_later_${userId}`;

export const AuthorInvitationProvider = ({ children }) => {
  const { t } = useTranslation();
  const { currentUser, setUser } = useAuth();
  const { showSuccess, showError } = useUI();
  const userId = currentUser?.id_user || null;

  const [invitation, setInvitation] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) { setInvitation(null); return; }
    try {
      const res = await axiosInstance.get('/user/author-invitation', { headers: { 'x-user-id': userId } });
      setInvitation(res.data?.data || null);
    } catch {
      // Keep what we had; the next refresh will try again.
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    if (!userId) return undefined;
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [userId, refresh]);

  // A pending invitation opens the modal, unless it was put off this session.
  const hasInvitation = !!invitation;
  useEffect(() => {
    if (!hasInvitation || !userId) { setModalOpen(false); return; }
    let putOff = false;
    try { putOff = sessionStorage.getItem(laterKey(userId)) === '1'; } catch { /* ignore */ }
    if (!putOff) setModalOpen(true);
  }, [hasInvitation, userId]);

  const later = useCallback(() => {
    if (userId) { try { sessionStorage.setItem(laterKey(userId), '1'); } catch { /* ignore */ } }
    setModalOpen(false);
  }, [userId]);

  const openModal = useCallback(() => setModalOpen(true), []);

  // response: 'accept' | 'decline'. Accepting makes the user an editora at once.
  const respond = useCallback(async (response) => {
    if (!userId) return { error: 'login_required' };
    setBusy(true);
    try {
      const res = await axiosInstance.post(
        '/user/author-invitation/respond',
        { response },
        { headers: { 'x-user-id': userId } }
      );
      if (res.data?.data) setUser({ ...currentUser, ...res.data.data });
      setInvitation(null);
      setModalOpen(false);
      showSuccess(response === 'accept'
        ? t('authorInvitation.accepted', 'Ya formas parte de Autoras/es: puedes editar tu perfil y publicar en la revista.')
        : t('authorInvitation.declined', 'Has rechazado la invitación. Tu perfil de autora o autor ya no se muestra.'));
      return { success: true };
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'no_invitation') {
        setInvitation(null);
        setModalOpen(false);
      }
      const msg = data?.error || t('authorInvitation.error', 'No se pudo guardar tu respuesta. Inténtalo de nuevo.');
      showError(msg);
      return { error: msg };
    } finally {
      setBusy(false);
    }
  }, [userId, currentUser, setUser, showSuccess, showError, t]);

  const value = useMemo(
    () => ({ invitation, modalOpen, busy, openModal, later, respond, refresh }),
    [invitation, modalOpen, busy, openModal, later, respond, refresh]
  );

  return (
    <AuthorInvitationContext.Provider value={value}>
      {children}
    </AuthorInvitationContext.Provider>
  );
};

export const useAuthorInvitation = () => {
  const ctx = useContext(AuthorInvitationContext);
  if (!ctx) throw new Error('useAuthorInvitation must be used within an AuthorInvitationProvider');
  return ctx;
};

export default AuthorInvitationContext;
