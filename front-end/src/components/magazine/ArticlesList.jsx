// magazine-front/src/components/magazine/ArticlesList.jsx
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMagazine } from '../../app_context/MagazineContext';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { Calendar, User, Eye, ArrowLeft, Trash2, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import './ArticlesList.css';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

const ARTICLES_PER_PAGE = 9;

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

function getAuthorImageUrl(author) {
  const img = author?.image_user;
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return `${apiUrl}/user/image/${encodeURIComponent(img)}`;
}

function AuthorAvatar({ author }) {
  const [imgError, setImgError] = useState(false);
  const url = getAuthorImageUrl(author);
  if (!url || imgError) {
    return (
      <span className="list-author-avatar list-author-avatar--fallback">
        {author.name_user?.charAt(0)?.toUpperCase() || '?'}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={author.name_user}
      className="list-author-avatar"
      onError={() => setImgError(true)}
    />
  );
}

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = [];
  pages.push(1);
  if (currentPage > 3) pages.push('...');
  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
    pages.push(i);
  }
  if (currentPage < totalPages - 2) pages.push('...');
  pages.push(totalPages);
  return pages;
}

function ArticlesList() {
  const { t } = useTranslation();
  const { articles, loading, fetchArticles, setSelectedArticle, deleteArticle } = useMagazine();
  const { isEditor, isArticleAuthor, isSuperAdmin } = useAuth();
  const { navigateToHome, navigateToArticle, getCurrentLocale, showSuccess, showError } = useUI();

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchArticles();
  }, [fetchArticles]);

  // Reset to page 1 whenever the article list changes (e.g. filter applied)
  useEffect(() => {
    setCurrentPage(1);
  }, [articles.length]);

  const totalPages = Math.ceil(articles.length / ARTICLES_PER_PAGE);
  const paginatedArticles = articles.slice(
    (currentPage - 1) * ARTICLES_PER_PAGE,
    currentPage * ARTICLES_PER_PAGE
  );

  const goToPage = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleArticleClick = (article) => {
    setSelectedArticle(article);
    navigateToArticle();
  };

  const handleShare = (e, article) => {
    e.stopPropagation();
    const url = `${window.location.origin}?article=${article.id_article}`;
    navigator.clipboard.writeText(url).then(() => {
      showSuccess('¡Enlace copiado!');
    });
  };

  const handleDelete = async (e, article) => {
    e.stopPropagation();
    if (!confirm(t('article.detail.confirmDelete', { title: article.title_article }))) return;
    const result = await deleteArticle(article.id_article);
    if (!result.error) {
      showSuccess(t('messages.success.articleDeleted'));
    } else {
      showError(result.error || t('messages.error.deleteArticle'));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(getCurrentLocale(), {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCoverImageUrl = (article) => {
    const cover = article?.cover_image_article;
    if (!cover) return '/logoFondoNegro.jpg';
    if (cover.startsWith('http://') || cover.startsWith('https://')) return cover;
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
    return `${apiUrl}${cover.startsWith('/') ? cover : '/' + cover}`;
  };

  if (loading) {
    return (
      <div className="articles-list-page">
        <div className="articles-list-loading">{t('article.list.loading')}</div>
      </div>
    );
  }

  return (
    <div className="articles-list-page">
      <div className="articles-list-header">
        <div className="header-title-row">
          <button className="btn-back-nav" onClick={navigateToHome} title={t('common.buttons.backToHome')}>
            <ArrowLeft size={24} />
          </button>
          <h1>{t('article.list.title')}</h1>
        </div>
        <p className="articles-count">{articles.length === 1 ? t('article.list.count', { count: 1 }) : t('article.list.count_plural', { count: articles.length })}</p>
      </div>

      {articles.length === 0 ? (
        <div className="no-articles">
          <p>{t('article.list.empty')}</p>
        </div>
      ) : (
        <>
          <div className="articles-grid">
            {paginatedArticles.map((article) => (
              <article
                key={article.id_article}
                className="article-card"
                onClick={() => handleArticleClick(article)}
              >
                {isEditor && (isSuperAdmin || isArticleAuthor(article)) && (
                  <button
                    className="list-delete-btn"
                    onClick={(e) => handleDelete(e, article)}
                    title={t('article.detail.deleteArticle')}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <div className="article-card-image">
                  <img
                    src={getCoverImageUrl(article)}
                    alt={article.title_article}
                    onError={(e) => {
                      e.target.src = '/logoFondoNegro.jpg';
                    }}
                  />
                  <div className="list-badges">
                    {article.category_article && (
                      <span className="list-type-badge">
                        {getCategoryDisplay(article.category_article)}
                      </span>
                    )}
                    {article.featured_article && (
                      <span className="list-featured-badge">{t('article.detail.featured')}</span>
                    )}
                  </div>
                </div>

                <div className="article-card-content">
                  {article.project_title && (
                    <span className="article-project-label">{article.project_title}</span>
                  )}
                  <h2 className="article-title">{article.title_article}</h2>

                  {article.excerpt_article && (
                    <p className="article-excerpt">{article.excerpt_article}</p>
                  )}

                  <div className="article-meta">
                    {article.date_published && (
                      <span className="meta-item">
                        <Calendar size={16} />
                        {formatDate(article.date_published)}
                      </span>
                    )}

                    {(article.authors?.length > 0 || article.author_name) && (
                      <span className="meta-item meta-item--authors">
                        {article.authors?.length > 0 ? (
                          article.authors.map(author => (
                            <span key={author.id_user || author.name_user} className="list-author">
                              <AuthorAvatar author={author} />
                              <span className="list-author-name">{author.name_user}</span>
                            </span>
                          ))
                        ) : (
                          <span className="list-author">
                            <User size={16} />
                            <span className="list-author-name">{article.author_name}</span>
                          </span>
                        )}
                      </span>
                    )}

                    {article.view_count_article > 0 && (
                      <span className="meta-item">
                        <Eye size={16} />
                        {article.view_count_article}
                      </span>
                    )}
                  </div>
                  <button
                    className="article-share-btn"
                    onClick={(e) => handleShare(e, article)}
                    title={t('common.buttons.share')}
                  >
                    <Share2 size={18} />
                    <span>{t('common.buttons.share')}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="pagination">
              <button
                className="pagination-btn pagination-prev"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Página anterior"
              >
                <ChevronLeft size={18} />
              </button>

              {getPageNumbers(currentPage, totalPages).map((page, i) =>
                page === '...' ? (
                  <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
                ) : (
                  <button
                    key={page}
                    className={`pagination-btn pagination-page${currentPage === page ? ' active' : ''}`}
                    onClick={() => goToPage(page)}
                    aria-current={currentPage === page ? 'page' : undefined}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                className="pagination-btn pagination-next"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Página siguiente"
              >
                <ChevronRight size={18} />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default ArticlesList;
