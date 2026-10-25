// magazine-front/src/app_context/ChatContext.jsx
//
// The magazine's chat for the signed-in person (back-end
// controllers/chat/chat_api_controller.js): socios/as ask an author or a
// visual artist to chat («Charlar», ChatButton); the author accepts or
// declines, and can end it at any time; asking again re-opens it.
// - conversations: theirs, as requester or as host — refreshed every minute
//   and when the tab gets focus. The bell (NotificationContext) reads what
//   needs them: requests to answer, the author's answers not seen yet, unread.
// - The chat panel (ChatPanel, in App): «Mis charlas» or one conversation.
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';
import { useSubscription } from './SubscriptionContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showSuccess, showError, showInfo } = useUI();
  const subscription = useSubscription();
  const userId = currentUser?.id_user || null;

  const [conversations, setConversations] = useState([]);
  // The panel: closed (null), «Mis charlas» ({ id: null }) or one ({ id }).
  const [panel, setPanel] = useState(null);
  const [busy, setBusy] = useState(false);

  const auth = useCallback(() => ({ headers: { 'x-user-id': userId } }), [userId]);

  const refresh = useCallback(async () => {
    if (!userId) { setConversations([]); return; }
    try {
      const res = await axiosInstance.get('/chat/mine', auth());
      setConversations(res.data?.data || []);
    } catch {
      // Keep what we had; the next refresh will try again.
    }
  }, [userId, auth]);

  useEffect(() => {
    refresh();
    if (!userId) { setPanel(null); return undefined; }
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [userId, refresh]);

  // Updates one conversation in the list (from an answer of the server), in
  // its place; a new one goes first. (The order is the server's: latest first.)
  const merge = useCallback((c) => {
    if (!c) return;
    setConversations((list) => (list.some((x) => x.id_conversation === c.id_conversation)
      ? list.map((x) => (x.id_conversation === c.id_conversation ? { ...x, ...c } : x))
      : [c, ...list]));
  }, []);

  /** The requester's conversation with that author / artist, if any. */
  const conversationWith = useCallback(
    (hostId) => conversations.find((c) => c.role === 'requester' && Number(c.other?.id_user) === Number(hostId)) || null,
    [conversations]
  );

  const openChats = useCallback((id = null) => setPanel({ id }), []);
  const closeChats = useCallback(() => setPanel(null), []);

  // Runs a request; shows the server's message. Returns the conversation (or null).
  const run = useCallback(async (request, fallback) => {
    setBusy(true);
    try {
      const res = await request();
      merge(res.data?.data);
      if (res.data?.success) showSuccess(res.data.success);
      return res.data?.data || null;
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'already_requested') showInfo(data.error);
      // Not a member: the «Hazte socio/a» window says why.
      else if (data?.code === 'subscription_required' && subscription) subscription.openModal('chat');
      else showError(data?.error || fallback);
      refresh();
      return null;
    } finally {
      setBusy(false);
    }
  }, [merge, refresh, showSuccess, showError, showInfo, subscription]);

  /** A member asks `host` ({ id_user }) to chat; origin: 'authors' | 'gallery'. */
  const request = useCallback((host, origin) => run(
    () => axiosInstance.post('/chat/request', { host_id: host.id_user, origin }, auth()),
    t('chat.requestError', 'No se pudo pedir la charla')
  ), [run, auth, t]);

  /** The author: response 'accept' | 'decline'. */
  const respond = useCallback((id, response) => run(
    () => axiosInstance.post(`/chat/conversations/${id}/respond`, { response }, auth()),
    t('chat.respondError', 'No se pudo responder la solicitud')
  ), [run, auth, t]);

  /** The author ends it (asked first). */
  const end = useCallback((id, name) => {
    if (!window.confirm(t('chat.confirmEnd', { name, defaultValue: '¿Terminar la conversación con {{name}}? Para volver a escribirte tendrá que pedirlo de nuevo.' }))) return null;
    return run(
      () => axiosInstance.post(`/chat/conversations/${id}/end`, {}, auth()),
      t('chat.endError', 'No se pudo terminar la conversación')
    );
  }, [run, auth, t]);

  /** The requester has seen the author's answers (those ids, or all). */
  const markSeen = useCallback(async (ids = null) => {
    if (!userId) return;
    setConversations((list) => list.map((c) => (!ids || ids.includes(c.id_conversation) ? { ...c, unseen_change: false } : c)));
    try { await axiosInstance.post('/chat/seen', ids ? { ids } : {}, auth()); } catch { /* next refresh */ }
  }, [userId, auth]);

  const unreadTotal = useMemo(() => conversations.reduce((n, c) => n + (c.unread || 0), 0), [conversations]);

  const value = useMemo(() => ({
    conversations, refresh, merge, conversationWith, busy,
    request, respond, end, markSeen, unreadTotal,
    panel, openChats, closeChats
  }), [conversations, refresh, merge, conversationWith, busy, request, respond, end, markSeen, unreadTotal, panel, openChats, closeChats]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => useContext(ChatContext);
