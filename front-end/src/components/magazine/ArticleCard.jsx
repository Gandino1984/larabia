// magazine-front/src/components/magazine/ArticleCard.jsx
import { useState } from 'react';
import { Calendar, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMagazine } from '../../app_context/MagazineContext';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import ArticleEngagementBar from './ArticleEngagementBar';
import SubscriberMark from '../common/SubscriberMark';
import { categoryLabel } from '../../utils/articleFilters';
import { projectTypeLabel } from '../../utils/projectKinds';
import { articleTitle, articleExcerpt, articleProjectTitle } from '../../utils/contentLang';
import { localDate } from '../../utils/locale';
import './ArticleCard.css';

// Resolve a user's avatar: Google users store a full URL, local uploads a filename.
const resolveAuthorImage = (img) => {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
  return `${apiUrl}/user/image/${encodeURIComponent(img)}`;
};

function CardAuthorAvatar({ author }) {
  const [err, setErr] = useState(false);
  const url = resolveAuthorImage(author?.image_user);
  const avatar = (!url || err)
    ? <span className="card-author-avatar card-author-avatar--fallback">{author?.name_user?.charAt(0)?.toUpperCase() || '?'}</span>
    : <img src={url} alt={author.name_user} className="card-author-avatar" onError={() => setErr(true)} />;
  return <SubscriberMark userId={author?.id_user}>{avatar}</SubscriberMark>;
}

const normalize = (s) => s?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? '';

function ArticleCard({ article, typeBadge, featuredBadge }) {
  const { t, i18n } = useTranslation();
  // Title, excerpt and project in the header's language (or the original).
  const lang = i18n.language;
  const { setSelectedArticle, deleteArticle } = useMagazine();
  const { canCreateContent, isArticleAuthor, isSuperAdmin } = useAuth();
  const { navigateToArticle, showSuccess, showError, openAuthorCard } = useUI();

  const handleClick = () => {
    setSelectedArticle(article);
    navigateToArticle();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return localDate(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCoverImageUrl = () => {
    const cover = article.cover_image_article;
    if (!cover) return '/logoFondoNegro.jpg';
    if (cover.startsWith('http://') || cover.startsWith('https://')) return cover;
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
    return `${apiUrl}${cover.startsWith('/') ? cover : '/' + cover}`;
  };


  const handleDelete = async (e) => {
    e.stopPropagation();

    if (!confirm(t('article.detail.confirmDelete', { title: articleTitle(article, lang) }))) {
      return;
    }

    const result = await deleteArticle(article.id_article);
    if (!result.error) {
      showSuccess(t('messages.success.articleDeleted'));
    } else {
      showError(result.error || t('messages.error.deleteArticle'));
    }
  };

  return (
    <article className="article-card" onClick={handleClick}>
      <div className="article-card-image">
        <img
          src={getCoverImageUrl()}
          alt={article.title_article}
          onError={(e) => {
            e.target.src = '/logoFondoNegro.jpg';
          }}
        />
        {(() => {
          // Prefer an explicit type badge (e.g. the project's type); otherwise
          // fall back to the article's category (hidden when it's "general").
          const typeLabel = typeBadge
            ? projectTypeLabel(typeBadge, t)
            : (article.category_article && normalize(article.category_article) !== 'general'
                ? categoryLabel(article.category_article, t)
                : null);
          const isFeatured = featuredBadge || article.featured_article;
          if (!typeLabel && !isFeatured) return null;
          return (
            <div className="article-badges">
              {isFeatured && (
                <span className="article-badge article-featured-badge">{t('article.detail.featured')}</span>
              )}
              {typeLabel && (
                <span className="article-badge article-category">{typeLabel}</span>
              )}
            </div>
          );
        })()}
      </div>

      <div className="article-card-content">
        {article.date_published && (
          <span className="article-card-date">
            <Calendar size={16} />
            {formatDate(article.date_published)}
          </span>
        )}
        {article.project_title && (
          <span className="article-project-label">
            {t('article.projectLabel', { title: articleProjectTitle(article, lang), defaultValue: 'Proyecto: {{title}}' })}
          </span>
        )}
        <h3 className="article-card-title">{articleTitle(article, lang)}</h3>

        {articleExcerpt(article, lang) && (
          <p className="article-card-excerpt">{articleExcerpt(article, lang)}</p>
        )}

        <div className="article-card-meta">
          {(article.authors?.length > 0 || article.author_name) && (
            <span className="meta-item meta-item--authors">
              {article.authors?.length > 0 ? (
                article.authors.map(author => (
                  <span
                    key={author.id_user || author.name_user}
                    className="card-author card-author--clickable"
                    onClick={(e) => { e.stopPropagation(); openAuthorCard(author); }}
                    role="button"
                    tabIndex={0}
                  >
                    <CardAuthorAvatar author={author} />
                    <span className="card-author-name">{author.name_user}</span>
                  </span>
                ))
              ) : (
                <span className="card-author">
                  <User size={16} />
                  <span className="card-author-name">{article.author_name}</span>
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Engagement bar at the bottom: like / favorite / comments + views */}
      <ArticleEngagementBar
        article={article}
        onDelete={canCreateContent && (isSuperAdmin || isArticleAuthor(article)) ? handleDelete : undefined}
      />
    </article>
  );
}

export default ArticleCard;
