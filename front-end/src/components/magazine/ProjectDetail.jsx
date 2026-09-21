// magazine-front/src/components/magazine/ProjectDetail.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, User, Bell, LayoutGrid, GalleryHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUI } from '../../app_context/UIContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { useAuth } from '../../app_context/AuthContext';
import { useEngagement } from '../../app_context/EngagementContext';
import axiosInstance from '../../utils/axiosConfig';
import ArticleCard from './ArticleCard';
import './ProjectDetail.css';

function ProjectDetail() {
  const { t } = useTranslation();
  const { navigateBackFromProject } = useUI();
  const { selectedProject } = useMagazine();
  const { currentUser } = useAuth();
  const { isSubscribed, toggleSubscribe } = useEngagement();
  const [projectArticles, setProjectArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('larabia_project_view') || 'grid'; } catch { return 'grid'; }
  });
  const changeViewMode = useCallback((mode) => {
    setViewMode(mode);
    try { localStorage.setItem('larabia_project_view', mode); } catch { /* ignore */ }
  }, []);
  const carouselRef = useRef(null);
  const scrollCarousel = useCallback((dir) => {
    const track = carouselRef.current;
    if (!track) return;
    const card = track.querySelector('.article-card');
    const amount = card ? card.offsetWidth + 24 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }, []);

  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

  useEffect(() => {
    if (!selectedProject?.id_project) return;

    const fetchProjectArticles = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get('/magazine-article', {
          params: { project_id: selectedProject.id_project }
        });
        if (!response.data.error) {
          setProjectArticles(response.data.data || []);
        } else {
          setProjectArticles([]);
        }
      } catch (err) {
        console.error('Error fetching project articles:', err);
        setProjectArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectArticles();
  }, [selectedProject?.id_project]);

  if (!selectedProject) return null;

  const getCoverImageUrl = () => {
    if (selectedProject.cover_image_project) {
      if (selectedProject.cover_image_project.startsWith('/')) {
        return selectedProject.cover_image_project;
      }
      return `${apiUrl}/${selectedProject.cover_image_project}`;
    }
    return null;
  };

  const coverUrl = getCoverImageUrl();

  const getAuthorImageUrl = (author) => {
    const img = author?.image_user;
    if (!img) return null;
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    return `${apiUrl}/user/image/${encodeURIComponent(img)}`;
  };

  return (
    <div className="project-detail-page">
      <button className="btn-back-nav" onClick={navigateBackFromProject} title={t('common.buttons.back')}>
        <ArrowLeft size={22} />
      </button>

      <div className="project-detail-header">
        {coverUrl && (
          <div className="project-detail-cover">
            <img
              src={coverUrl}
              alt={selectedProject.title_project}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        <div className="project-detail-info">
          {(selectedProject.type_project || selectedProject.format_project) && (
            <div className="project-detail-tags">
              {selectedProject.type_project && (
                <span className="project-detail-type">{selectedProject.type_project}</span>
              )}
              {selectedProject.format_project && (
                <span className="project-detail-format">{selectedProject.format_project}</span>
              )}
            </div>
          )}
          <h1 className="project-detail-title">{selectedProject.title_project}</h1>

          {selectedProject.description_project && (
            <p className="project-detail-description">{selectedProject.description_project}</p>
          )}

          <div className="project-detail-meta-row">
            {(selectedProject.authors?.length > 0 || selectedProject.author_name) && (
              <div className="project-detail-collaborators">
                <span className="project-detail-collaborators-label">{t('project.collaborators')}</span>
                <div className="project-detail-authors-list">
                  {selectedProject.authors && selectedProject.authors.length > 0 ? (
                    selectedProject.authors.map(author => (
                      <span key={author.id_user} className="project-detail-author-item">
                        {getAuthorImageUrl(author) ? (
                          <img
                            src={getAuthorImageUrl(author)}
                            alt={author.name_user}
                            className="project-author-avatar"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <User size={14} className="project-author-icon" />
                        )}
                        <span>{author.name_user}</span>
                      </span>
                    ))
                  ) : (
                    <span className="project-detail-author-item">
                      <User size={14} className="project-author-icon" />
                      <span>{selectedProject.author_name}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {currentUser && (() => {
              const subscribed = isSubscribed(selectedProject.id_project);
              return (
                <button
                  type="button"
                  className={`project-subscribe-btn ${subscribed ? 'project-subscribe-btn--active' : ''}`}
                  onClick={() => toggleSubscribe(selectedProject.id_project)}
                  title={subscribed ? t('subscribe.following') : t('subscribe.follow')}
                >
                  <Bell size={18} fill={subscribed ? 'currentColor' : 'none'} />
                  <span>{subscribed ? t('subscribe.following') : t('subscribe.follow')}</span>
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="project-detail-articles">
        {loading ? (
          <p className="project-detail-loading">{t('common.loading')}</p>
        ) : projectArticles.length > 0 ? (
          (() => {
            const ordered = [...projectArticles].sort((a, b) => (a.id_article || 0) - (b.id_article || 0));
            return (
              <>
                <p className="project-articles-count">
                  {ordered.length === 1
                    ? t('article.list.count', { count: 1 })
                    : t('article.list.count_plural', { count: ordered.length })}
                </p>
                <div className="project-articles-toolbar">
                  <div className="articles-view-toggle" data-mode={viewMode} role="group" aria-label={t('article.list.viewMode')}>
                    <button
                      type="button"
                      className={`view-toggle-btn ${viewMode === 'grid' ? 'view-toggle-btn--active' : ''}`}
                      onClick={() => changeViewMode('grid')}
                      title={t('article.list.viewGrid')}
                      aria-pressed={viewMode === 'grid'}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      type="button"
                      className={`view-toggle-btn ${viewMode === 'carousel' ? 'view-toggle-btn--active' : ''}`}
                      onClick={() => changeViewMode('carousel')}
                      title={t('article.list.viewCarousel')}
                      aria-pressed={viewMode === 'carousel'}
                    >
                      <GalleryHorizontal size={18} />
                    </button>
                  </div>
                </div>

                {viewMode === 'carousel' ? (
                  <div className="articles-carousel-wrap">
                    <button type="button" className="carousel-arrow carousel-arrow--prev" onClick={() => scrollCarousel(-1)} aria-label="Anterior">
                      <ChevronLeft size={30} />
                    </button>
                    <div className="articles-carousel" ref={carouselRef}>
                      {ordered.map(article => (
                        <ArticleCard key={article.id_article} article={article} />
                      ))}
                    </div>
                    <button type="button" className="carousel-arrow carousel-arrow--next" onClick={() => scrollCarousel(1)} aria-label="Siguiente">
                      <ChevronRight size={30} />
                    </button>
                  </div>
                ) : (
                  <div className="project-articles-grid">
                    {ordered.map(article => (
                      <ArticleCard key={article.id_article} article={article} />
                    ))}
                  </div>
                )}
              </>
            );
          })()
        ) : (
          <p className="project-detail-empty">{t('project.noArticles')}</p>
        )}
      </div>
    </div>
  );
}

export default ProjectDetail;
