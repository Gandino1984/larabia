// magazine-front/src/components/magazine/ArticleEngagementBar.jsx
//
// Reusable engagement bar for article cards: like / favorite / comments
// (icon-only, fill on click) plus the view counter. Manages its own comments
// modal. Used by both ArticleCard and the articles list.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, Bookmark, MessageCircle, Share2, Eye } from 'lucide-react';
import { useEngagement } from '../../app_context/EngagementContext';
import { useUI } from '../../app_context/UIContext';
import CommentsModal from './CommentsModal';

function ArticleEngagementBar({ article }) {
  const { t } = useTranslation();
  const { isLiked, isFavorited, toggleLike, toggleFavorite } = useEngagement();
  const { showSuccess } = useUI();
  const [showComments, setShowComments] = useState(false);

  const liked = isLiked(article.id_article);
  const favorited = isFavorited(article.id_article);

  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  const handleShare = () => {
    const url = `${window.location.origin}?article=${article.id_article}`;
    navigator.clipboard.writeText(url).then(() => showSuccess('¡Enlace copiado!'));
  };

  return (
    <div className="article-engagement-bar" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`engagement-btn ${liked ? 'engagement-btn--active' : ''}`}
        onClick={stop(() => toggleLike(article.id_article))}
        title={t('engagement.like')}
        aria-pressed={liked}
      >
        <ThumbsUp size={18} fill={liked ? 'currentColor' : 'none'} />
      </button>
      <button
        type="button"
        className={`engagement-btn ${favorited ? 'engagement-btn--active' : ''}`}
        onClick={stop(() => toggleFavorite(article.id_article))}
        title={t('engagement.favorite')}
        aria-pressed={favorited}
      >
        <Bookmark size={18} fill={favorited ? 'currentColor' : 'none'} />
      </button>
      <button
        type="button"
        className={`engagement-btn ${showComments ? 'engagement-btn--active' : ''}`}
        onClick={stop(() => setShowComments(true))}
        title={t('engagement.comments')}
      >
        <MessageCircle size={18} fill={showComments ? 'currentColor' : 'none'} />
      </button>
      <button
        type="button"
        className="engagement-btn"
        onClick={stop(handleShare)}
        title={t('common.buttons.share')}
      >
        <Share2 size={18} />
      </button>
      {article.view_count_article > 0 && (
        <span className="engagement-views" title={t('article.detail.views')}>
          <Eye size={18} />
          {article.view_count_article}
        </span>
      )}

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
