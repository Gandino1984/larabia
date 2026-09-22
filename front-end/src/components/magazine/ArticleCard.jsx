// magazine-front/src/components/magazine/ArticleCard.jsx
import { useState } from 'react';
import { Calendar, User, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMagazine } from '../../app_context/MagazineContext';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import ArticleEngagementBar from './ArticleEngagementBar';
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
  if (!url || err) {
    return <span className="card-author-avatar card-author-avatar--fallback">{author?.name_user?.charAt(0)?.toUpperCase() || '?'}</span>;
  }
  return <img src={url} alt={author.name_user} className="card-author-avatar" onError={() => setErr(true)} />;
}

const CATEGORY_DISPLAY = {
  'terrenito en pluton': 'Terrenito en Plut\u00F3n',
  'micro abierto': 'Terrenito en Plut\u00F3n',
};
const normalize = (s) => s?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? '';
const getCategoryDisplay = (cat) => {
  if (!cat) return cat;
  const n = normalize(cat);
  if (CATEGORY_DISPLAY[n]) return CATEGORY_DISPLAY[n];
  if (n.includes('terrenito')) return 'Terrenito en Plut\u00F3n';
  return cat;
};

// Pretty labels for a project's type, shown as the card badge inside a project.
const TYPE_DISPLAY = {
  'no-ficcion': 'No-ficción',
  'noficcion': 'No-ficción',
  'ficcion': 'Ficción',
  'periodistico': 'Periodístico',
};
const getTypeDisplay = (type) => {
  if (!type) return null;
  const n = normalize(type);
  if (TYPE_DISPLAY[n]) return TYPE_DISPLAY[n];
  return type.charAt(0).toUpperCase() + type.slice(1);
};

function ArticleCard({ article, typeBadge, featuredBadge }) {
  const { t } = useTranslation();
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
    return date.toLocaleDateString('es-ES', {
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

    if (!confirm(`¿Estás seguro de que quieres eliminar el artículo "${article.title_article}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    const result = await deleteArticle(article.id_article);
    if (!result.error) {
      showSuccess('Artículo eliminado exitosamente');
    } else {
      showError(result.error || 'Error al eliminar el artículo');
    }
  };

  return (
    <article className="article-card" onClick={handleClick}>
      {canCreateContent && (isSuperAdmin || isArticleAuthor(article)) && (
        <div className="article-action-buttons">
          <button className="article-delete-btn" onClick={handleDelete} title="Eliminar artículo">
            <Trash2 size={18} />
          </button>
        </div>
      )}

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
            ? getTypeDisplay(typeBadge)
            : (article.category_article && normalize(article.category_article) !== 'general'
                ? getCategoryDisplay(article.category_article)
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
          <span className="article-project-label">Proyecto: {article.project_title}</span>
        )}
        <h3 className="article-card-title">{article.title_article}</h3>

        {article.excerpt_article && (
          <p className="article-card-excerpt">{article.excerpt_article}</p>
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
      <ArticleEngagementBar article={article} />
    </article>
  );
}

export default ArticleCard;
