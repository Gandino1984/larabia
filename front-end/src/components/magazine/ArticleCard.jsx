// magazine-front/src/components/magazine/ArticleCard.jsx
import { Calendar, User, Eye, Trash2, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMagazine } from '../../app_context/MagazineContext';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import './ArticleCard.css';

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

function ArticleCard({ article }) {
  const { t } = useTranslation();
  const { setSelectedArticle, deleteArticle } = useMagazine();
  const { canCreateContent, isArticleAuthor, isSuperAdmin } = useAuth();
  const { navigateToArticle, showSuccess, showError } = useUI();

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

  const handleShare = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}?article=${article.id_article}`;
    navigator.clipboard.writeText(url).then(() => {
      showSuccess('¡Enlace copiado!');
    });
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
        {article.category_article && (
          <span className="article-category">{getCategoryDisplay(article.category_article)}</span>
        )}
      </div>

      <div className="article-card-content">
        {article.project_title && (
          <span className="article-project-label">{article.project_title}</span>
        )}
        <h3 className="article-card-title">{article.title_article}</h3>

        {article.excerpt_article && (
          <p className="article-card-excerpt">{article.excerpt_article}</p>
        )}

        <div className="article-card-meta">
          {article.date_published && (
            <span className="meta-item">
              <Calendar size={16} />
              {formatDate(article.date_published)}
            </span>
          )}

          {article.author_name && (
            <span className="meta-item">
              <User size={16} />
              {article.author_name}
            </span>
          )}

          {article.view_count_article > 0 && (
            <span className="meta-item">
              <Eye size={16} />
              {article.view_count_article}
            </span>
          )}
        </div>
        <button className="article-share-btn" onClick={handleShare} title={t('common.buttons.share')}>
          <Share2 size={18} />
          <span>{t('common.buttons.share')}</span>
        </button>
      </div>
    </article>
  );
}

export default ArticleCard;
