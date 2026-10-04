// magazine-front/src/components/magazine/ArticleEngagementBar.jsx
//
// Reusable engagement bar for article cards. Bottom-left: a single "options"
// button; clicking it reveals the actions (like / favorite / comments / share,
// plus delete for authors/admins), which slide out one after another as if they
// had been stacked behind it. Bottom-right: the view counter, always visible.
// Manages its own comments modal. Used by both ArticleCard and the articles list.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, Bookmark, MessageCircle, Share2, Eye, Trash2 } from 'lucide-react';
import { useEngagement } from '../../app_context/EngagementContext';
import { useUI } from '../../app_context/UIContext';
import CommentsModal from './CommentsModal';
import OptionsReveal from './OptionsReveal';

function ArticleEngagementBar({ article, onDelete }) {
  const { t } = useTranslation();
  const { isLiked, isFavorited, toggleLike, toggleFavorite } = useEngagement();
  const { showSuccess } = useUI();
  const [showComments, setShowComments] = useState(false);

  const liked = isLiked(article.id_article);
  const favorited = isFavorited(article.id_article);

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
      label: t('engagement.label.like', 'Me gusta'),
      pressed: liked,
      icon: <ThumbsUp size={18} fill={liked ? 'currentColor' : 'none'} />,
    },
    {
      key: 'favorite',
      className: favorited ? 'engagement-btn--active' : '',
      onClick: () => toggleFavorite(article.id_article),
      title: t('engagement.favorite'),
      label: t('engagement.label.favorite', 'Favoritos'),
      pressed: favorited,
      icon: <Bookmark size={18} fill={favorited ? 'currentColor' : 'none'} />,
    },
    {
      key: 'comments',
      className: showComments ? 'engagement-btn--active' : '',
      onClick: () => setShowComments(true),
      title: t('engagement.comments'),
      label: t('engagement.label.comments', 'Comentarios'),
      icon: <MessageCircle size={18} fill={showComments ? 'currentColor' : 'none'} />,
    },
    {
      key: 'share',
      className: '',
      onClick: handleShare,
      title: t('common.buttons.share'),
      label: t('engagement.label.share', 'Compartir'),
      icon: <Share2 size={18} />,
    },
  ];
  if (onDelete) {
    actions.push({
      key: 'delete',
      className: 'engagement-btn--danger',
      onClick: (e) => onDelete(e),
      title: t('article.detail.deleteArticle'),
      label: t('engagement.label.delete', 'Eliminar'),
      icon: <Trash2 size={18} />,
    });
  }

  return (
    <div className="article-engagement-bar" onClick={(e) => e.stopPropagation()}>
      <OptionsReveal actions={actions} />

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
