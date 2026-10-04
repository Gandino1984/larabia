// magazine-front/src/components/magazine/ArticleEngagementBar.jsx
//
// Reusable engagement bar for article cards. Bottom-left: a single "options"
// button; clicking it reveals the actions (like / favorite / comments / share,
// plus delete for authors/admins), which slide out one after another as if they
// had been stacked behind it. Bottom-right: the view counter, always visible.
// Manages its own comments modal. Used by both ArticleCard and the articles list.
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, Bookmark, MessageCircle, Share2, Eye, MoreHorizontal, Trash2 } from 'lucide-react';
import { useEngagement } from '../../app_context/EngagementContext';
import { useUI } from '../../app_context/UIContext';
import CommentsModal from './CommentsModal';

function ArticleEngagementBar({ article, onDelete }) {
  const { t } = useTranslation();
  const { isLiked, isFavorited, toggleLike, toggleFavorite } = useEngagement();
  const { showSuccess } = useUI();
  const [showComments, setShowComments] = useState(false);
  const [open, setOpen] = useState(false);
  const optionsRef = useRef(null);

  const liked = isLiked(article.id_article);
  const favorited = isFavorited(article.id_article);

  // Collapse the options when clicking anywhere else or pressing Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const stop = (fn) => (e) => { e.stopPropagation(); fn(e); };

  const handleShare = () => {
    const url = `${window.location.origin}?article=${article.id_article}`;
    navigator.clipboard.writeText(url).then(() => showSuccess('¡Enlace copiado!'));
  };

  const actions = [
    {
      key: 'like',
      className: liked ? 'engagement-btn--active' : '',
      onClick: () => toggleLike(article.id_article),
      title: t('engagement.like'),
      pressed: liked,
      icon: <ThumbsUp size={18} fill={liked ? 'currentColor' : 'none'} />,
    },
    {
      key: 'favorite',
      className: favorited ? 'engagement-btn--active' : '',
      onClick: () => toggleFavorite(article.id_article),
      title: t('engagement.favorite'),
      pressed: favorited,
      icon: <Bookmark size={18} fill={favorited ? 'currentColor' : 'none'} />,
    },
    {
      key: 'comments',
      className: showComments ? 'engagement-btn--active' : '',
      onClick: () => setShowComments(true),
      title: t('engagement.comments'),
      icon: <MessageCircle size={18} fill={showComments ? 'currentColor' : 'none'} />,
    },
    {
      key: 'share',
      className: '',
      onClick: handleShare,
      title: t('common.buttons.share'),
      icon: <Share2 size={18} />,
    },
  ];
  if (onDelete) {
    actions.push({
      key: 'delete',
      className: 'engagement-btn--danger',
      onClick: (e) => onDelete(e),
      title: t('article.detail.deleteArticle'),
      icon: <Trash2 size={18} />,
    });
  }

  return (
    <div className="article-engagement-bar" onClick={(e) => e.stopPropagation()}>
      <div ref={optionsRef} className={`engagement-options ${open ? 'is-open' : ''}`}>
        <button
          type="button"
          className="engagement-btn engagement-options-toggle"
          onClick={stop(() => setOpen(true))}
          title={t('engagement.options', 'Opciones')}
          aria-label={t('engagement.options', 'Opciones')}
          aria-expanded={open}
          tabIndex={open ? -1 : 0}
        >
          <MoreHorizontal size={18} />
        </button>
        <div className="engagement-options-items">
          {actions.map((a, i) => (
            <button
              key={a.key}
              type="button"
              className={`engagement-btn ${a.className}`}
              style={{ '--i': i }}
              onClick={stop(a.onClick)}
              title={a.title}
              aria-pressed={a.pressed}
              tabIndex={open ? 0 : -1}
            >
              {a.icon}
            </button>
          ))}
        </div>
      </div>

      <span className="engagement-views" title={t('article.detail.views')}>
        <Eye size={18} />
        {article.view_count_article || 0}
      </span>

      {showComments && (
        <CommentsModal
          articleId={article.id_article}
          articleTitle={article.title_article}
          onClose={() => setShowComments(false)}
        />
      )}
    </div>
  );
}

export default ArticleEngagementBar;
