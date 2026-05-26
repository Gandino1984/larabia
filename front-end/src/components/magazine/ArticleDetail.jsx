// magazine-front/src/components/magazine/ArticleDetail.jsx
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMagazine } from '../../app_context/MagazineContext';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useAuthor } from '../../app_context/AuthorContext';
import { Calendar, User, Eye, X, Trash2, Maximize, Minimize, Edit, Volume2, ArrowLeft, Share2 } from 'lucide-react';
import HScrollViewer from './HScrollViewer';
import './ArticleDetail.css';

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

function ArticleDetail() {
  const { t } = useTranslation();
  const { selectedArticle, setSelectedArticle, deleteArticle, fetchBlocksByArticleId, trackArticleView } = useMagazine();
  const { navigateBack, showSuccess, showError, navigateToHome, navigateToEditorForEdit, isFullscreen, setIsFullscreen, getCurrentLocale, navigateToAuthorProfile } = useUI();
  const { isEditor, isArticleAuthor, isSuperAdmin } = useAuth();
  const { authorProfiles, fetchAllProfiles } = useAuthor();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedArticle]);

  // Track view: once per navigation to this article (not on refresh)
  useEffect(() => {
    const id = selectedArticle?.id_article;
    if (!id) return;

    const key = `article_view_${id}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      trackArticleView(id);
    }

    return () => {
      sessionStorage.removeItem(key);
    };
  }, [selectedArticle?.id_article]);

  // Load author profiles if not yet fetched (needed for clickable author links)
  useEffect(() => {
    if (authorProfiles.length === 0) fetchAllProfiles();
  }, []);

  // Fetch blocks when article loads — always fetch fresh to ensure latest images/content
  useEffect(() => {
    const loadBlocks = async () => {
      if (!selectedArticle?.id_article) return;

      const result = await fetchBlocksByArticleId(selectedArticle.id_article);
      if (result.success && result.data) {
        setSelectedArticle(prev => ({ ...prev, blocks: result.data }));
      }
    };

    loadBlocks();
  }, [selectedArticle?.id_article]);

  const handleDeleteClick = async () => {
    if (!selectedArticle) return;

    if (!confirm(t('article.detail.confirmDelete', { title: selectedArticle.title_article }))) {
      return;
    }

    const result = await deleteArticle(selectedArticle.id_article);
    if (!result.error) {
      showSuccess(t('messages.success.articleDeleted'));
      navigateToHome();
    } else {
      showError(result.error || t('messages.error.deleteArticle'));
    }
  };

  const handleEditClick = () => {
    // The selectedArticle is already set, just navigate to editor
    // navigateToEditorForEdit signals that the editor should load selectedArticle
    navigateToEditorForEdit();
  };

  const handleShareClick = () => {
    const url = `${window.location.origin}?article=${selectedArticle.id_article}`;
    navigator.clipboard.writeText(url).then(() => {
      showSuccess('¡Enlace copiado!');
    });
  };

  if (!selectedArticle) {
    return (
      <div className="article-detail-error">
        <p>{t('article.detail.notFound')}</p>
        <button onClick={navigateBack} className="btn-back-nav"><ArrowLeft size={24} />{t('common.buttons.back')}</button>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(getCurrentLocale(), {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCoverImageUrl = () => {
    if (selectedArticle.cover_image_article) {
      // If the path starts with '/', it's a public folder image
      if (selectedArticle.cover_image_article.startsWith('/')) {
        return selectedArticle.cover_image_article;
      }
      // Otherwise, it's a backend-served image
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
      return `${apiUrl}/${selectedArticle.cover_image_article}`;
    }
    return null;
  };

  const getAuthorImageUrl = (author) => {
    const img = author?.image_user;
    if (!img) return null;
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
    return `${apiUrl}/user/image/${encodeURIComponent(img)}`;
  };

  const handleAuthorClick = (author) => {
    const profile = authorProfiles?.find(p => p.user_id === author.id_user);
    if (profile) navigateToAuthorProfile(profile);
  };

  const authorHasProfile = (author) => !!authorProfiles?.find(p => p.user_id === author.id_user);

  // Detect if this is a comic article
  const isComicArticle = useMemo(() => {
    return selectedArticle.blocks?.some(block => block.block_type === 'comic_panel') || false;
  }, [selectedArticle.blocks]);

  // Detect if article has audio panels
  const hasAudio = useMemo(() => {
    return selectedArticle.blocks?.some(block => block.interaction_type === 'audio') || false;
  }, [selectedArticle.blocks]);

  // Get comic panels for HScrollViewer
  const comicPanels = useMemo(() => {
    if (!isComicArticle) return [];
    return selectedArticle.blocks
      .filter(block => block.block_type === 'comic_panel')
      .sort((a, b) => (a.block_order || 0) - (b.block_order || 0));
  }, [isComicArticle, selectedArticle.blocks]);

  // Fullscreen mode for comics
  if (isFullscreen && isComicArticle) {
    return (
      <div className="article-fullscreen">
        <div className="fullscreen-controls">
          <button
            className="fullscreen-btn"
            onClick={() => setIsFullscreen(false)}
            title={t('article.detail.exitFullscreen')}
            aria-label={t('article.detail.exitFullscreen')}
          >
            <Minimize size={24} />
          </button>
          <button
            className="fullscreen-close-btn"
            onClick={navigateBack}
            title={t('article.detail.closeArticle')}
            aria-label={t('article.detail.closeArticle')}
          >
            <X size={24} />
          </button>
        </div>
        <div className="fullscreen-viewer">
          <HScrollViewer panels={comicPanels} articleId={selectedArticle.id_article} />
        </div>
      </div>
    );
  }

  return (
    <div className={`article-detail ${isComicArticle ? 'article-detail--comic' : ''}`}>
      <article className={`article-detail-container ${isComicArticle ? 'article-detail-container--comic' : ''}`}>
        {/* Top right controls: badges and buttons */}
        <div className="article-detail-top-controls">
          {/* Audio badge and Fullscreen button */}
          {hasAudio && (
            <div
              className="article-detail-audio-badge"
              title={t('article.detail.audioAvailable')}
              aria-label={t('article.detail.audioAvailable')}
            >
              <Volume2 size={24} />
            </div>
          )}
          {isComicArticle && (
            <button
              className="article-detail-fullscreen-btn"
              onClick={() => setIsFullscreen(true)}
              title={t('article.detail.fullscreen')}
              aria-label={t('article.detail.fullscreen')}
            >
              <Maximize size={24} />
            </button>
          )}

          {/* Editor buttons (Edit and Delete) */}
          {isEditor && (isSuperAdmin || isArticleAuthor(selectedArticle)) && (
            <>
              <button
                className="article-detail-edit-btn"
                onClick={handleEditClick}
                title={t('article.detail.editArticle')}
                aria-label={t('article.detail.editArticle')}
              >
                <Edit size={24} />
              </button>
              <button
                className="article-detail-delete-btn"
                onClick={handleDeleteClick}
                title={t('article.detail.deleteArticle')}
                aria-label={t('article.detail.deleteArticle')}
              >
                <Trash2 size={24} />
              </button>
            </>
          )}

          {/* Share button */}
          <button
            className="article-detail-share-btn"
            onClick={handleShareClick}
            title="Compartir artículo"
            aria-label="Compartir artículo"
          >
            <Share2 size={24} />
          </button>

          {/* Close button */}
          <button
            className="article-detail-close-btn"
            onClick={navigateBack}
            title={t('article.detail.closeArticle')}
            aria-label={t('article.detail.closeArticle')}
          >
            <X size={24} />
          </button>
        </div>

        {getCoverImageUrl() && (
          <div className="article-detail-cover">
            <img
              src={getCoverImageUrl()}
              alt={selectedArticle.title_article}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="article-detail-header">
          {selectedArticle.category_article && (
            <span className="article-detail-category">
              {getCategoryDisplay(selectedArticle.category_article)}
            </span>
          )}

          {selectedArticle.project_title && (
            <span className="article-project-label">{selectedArticle.project_title}</span>
          )}
          <h1 className="article-detail-title">{selectedArticle.title_article}</h1>

          {selectedArticle.excerpt_article && (
            <p className="article-detail-excerpt">{selectedArticle.excerpt_article}</p>
          )}

          <div className="article-detail-meta">
            {selectedArticle.date_published && (
              <span className="meta-item">
                <Calendar size={24} />
                {formatDate(selectedArticle.date_published)}
              </span>
            )}

            {(selectedArticle.authors?.length > 0 || selectedArticle.author_name) && (
              <span className="meta-item meta-item-author">
                {selectedArticle.authors && selectedArticle.authors.length > 0 ? (
                  <>
                    {selectedArticle.authors.map((author, index) => {
                      const hasProfile = authorHasProfile(author);
                      return (
                        <span
                          key={author.id_user}
                          className={`author-info${hasProfile ? ' author-info--clickable' : ''}`}
                          onClick={hasProfile ? () => handleAuthorClick(author) : undefined}
                          title={hasProfile ? `Ver perfil de ${author.name_user}` : undefined}
                        >
                          {getAuthorImageUrl(author) ? (
                            <>
                              <img
                                src={getAuthorImageUrl(author)}
                                alt={author.name_user}
                                className="author-avatar"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                              <User size={24} className="author-icon-fallback" style={{ display: 'none' }} />
                            </>
                          ) : (
                            <User size={24} className="author-icon-fallback" />
                          )}
                          <span className="author-text">
                            {author.name_user}
                            {index < selectedArticle.authors.length - 1 && ', '}
                          </span>
                        </span>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <User size={24} className="author-icon-fallback" />
                    {selectedArticle.author_name}
                  </>
                )}
              </span>
            )}

            {selectedArticle.view_count_article > 0 && (
              <span className="meta-item">
                <Eye size={24} />
                {selectedArticle.view_count_article} {t('article.detail.views')}
              </span>
            )}
          </div>
        </div>

        <div className="article-detail-content">
          {isComicArticle ? (
            <HScrollViewer panels={comicPanels} articleId={selectedArticle.id_article} />
          ) : (
            <>
              {selectedArticle.blocks && selectedArticle.blocks.length > 0 ? (
                selectedArticle.blocks.map((block) => {
                  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
                  return (
                    <div key={block.id_block} className="article-content-block">
                      {block.block_type === 'text' && (
                        <div
                          className="text-content"
                          dangerouslySetInnerHTML={{ __html: block.content }}
                        />
                      )}
                      {block.block_type === 'image' && (
                        <div className="image-content">
                          <img
                            src={block.image_url.startsWith('http')
                              ? block.image_url
                              : `${apiUrl}/${block.image_url.startsWith('/') ? block.image_url.substring(1) : block.image_url}`}
                            alt={block.image_alt || ''}
                            className="article-image"
                          />
                          {block.image_caption && (
                            <p className="image-caption">{block.image_caption}</p>
                          )}
                        </div>
                      )}
                      {block.block_type === 'iframe' && (
                        <div className="iframe-content">
                          <iframe
                            src={block.iframe_url}
                            width={block.iframe_width}
                            height={block.iframe_height}
                            style={{ border: 'none' }}
                            allowFullScreen
                            title="Contenido embebido"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                // Only show content_article if it's not the placeholder text
                selectedArticle.content_article && selectedArticle.content_article !== 'Block-based content' && (
                  <div dangerouslySetInnerHTML={{ __html: selectedArticle.content_article }} />
                )
              )}
            </>
          )}
        </div>

        {selectedArticle.tags_article && selectedArticle.tags_article.length > 0 && (
          <div className="article-detail-tags">
            <h3>{t('article.detail.tags')}</h3>
            <div className="tags-list">
              {selectedArticle.tags_article.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

export default ArticleDetail;
