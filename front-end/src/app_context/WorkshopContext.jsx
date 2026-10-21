// magazine-front/src/app_context/WorkshopContext.jsx
//
// Workshops (talleres): admins and super admins create them; anyone sees the
// cards, signed-in readers open a workshop, and paying subscribers (and the
// magazine team) reserve a capacity-limited spot — general workshops and
// children's workshops (audience_workshop). A workshop's managers see its
// participants and invite / remove / block people.
// Invitations: the invited reader answers (accept → booked, decline → the
// held place is free) and the inviter is told; both show in the header bell
// (`invitationFeed`, refreshed every minute and when the tab gets focus).
// The server answers 403 + code 'login_required' | 'subscription_required'
// when the reader can't go on; that is kept in `accessError`.
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import i18n from '../i18n/config';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

const WorkshopContext = createContext(null);
// invitations to me · answers to mine · extra-place requests on the workshops I
// manage · answers to my requests.
const EMPTY_FEED = { invitations: [], responses: [], spot_requests: [], spot_answers: [] };

export const WorkshopProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useUI();
  const [workshops, setWorkshops] = useState([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  // The workshop of a shared link opened signed out: WorkshopsList shows its card.
  const [focusWorkshopId, setFocusWorkshopId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accessError, setAccessError] = useState(null);
  const [invitationFeed, setInvitationFeed] = useState(EMPTY_FEED);

  const authHeader = useCallback(
    () => ({ headers: { 'x-user-id': currentUser?.id_user } }),
    [currentUser]
  );

  const fetchWorkshops = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/magazine-workshop', authHeader());
      setAccessError(null);
      setWorkshops(res.data?.data || []);
      return { success: true, data: res.data?.data || [] };
    } catch (err) {
      setWorkshops([]);
      const code = err.response?.status === 403 ? err.response?.data?.code : null;
      if (code) { setAccessError(code); return { error: err.response.data.error, code }; }
      console.error('fetchWorkshops error:', err);
      return { error: i18n.t('messages.error.loadWorkshops', 'Error al cargar talleres') };
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  const fetchWorkshopById = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/magazine-workshop/by-id/${id}`, authHeader());
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      setSelectedWorkshop(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      // Not allowed to open it: the caller guides the reader (login / subscribe).
      const code = err.response?.status === 403 ? err.response?.data?.code : null;
      if (code) return { error: err.response.data.error, code };
      const msg = err.response?.data?.error || i18n.t('messages.error.loadWorkshop', 'Error al cargar el taller');
      showError(msg);
      return { error: msg };
    } finally {
      setLoading(false);
    }
  }, [authHeader, showError]);

  const createWorkshop = useCallback(async (data) => {
    try {
      const res = await axiosInstance.post('/magazine-workshop/create', data, authHeader());
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      showSuccess(res.data.success || i18n.t('messages.success.workshopCreated', 'Taller creado'));
      await fetchWorkshops();
      return { success: true, data: res.data.data };
    } catch (err) {
      const msg = err.response?.data?.error || i18n.t('messages.error.createWorkshop', 'Error al crear el taller');
      showError(msg);
      return { error: msg };
    }
  }, [authHeader, showSuccess, showError, fetchWorkshops]);

  const updateWorkshop = useCallback(async (id, data) => {
    try {
      const res = await axiosInstance.patch(`/magazine-workshop/update/${id}`, data, authHeader());
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      showSuccess(res.data.success || i18n.t('messages.success.workshopUpdated', 'Taller actualizado'));
      await fetchWorkshops();
      return { success: true, data: res.data.data };
    } catch (err) {
      const msg = err.response?.data?.error || i18n.t('messages.error.updateWorkshop', 'Error al actualizar el taller');
      showError(msg);
      return { error: msg };
    }
  }, [authHeader, showSuccess, showError, fetchWorkshops]);

  const deleteWorkshop = useCallback(async (id) => {
    try {
      const res = await axiosInstance.delete(`/magazine-workshop/remove-by-id/${id}`, authHeader());
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      showSuccess(res.data.message || i18n.t('messages.success.workshopDeleted', 'Taller eliminado'));
      await fetchWorkshops();
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || i18n.t('messages.error.deleteWorkshop', 'Error al eliminar el taller');
      showError(msg);
      return { error: msg };
    }
  }, [authHeader, showSuccess, showError, fetchWorkshops]);

  const uploadWorkshopCover = useCallback(async (id, file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await axiosInstance.post('/magazine-workshop/upload-cover-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'x-workshop-id': id, 'x-user-id': currentUser?.id_user }
      });
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      return { success: true, data: res.data.data };
    } catch (err) {
      const msg = err.response?.data?.error || i18n.t('messages.error.uploadImage', 'Error al subir la imagen');
      showError(msg);
      return { error: msg };
    }
  }, [currentUser, showError]);

  const reserveWorkshop = useCallback(async (id) => {
    try {
      const res = await axiosInstance.post(`/magazine-workshop/reserve/${id}`, {}, authHeader());
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      showSuccess(res.data.success || i18n.t('messages.success.bookingConfirmed', 'Reserva confirmada'));
      return { success: true, data: res.data.data };
    } catch (err) {
      const code = err.response?.status === 403 ? err.response?.data?.code : null;
      const msg = err.response?.data?.error || i18n.t('messages.error.booking', 'Error al reservar');
      // Not allowed to book: the caller guides the reader (login / subscribe).
      if (code) return { error: msg, code };
      showError(msg);
      return { error: msg };
    }
  }, [authHeader, showSuccess, showError]);

  const cancelWorkshopReservation = useCallback(async (id) => {
    try {
      const res = await axiosInstance.delete(`/magazine-workshop/reserve/${id}`, authHeader());
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      showSuccess(res.data.success || i18n.t('messages.success.bookingCancelled', 'Reserva cancelada'));
      return { success: true, data: res.data.data };
    } catch (err) {
      const msg = err.response?.data?.error || i18n.t('messages.error.cancelBooking', 'Error al cancelar la reserva');
      showError(msg);
      return { error: msg };
    }
  }, [authHeader, showSuccess, showError]);

  // ── Invitations (the invited reader and the inviter) ──

  const userId = currentUser?.id_user || null;
  const refreshInvitationFeed = useCallback(async () => {
    if (!userId) { setInvitationFeed(EMPTY_FEED); return; }
    try {
      const res = await axiosInstance.get('/magazine-workshop/invitations/feed', { headers: { 'x-user-id': userId } });
      setInvitationFeed({ ...EMPTY_FEED, ...(res.data?.data || {}) });
    } catch {
      // Keep what we had; the next refresh will try again.
    }
  }, [userId]);

  useEffect(() => {
    refreshInvitationFeed();
    if (!userId) return undefined;
    const timer = setInterval(refreshInvitationFeed, 60 * 1000);
    window.addEventListener('focus', refreshInvitationFeed);
    return () => { clearInterval(timer); window.removeEventListener('focus', refreshInvitationFeed); };
  }, [userId, refreshInvitationFeed]);

  // The open workshop, to refresh it when the reader answers from the bell.
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedWorkshop?.id_workshop || null;

  // response: 'accept' | 'decline'. Returns { success } or { error, code }
  // (code 'subscription_required' / 'login_required': the caller guides the
  // reader).
  const respondToWorkshopInvitation = useCallback(async (invitation, response) => {
    try {
      const res = await axiosInstance.post(
        `/magazine-workshop/invitations/${invitation.id_invitation}/respond`,
        { response },
        authHeader()
      );
      showSuccess(res.data?.success || i18n.t('messages.success.done', 'Hecho'));
      setInvitationFeed(prev => ({ ...prev, invitations: prev.invitations.filter(i => i.id_invitation !== invitation.id_invitation) }));
      const workshopId = res.data?.data?.id_workshop;
      if (workshopId && workshopId === selectedIdRef.current) fetchWorkshopById(workshopId);
      fetchWorkshops();
      return { success: true };
    } catch (err) {
      const code = err.response?.status === 403 ? err.response?.data?.code : null;
      const msg = err.response?.data?.error || i18n.t('messages.error.respondInvitation', 'Error al responder a la invitación');
      if (code) return { error: msg, code };
      showError(msg);
      refreshInvitationFeed();
      return { error: msg };
    }
  }, [authHeader, showSuccess, showError, fetchWorkshopById, fetchWorkshops, refreshInvitationFeed]);

  // The inviter has seen these answers: they leave the bell.
  const markInvitationResponsesSeen = useCallback(async (ids) => {
    if (!userId || !ids?.length) return;
    setInvitationFeed(prev => ({ ...prev, responses: prev.responses.filter(r => !ids.includes(r.id_invitation)) }));
    try {
      await axiosInstance.post('/magazine-workshop/invitations/responses/seen', { ids }, { headers: { 'x-user-id': userId } });
    } catch {
      // They'll show again on the next refresh.
    }
  }, [userId]);

  // ── Extra places in a full workshop (socios/as ask, managers answer) ──

  const requestExtraSpot = useCallback(async (id, message) => {
    try {
      const res = await axiosInstance.post(`/magazine-workshop/spot-requests/${id}`, { message }, authHeader());
      showSuccess(res.data?.success || i18n.t('messages.success.done', 'Hecho'));
      if (id === selectedIdRef.current) await fetchWorkshopById(id);
      fetchWorkshops(); // the cards: their request and the count
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || i18n.t('workshops.extra.requestError', 'No se pudo enviar la solicitud');
      showError(msg);
      return { error: msg, code: err.response?.data?.code };
    }
  }, [authHeader, showSuccess, showError, fetchWorkshopById, fetchWorkshops]);

  const withdrawExtraSpot = useCallback(async (id) => {
    try {
      const res = await axiosInstance.delete(`/magazine-workshop/spot-requests/${id}`, authHeader());
      showSuccess(res.data?.success || i18n.t('messages.success.done', 'Hecho'));
      if (id === selectedIdRef.current) await fetchWorkshopById(id);
      fetchWorkshops();
      return { success: true };
    } catch (err) {
      showError(err.response?.data?.error || i18n.t('workshops.extra.withdrawError', 'No se pudo retirar la solicitud'));
      return { error: true };
    }
  }, [authHeader, showSuccess, showError, fetchWorkshopById, fetchWorkshops]);

  // response: 'accept' (opens one more place and books it) | 'decline'.
  const respondExtraSpot = useCallback(async (workshopId, requesterId, response) => {
    try {
      const res = await axiosInstance.post(`/magazine-workshop/manage/${workshopId}/spot-requests/${requesterId}`, { response }, authHeader());
      showSuccess(res.data?.success || i18n.t('messages.success.done', 'Hecho'));
      setInvitationFeed(prev => ({
        ...prev,
        spot_requests: (prev.spot_requests || []).filter(r => !(r.workshop?.id_workshop === workshopId && r.requester?.id_user === requesterId))
      }));
      if (workshopId === selectedIdRef.current) await fetchWorkshopById(workshopId);
      fetchWorkshops();
      return { success: true };
    } catch (err) {
      showError(err.response?.data?.error || i18n.t('workshops.extra.respondError', 'No se pudo responder a la solicitud'));
      refreshInvitationFeed();
      return { error: true };
    }
  }, [authHeader, showSuccess, showError, fetchWorkshopById, fetchWorkshops, refreshInvitationFeed]);

  // The requester has seen these answers: they leave the bell.
  const markSpotAnswersSeen = useCallback(async (ids) => {
    if (!userId || !ids?.length) return;
    setInvitationFeed(prev => ({ ...prev, spot_answers: (prev.spot_answers || []).filter(a => !ids.includes(a.id_spot_request)) }));
    try {
      await axiosInstance.post('/magazine-workshop/spot-requests/answers/seen', { ids }, { headers: { 'x-user-id': userId } });
    } catch {
      // They'll show again on the next refresh.
    }
  }, [userId]);

  // ── Participants (the workshop's managers) ──

  // People to include / block, by name (2+ characters).
  const searchWorkshopUsers = useCallback(async (id, q) => {
    try {
      const res = await axiosInstance.get(`/magazine-workshop/manage/${id}/users`, {
        ...authHeader(),
        params: { q }
      });
      return res.data?.data || [];
    } catch {
      return [];
    }
  }, [authHeader]);

  // action: 'invite' | 'withdraw' | 'remove' | 'block' | 'unblock'. The open
  // workshop takes the updated participants, invitations, blocked users and
  // places.
  const manageWorkshopParticipant = useCallback(async (id, action, targetId) => {
    const base = `/magazine-workshop/manage/${id}`;
    const requests = {
      invite: () => axiosInstance.post(`${base}/invitations`, { user_id: targetId }, authHeader()),
      withdraw: () => axiosInstance.delete(`${base}/invitations/${targetId}`, authHeader()),
      remove: () => axiosInstance.delete(`${base}/participants/${targetId}`, authHeader()),
      block: () => axiosInstance.post(`${base}/blocks`, { user_id: targetId }, authHeader()),
      unblock: () => axiosInstance.delete(`${base}/blocks/${targetId}`, authHeader())
    };
    try {
      const res = await requests[action]();
      const data = res.data?.data;
      if (data) {
        setSelectedWorkshop((prev) => (prev && prev.id_workshop === data.id_workshop
          ? {
              ...prev,
              ...data,
              reserved_by_me: (data.participants || []).some(p => p.id_user === currentUser?.id_user)
            }
          : prev));
      }
      showSuccess(res.data?.success || i18n.t('messages.success.done', 'Hecho'));
      return { success: true, data };
    } catch (err) {
      const msg = err.response?.data?.error || i18n.t('messages.error.manageParticipants', 'Error al gestionar participantes');
      showError(msg);
      return { error: msg };
    }
  }, [authHeader, currentUser, showSuccess, showError]);

  const value = {
    workshops, selectedWorkshop, setSelectedWorkshop, loading, accessError,
    focusWorkshopId, setFocusWorkshopId,
    fetchWorkshops, fetchWorkshopById,
    createWorkshop, updateWorkshop, deleteWorkshop, uploadWorkshopCover,
    reserveWorkshop, cancelWorkshopReservation,
    searchWorkshopUsers, manageWorkshopParticipant,
    invitationFeed, refreshInvitationFeed, respondToWorkshopInvitation, markInvitationResponsesSeen,
    requestExtraSpot, withdrawExtraSpot, respondExtraSpot, markSpotAnswersSeen
  };

  return <WorkshopContext.Provider value={value}>{children}</WorkshopContext.Provider>;
};

export const useWorkshop = () => {
  const ctx = useContext(WorkshopContext);
  if (!ctx) throw new Error('useWorkshop must be used within a WorkshopProvider');
  return ctx;
};

export default WorkshopContext;
