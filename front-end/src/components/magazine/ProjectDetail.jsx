// magazine-front/src/components/magazine/ProjectDetail.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bell, LayoutGrid, GalleryHorizontal, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useUI } from '../../app_context/UIContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { useAuth } from '../../app_context/AuthContext';
import { useEngagement } from '../../app_context/EngagementContext';
import axiosInstance from '../../utils/axiosConfig';
import ArticleCard from './ArticleCard';
import ProjectFilesPanel from './ProjectFilesPanel';
import OptionsReveal from './OptionsReveal';
import AuthorChip from '../common/AuthorChip';
import { useDragScroll } from '../../hooks/useDragScroll';
import './ProjectDetail.css';

function ProjectDetail() {
  const { t } = useTranslation();
  const { navigateBackFromProject } = useUI();
  const { selectedProject } = useMagazine();
  const { currentUser, canCreateContent } = useAuth();
  const { isSubscribed, toggleSubscribe } = useEngagement();
  const [showFilesPanel, setShowFilesPanel] = useState(false);
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
  // Darken the articles-section background (differentiating it from the project
  // info): on hover (desktop via CSS) or when active (mobile — in view / arrow tap).
  const articlesRef = useRef(null);
  const [articlesActive, setArticlesActive] = useState(false);
  const scrollCarousel = useCallback((dir) => {
    // On mobile tapping an arrow also triggers the darken; on desktop :hover
    // owns it (so it clears when the mouse leaves).
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
      setArticlesActive(true);
    }
    const track = carouselRef.current;
    if (!track) return;
    const card = track.querySelector('.article-card');
    const amount = card ? card.offsetWidth + 24 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }, []);
  useDragScroll(carouselRef, viewMode === 'carousel');

  // Mobile only: activate the darken effect when the articles section scrolls
  // into view (desktop relies on :hover).
  useEffect(() => {
    const el = articlesRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!isMobile) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setArticlesActive(entry.isIntersecting));
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [projectArticles.length, viewMode]);

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

  const projectActions = [];
  if (currentUser) {
    const subscribed = isSubscribed(selectedProject.id_project);
    projectActions.push({
      key: 'subscribe',
      className: subscribed ? 'engagement-btn--active' : '',
      onClick: () => toggleSubscribe(selectedProject.id_project),
      title: subscribed ? t('subscribe.following') : t('subscribe.follow'),
      label: subscribed ? t('subscribe.following') : t('engagement.label.follow', 'Seguir'),
      pressed: subscribed,
      icon: <Bell size={18} fill={subscribed ? 'currentColor' : 'none'} />,
    });
  }
  if (canCreateContent) {
    projectActions.push({
      key: 'files',
      onClick: () => setShowFilesPanel(true),
      title: t('project.files.title', 'Descargar archivos del proyecto'),
      label: t('project.files.label', 'Archivos'),
      icon: <Download size={18} />,
    });
  }

  return (
    <div className="project-detail-page">
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
          {/* Top row: type/format badges (left) and, top-right, the ⋯ button that
              groups follow (logged-in users) and download files (editors+). */}
          {(selectedProject.type_project || selectedProject.format_project || projectActions.length > 0) && (
            <div className="project-detail-top-row">
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
              <OptionsReveal actions={projectActions} align="end" className="project-options" />
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
                  {selectedProject.authors?.length > 0
                    ? selectedProject.authors.map((author) => (
                        <AuthorChip key={author.id_user} author={author} tone="dark" />
                      ))
                    : <AuthorChip name={selectedProject.author_name} clickable={false} tone="dark" />}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showFilesPanel && (
        <ProjectFilesPanel
          projectId={selectedProject.id_project}
          projectTitle={selectedProject.title_project}
          userId={currentUser?.id_user}
          onClose={() => setShowFilesPanel(false)}
        />
      )}

      <div className={`project-detail-articles ${articlesActive ? 'project-detail-articles--active' : ''}`} ref={articlesRef}>
        {loading ? (
          <p className="project-detail-loading">{t('common.loading')}</p>
        ) : projectArticles.length > 0 ? (
          (() => {
            const ordered = [...projectArticles].sort((a, b) => (a.id_article || 0) - (b.id_article || 0));
            return (
              <>
                <p className="project-articles-count">
                  {ordered.length === 1
                    ? t('project.articlesCount', { count: 1 })
                    : t('project.articlesCount_plural', { count: ordered.length })}
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
                      <ChevronLeft size={44} />
                    </button>
                    <div className="articles-carousel" ref={carouselRef}>
                      {ordered.map(article => (
                        <ArticleCard key={article.id_article} article={article} typeBadge={selectedProject.type_project} featuredBadge={selectedProject.featured_project} />
                      ))}
                    </div>
                    <button type="button" className="carousel-arrow carousel-arrow--next" onClick={() => scrollCarousel(1)} aria-label="Siguiente">
                      <ChevronRight size={44} />
                    </button>
                  </div>
                ) : (
                  <div className="project-articles-grid">
                    {ordered.map(article => (
                      <ArticleCard key={article.id_article} article={article} typeBadge={selectedProject.type_project} featuredBadge={selectedProject.featured_project} />
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
