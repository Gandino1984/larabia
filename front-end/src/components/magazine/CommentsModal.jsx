// magazine-front/src/components/magazine/CommentsModal.jsx
//
// Comments modal for an article: a compose box for logged-in users on top, and
// the list of all comments below. Super admins get a red trash button on each
// comment with a 5s countdown-to-delete that can be undone by clicking again.
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Trash2, Send, User } from 'lucide-react';
import { useAuth } from '../../app_context/AuthContext';
import { useEngagement } from '../../app_context/EngagementContext';
import './CommentsModal.css';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
const resolveAvatar = (img) => {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return `${apiUrl}/user/image/${encodeURIComponent(img)}`;
};

const DELETE_DELAY = 5; // seconds

function CommentAvatar({ name, image }) {
  const [err, setErr] = useState(false);
  const url = resolveAvatar(image);
  if (!url || err) {
    return <span className="comment-avatar comment-avatar--fallback">{name?.charAt(0)?.toUpperCase() || <User size={16} />}</span>;
  }
  return <img src={url} alt={name} className="comment-avatar" onError={() => setErr(true)} />;
}

function CommentsModal({ articleId, articleTitle, onClose }) {
  const { t } = useTranslation();
  const { currentUser, isSuperAdmin } = useAuth();
  const { fetchComments, createComment, deleteComment } = useEngagement();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Map of comment id -> seconds left before it is deleted.
  const [pendingDelete, setPendingDelete] = useState({});
  const timersRef = useRef({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchComments(articleId);
    if (res.data) setComments(res.data);
    setLoading(false);
  }, [articleId, fetchComments]);

  useEffect(() => { load(); }, [load]);

  // Clear any running timers on unmount.
  useEffect(() => () => {
    Object.values(timersRef.current).forEach(clearInterval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSubmitting(true);
    const res = await createComment(articleId, content);
    setSubmitting(false);
    if (res.data) {
      setComments(prev => [res.data, ...prev]);
      setText('');
    }
  };

  // Start (or cancel) the 5s countdown-to-delete for a comment.
  const handleDeleteClick = (id_comment) => {
    // Already counting down → cancel (undo).
    if (timersRef.current[id_comment]) {
      clearInterval(timersRef.current[id_comment]);
      delete timersRef.current[id_comment];
      setPendingDelete(prev => { const next = { ...prev }; delete next[id_comment]; return next; });
      return;
    }
    // Start countdown.
    setPendingDelete(prev => ({ ...prev, [id_comment]: DELETE_DELAY }));
    timersRef.current[id_comment] = setInterval(() => {
      setPendingDelete(prev => {
        const current = prev[id_comment];
        if (current === undefined) return prev;
        if (current <= 1) {
          // Time's up — delete for real.
          clearInterval(timersRef.current[id_comment]);
          delete timersRef.current[id_comment];
          deleteComment(id_comment).then(r => {
            if (!r.error) setComments(cs => cs.filter(c => c.id_comment !== id_comment));
          });
          const next = { ...prev }; delete next[id_comment]; return next;
        }
        return { ...prev, [id_comment]: current - 1 };
      });
    }, 1000);
  };

  const formatDate = (d) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return createPortal(
    <div className="comments-modal-backdrop" onClick={onClose}>
      <div className="comments-modal" onClick={(e) => e.stopPropagation()}>
        <div className="comments-modal-header">
          <h3>{t('comments.title')}</h3>
          <button className="comments-modal-close" onClick={onClose} aria-label={t('common.buttons.close')}>
            <X size={22} />
          </button>
        </div>

        {/* Compose */}
        {currentUser ? (
          <form className="comments-compose" onSubmit={handleSubmit}>
            <textarea
              className="comments-compose-input"
              placeholder={t('comments.placeholder')}
              value={text}
              maxLength={2000}
              rows={3}
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="comments-compose-submit" disabled={submitting || !text.trim()}>
              <Send size={16} />
              {t('comments.submit')}
            </button>
          </form>
        ) : (
          <p className="comments-login-hint">{t('comments.loginToComment')}</p>
        )}

        {/* List */}
        <div className="comments-list">
          {loading ? (
            <p className="comments-empty">{t('common.states.loading')}…</p>
          ) : comments.length === 0 ? (
            <p className="comments-empty">{t('comments.empty')}</p>
          ) : (
            comments.map(c => {
              const counting = pendingDelete[c.id_comment];
              return (
                <div key={c.id_comment} className={`comment-item ${counting !== undefined ? 'comment-item--deleting' : ''}`}>
                  <CommentAvatar name={c.author_name} image={c.author_image} />
                  <div className="comment-body">
                    <div className="comment-meta">
                      <span className="comment-author">{c.author_name}</span>
                      <span className="comment-date">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="comment-text">{c.content_comment}</p>
                  </div>
                  {isSuperAdmin && (
                    <button
                      className={`comment-delete-btn ${counting !== undefined ? 'comment-delete-btn--counting' : ''}`}
                      onClick={() => handleDeleteClick(c.id_comment)}
                      title={counting !== undefined ? t('comments.undoDelete') : t('comments.delete')}
                    >
                      {counting !== undefined ? <span className="comment-countdown">{counting}</span> : <Trash2 size={16} />}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CommentsModal;
