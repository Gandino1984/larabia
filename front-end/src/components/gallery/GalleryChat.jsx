// magazine-front/src/components/gallery/GalleryChat.jsx
//
// The gallery's chat between a visitor and an artist (one conversation per
// pair, kept on the server). With `conversationId` it loads it — and checks
// for new messages every 10 seconds while open; without one (a visitor's
// first message) `exhibitionId` says whom it goes to, and the conversation
// starts with it. Opening it marks it read (the bell follows).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { useGallery } from '../../app_context/GalleryContext';
import { localDate } from '../../utils/locale';

const MESSAGE_MAX = 2000;

function GalleryChat({ conversationId: initialId = null, exhibitionId = null, other, onStarted }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showError } = useUI();
  const { refreshFeed } = useGallery();
  const [conversationId, setConversationId] = useState(initialId);
  const [messages, setMessages] = useState(initialId ? null : []);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const auth = useCallback(() => ({ headers: { 'x-user-id': currentUser?.id_user } }), [currentUser?.id_user]);

  useEffect(() => { setConversationId(initialId); setMessages(initialId ? null : []); }, [initialId]);

  const load = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await axiosInstance.get(`/gallery/conversations/${conversationId}`, auth());
      setMessages(res.data?.data?.messages || []);
      refreshFeed();
    } catch {
      setMessages((m) => m || []);
    }
  }, [conversationId, auth, refreshFeed]);

  useEffect(() => {
    load();
    if (!conversationId) return undefined;
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [conversationId, load]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      if (conversationId) {
        const res = await axiosInstance.post(`/gallery/conversations/${conversationId}/messages`, { body }, auth());
        setMessages((m) => [...(m || []), res.data.data]);
      } else {
        const res = await axiosInstance.post(`/gallery/exhibition/${exhibitionId}/messages`, { body }, auth());
        const id = res.data?.data?.id_conversation;
        setMessages([res.data.data.message]);
        setConversationId(id);
        onStarted?.(id);
      }
      setDraft('');
    } catch (err) {
      showError(err.response?.data?.error || t('gallery.chat.error', 'No se pudo enviar el mensaje'));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    // Enter sends; Shift+Enter is a new line.
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); }
  };

  const when = (d) => localDate(d, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="gallery-chat">
      <div className="gallery-chat__messages" ref={listRef} aria-live="polite">
        {messages === null ? (
          <p className="gallery-chat__empty">{t('common.states.loading', 'Cargando…')}</p>
        ) : messages.length === 0 ? (
          <p className="gallery-chat__empty">
            {t('gallery.chat.first', { name: other?.name_user || '', defaultValue: 'Escribe a {{name}}: le llegará en la revista, y te avisaremos en la campana cuando te responda.' })}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUser?.id_user;
            return (
              <div key={m.id_message} className={`gallery-chat__message ${mine ? 'is-mine' : ''}`}>
                <p className="gallery-chat__bubble">{m.body}</p>
                <span className="gallery-chat__meta">
                  {mine ? t('gallery.chat.you', 'Tú') : other?.name_user} · {when(m.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
      <form className="gallery-chat__composer" onSubmit={send}>
        <label htmlFor="gallery-chat-input" className="gallery-sr">{t('gallery.chat.label', 'Tu mensaje')}</label>
        <textarea
          id="gallery-chat-input"
          value={draft}
          maxLength={MESSAGE_MAX}
          rows={2}
          placeholder={t('gallery.chat.placeholder', 'Escribe tu mensaje…')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" className="gallery-btn gallery-btn--primary gallery-chat__send" disabled={sending || !draft.trim()}>
          <Send size={16} aria-hidden="true" />
          {t('gallery.chat.send', 'Enviar')}
        </button>
      </form>
    </div>
  );
}

export default GalleryChat;
