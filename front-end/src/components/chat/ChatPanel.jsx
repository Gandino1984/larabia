// magazine-front/src/components/chat/ChatPanel.jsx
//
// The chat panel (in App, opened through ChatContext): «Mis charlas» — every
// conversation, as requester or as author — or one of them. The author sees
// a request with «Aceptar» / «Rechazar» and can «Terminar la conversación»;
// the member sees where their request stands and, after a decline or an end,
// «Volver a pedirlo». Messages only while it's open; the history stays.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, ArrowLeft, Send, Check, Ban, MessagesSquare } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { useChat } from '../../app_context/ChatContext';
import { useAuthorPhoto } from '../../app_context/AuthorContext';
import { localDate } from '../../utils/locale';
import './Chat.css';

const MESSAGE_MAX = 2000;

function Person({ person, large = false }) {
  const photoOf = useAuthorPhoto();
  const photo = photoOf(person);
  return (
    <span className={`chat-person ${large ? 'chat-person--large' : ''}`}>
      {photo
        ? <img src={photo} alt="" className="chat-person__photo" />
        : <span className="chat-person__photo chat-person__photo--initial" aria-hidden="true">{person?.name_user?.charAt(0)?.toUpperCase()}</span>}
      <span className="chat-person__name">{person?.name_user}</span>
    </span>
  );
}

function StatusChip({ status }) {
  const { t } = useTranslation();
  const label = {
    requested: t('chat.status.requested', 'Pendiente'),
    active: t('chat.status.active', 'Abierta'),
    declined: t('chat.status.declined', 'Rechazada'),
    ended: t('chat.status.ended', 'Terminada')
  }[status];
  return <span className={`chat-status chat-status--${status}`}>{label}</span>;
}

const originLabel = (origin, t) => (origin === 'gallery' ? t('chat.origin.gallery', 'Galería') : t('chat.origin.authors', 'Autoras/es'));

function Inbox() {
  const { t } = useTranslation();
  const chat = useChat();
  const list = chat.conversations;
  if (list.length === 0) {
    return <p className="chat-empty">{t('chat.inboxEmpty', 'Aún no tienes charlas. Pídele charlar a una autora, un autor o un artista con «Charlar», en su tarjeta o en su exposición.')}</p>;
  }
  return (
    <ul className="chat-inbox">
      {list.map((c) => (
        <li key={c.id_conversation}>
          <button type="button" className="chat-inbox__item" onClick={() => chat.openChats(c.id_conversation)}>
            <Person person={c.other} />
            <span className="chat-inbox__text">
              <span className="chat-inbox__meta">
                <StatusChip status={c.status} />
                <span>{originLabel(c.origin, t)}</span>
              </span>
              {c.last_message
                ? <span className="chat-inbox__preview">{c.last_message.body}</span>
                : c.role === 'host' && c.status === 'requested'
                  ? <span className="chat-inbox__preview">{t('chat.inboxRequest', 'Quiere charlar contigo')}</span>
                  : null}
            </span>
            {c.unread > 0 && <span className="chat-badge">{c.unread}</span>}
            {c.unread === 0 && (c.unseen_change || (c.role === 'host' && c.status === 'requested')) && <span className="chat-dot" aria-hidden="true" />}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Thread({ id }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showError } = useUI();
  const chat = useChat();
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const auth = useCallback(() => ({ headers: { 'x-user-id': currentUser?.id_user } }), [currentUser?.id_user]);
  const { merge } = chat;

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/chat/conversations/${id}`, auth());
      const { messages, ...summary } = res.data?.data || {};
      setData({ ...summary, messages: messages || [] });
      merge({ ...summary, unread: 0, unseen_change: false });
    } catch {
      setMissing(true);
    }
  }, [id, auth, merge]);

  // Every 10 s while open (new messages, an answer, an end).
  useEffect(() => {
    setData(null);
    setMissing(false);
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data?.messages?.length]);

  if (missing) return <p className="chat-empty">{t('chat.missing', 'Esta conversación no existe.')}</p>;
  if (!data) return <p className="chat-empty">{t('common.states.loading', 'Cargando…')}</p>;

  const name = data.other?.name_user || '';
  const isHost = data.role === 'host';
  const open = data.status === 'active';
  // After an answer of the server: keep the messages, take the new status.
  const after = (c) => { if (c) setData((d) => ({ ...d, ...c })); };

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await axiosInstance.post(`/chat/conversations/${id}/messages`, { body }, auth());
      setData((d) => ({ ...d, messages: [...d.messages, res.data.data] }));
      setDraft('');
    } catch (err) {
      showError(err.response?.data?.error || t('chat.sendError', 'No se pudo enviar el mensaje'));
      load();
    } finally {
      setSending(false);
    }
  };

  const when = (d) => localDate(d, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  let notice = null;
  if (data.status === 'requested') {
    notice = isHost
      ? t('chat.notice.hostRequested', { name, origin: originLabel(data.origin, t), defaultValue: '{{name}} quiere charlar contigo (desde {{origin}}). Si aceptas, podréis escribiros.' })
      : t('chat.notice.requested', { name, defaultValue: 'Le has pedido charlar a {{name}}. Te avisaremos cuando responda.' });
  } else if (data.status === 'declined') {
    notice = isHost
      ? t('chat.notice.hostDeclined', 'Rechazaste esta solicitud.')
      : t('chat.notice.declined', { name, defaultValue: '{{name}} no ha aceptado charlar contigo.' });
  } else if (data.status === 'ended') {
    notice = isHost
      ? t('chat.notice.hostEnded', 'Terminaste esta conversación. Para volver a escribirte tendrá que pedirlo de nuevo.')
      : t('chat.notice.ended', { name, defaultValue: '{{name}} ha terminado la conversación. Si quieres seguir hablando, vuelve a pedirlo.' });
  }

  return (
    <div className="chat-thread">
      <div className="chat-thread__messages" ref={listRef} aria-live="polite">
        {data.messages.length === 0 && open && (
          <p className="chat-empty">{t('chat.firstMessage', { name, defaultValue: 'Escribe a {{name}}: le llegará en la revista, y te avisaremos en la campana cuando responda.' })}</p>
        )}
        {data.messages.map((m) => {
          const mine = Number(m.sender_id) === Number(currentUser?.id_user);
          return (
            <div key={m.id_message} className={`chat-thread__message ${mine ? 'is-mine' : ''}`}>
              <p className="chat-thread__bubble">{m.body}</p>
              <span className="chat-thread__meta">{mine ? t('chat.you', 'Tú') : name} · {when(m.created_at)}</span>
            </div>
          );
        })}
      </div>

      {notice && <p className={`chat-notice chat-notice--${data.status}`} role="status">{notice}</p>}

      {isHost && data.status === 'requested' && (
        <div className="chat-actions">
          <button type="button" className="chat-btn chat-btn--primary" disabled={chat.busy} onClick={async () => after(await chat.respond(id, 'accept'))}>
            <Check size={16} aria-hidden="true" /> {t('chat.accept', 'Aceptar')}
          </button>
          <button type="button" className="chat-btn" disabled={chat.busy} onClick={async () => after(await chat.respond(id, 'decline'))}>
            <X size={16} aria-hidden="true" /> {t('chat.decline', 'Rechazar')}
          </button>
        </div>
      )}
      {!isHost && ['declined', 'ended'].includes(data.status) && (
        <div className="chat-actions">
          <button type="button" className="chat-btn chat-btn--primary" disabled={chat.busy} onClick={async () => after(await chat.request(data.other, data.origin))}>
            <MessagesSquare size={16} aria-hidden="true" /> {t('chat.askAgain', 'Volver a pedirlo')}
          </button>
        </div>
      )}

      {open && (
        <form className="chat-thread__composer" onSubmit={send}>
          <label htmlFor="chat-input" className="chat-sr">{t('chat.label', 'Tu mensaje')}</label>
          <textarea
            id="chat-input"
            value={draft}
            maxLength={MESSAGE_MAX}
            rows={2}
            placeholder={t('chat.placeholder', 'Escribe tu mensaje…')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
          />
          <button type="submit" className="chat-btn chat-btn--primary chat-thread__send" disabled={sending || !draft.trim()}>
            <Send size={16} aria-hidden="true" /> {t('chat.send', 'Enviar')}
          </button>
        </form>
      )}
      {isHost && open && (
        <button type="button" className="chat-end" disabled={chat.busy} onClick={async () => after(await chat.end(id, name))}>
          <Ban size={15} aria-hidden="true" /> {t('chat.end', 'Terminar la conversación')}
        </button>
      )}
    </div>
  );
}

function ChatPanel() {
  const { t } = useTranslation();
  const chat = useChat();
  const panel = chat?.panel;
  const id = panel?.id || null;
  const current = id ? chat.conversations.find((c) => c.id_conversation === id) : null;

  useEffect(() => {
    if (!panel) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') chat.closeChats(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panel, chat]);

  if (!panel) return null;
  return createPortal(
    <div className="chat-panel" role="dialog" aria-modal="false" aria-label={t('chat.title', 'Mis charlas')}>
      <div className="chat-panel__head">
        {id ? (
          <>
            <button type="button" className="chat-panel__icon" onClick={() => chat.openChats(null)} aria-label={t('chat.all', 'Todas las charlas')} title={t('chat.all', 'Todas las charlas')}>
              <ArrowLeft size={20} />
            </button>
            {current ? <Person person={current.other} /> : <span />}
            {current && <StatusChip status={current.status} />}
          </>
        ) : (
          <h2 className="chat-panel__title"><MessagesSquare size={20} aria-hidden="true" /> {t('chat.title', 'Mis charlas')}</h2>
        )}
        <button type="button" className="chat-panel__icon chat-panel__close" onClick={chat.closeChats} aria-label={t('common.buttons.close', 'Cerrar')} title={t('common.buttons.close', 'Cerrar')}>
          <X size={20} />
        </button>
      </div>
      {id ? <Thread key={id} id={id} /> : <Inbox />}
    </div>,
    document.body
  );
}

export default ChatPanel;
