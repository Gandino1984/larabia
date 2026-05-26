// magazine-front/src/components/authors/AuthorPublications.jsx
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../app_context/UIContext';
import { useAuthor } from '../../app_context/AuthorContext';
import { ArrowLeft } from 'lucide-react';
import ArticleCard from '../magazine/ArticleCard';
import axiosInstance from '../../utils/axiosConfig';
import './AuthorPublications.css';

function AuthorPublications() {
  const { t } = useTranslation();
  const { selectedAuthorId, navigateBack } = useUI();
  const { authorProfiles, fetchAllProfiles } = useAuthor();
  const [imageError, setImageError] = useState(false);
  // Use local article state — bypasses any global category filter set elsewhere
  const [allArticles, setAllArticles] = useState([]);
  const [articlesLoading, setArticlesLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setArticlesLoading(true);
    axiosInstance.get('/magazine-article')
      .then(res => setAllArticles(res.data.data || []))
      .catch(() => setAllArticles([]))
      .finally(() => setArticlesLoading(false));
    if (authorProfiles.length === 0) {
      fetchAllProfiles();
    }
  }, []);

  // Find the author profile
  const authorProfile = useMemo(() => {
    return authorProfiles.find(profile => String(profile.user_id) === String(selectedAuthorId));
  }, [authorProfiles, selectedAuthorId]);

  // Filter articles by author
  const authorArticles = useMemo(() => {
    if (!selectedAuthorId || !allArticles) return [];

    return allArticles.filter(article => {
      // Check modern multi-author array
      if (article.authors?.length > 0) {
        return article.authors.some(author => String(author.id_user) === String(selectedAuthorId));
      }
      // Fall back to legacy single-author field
      if (article.author?.id_user) {
        return String(article.author.id_user) === String(selectedAuthorId);
      }
      return false;
    });
  }, [allArticles, selectedAuthorId]);

  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
  const authorImageUrl = authorProfile?.profile_image
    ? `${apiUrl}/uploads/author-profiles/${encodeURIComponent(authorProfile.profile_image)}`
    : authorProfile?.user?.image_user
      ? `${apiUrl}/user/image/${encodeURIComponent(authorProfile.user.image_user)}`
      : null;

  if (!selectedAuthorId) {
    return (
      <div className="author-publications-page">
        <div className="publications-error">
          <p>{t('authors.authorNotFound')}</p>
          <button onClick={navigateBack} className="btn-back-nav">
            <ArrowLeft size={20} />{t('common.buttons.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="author-publications-page">
      <div className="publications-container">
        <header className="publications-header">
          <button onClick={navigateBack} className="btn-back-nav" title={t('common.buttons.back')}>
            <ArrowLeft size={24} />
          </button>
          <div className="header-content">
            <h1>{t('authors.publicationsBy')}</h1>

            {authorProfile && (
              <div className="author-info-banner">
                {authorImageUrl && !imageError ? (
                  <img
                    src={authorImageUrl}
                    alt={authorProfile.display_name}
                    className="author-avatar"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="author-avatar-placeholder">
                    {authorProfile.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="author-details">
                  <h2>{authorProfile.display_name}</h2>
                  {authorProfile.specialty_tags && authorProfile.specialty_tags.length > 0 && (
                    <div className="author-tags">
                      {authorProfile.specialty_tags.map((tag, idx) => (
                        <span key={idx} className="author-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {articlesLoading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>{t('magazine.loadingArticles')}</p>
          </div>
        )}

        {!articlesLoading && authorArticles.length === 0 && (
          <div className="empty-state">
            <p>{t('authors.noPublications')}</p>
            <p className="empty-hint">
              {authorProfile?.display_name
                ? t('authors.noPublicationsHint', { name: authorProfile.display_name })
                : t('authors.noPublicationsGeneric')}
            </p>
          </div>
        )}

        {!articlesLoading && authorArticles.length > 0 && (
          <div className="publications-content">
            <div className="publications-count">
              {t('authors.publicationsCount', { count: authorArticles.length })}
            </div>
            <div className="publications-grid">
              {authorArticles.map(article => (
                <ArticleCard key={article.id_article} article={article} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthorPublications;
