// magazine-front/src/components/workshops/WorkshopsList.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, MapPin, Users, Lock, LayoutGrid, GalleryHorizontal, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useUI } from '../../app_context/UIContext';
import { useWorkshop } from '../../app_context/WorkshopContext';
import { useAuth } from '../../app_context/AuthContext';
import { useWorkshopAccess } from '../../app_context/useWorkshopAccess';
import CreateWorkshopModal from './CreateWorkshopModal';
import WorkshopFilters from './WorkshopFilters';
import { EMPTY_WORKSHOP_FILTERS, applyWorkshopFilters, countActiveWorkshopFilters } from '../../utils/workshopFilters';
import { useDragScroll } from '../../hooks/useDragScroll';
import AuthorChip from '../common/AuthorChip';
import WorkshopMap from '../maps/WorkshopMap';
// Grid / carousel toggle + carousel: the same pieces as the article lists.
import '../magazine/ProjectDetail.css';
import '../magazine/ArticlesCarousel.css';
import './Workshops.css';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
const resolveImg = (img) => {
  if (!img) return null;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  return `${apiUrl}/${img.startsWith('/') ? img.slice(1) : img}`;
};

const formatDate = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch { return null; }
};

// The two sections of the page.
const AUDIENCE_TABS = ['general', 'infantil'];
const audienceOf = (w) => (w.audience_workshop === 'infantil' ? 'infantil' : 'general');

function WorkshopsList() {
  const { t } = useTranslation();
  const { navigateToWorkshopDetail } = useUI();
  const { workshops, loading, fetchWorkshops, setSelectedWorkshop } = useWorkshop();
  const [audience, setAudience] = useState('general');
  // Search / when / month / instructor / spots / order (WorkshopFilters).
  const [filters, setFilters] = useState(EMPTY_WORKSHOP_FILTERS);
  // Admins and super admins can create workshops here too, not only in
  // Admin → Talleres.
  const { isAdmin, isSuperAdmin } = useAuth();
  const canCreateWorkshop = isAdmin || isSuperAdmin;
  const [showCreate, setShowCreate] = useState(false);

  // Grid vs horizontal carousel (desktop; mobile is always a vertical list),
  // remembered like the articles' view.
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('larabia_workshops_view') || 'grid'; } catch { return 'grid'; }
  });
  const changeViewMode = useCallback((mode) => {
    setViewMode(mode);
    try { localStorage.setItem('larabia_workshops_view', mode); } catch { /* ignore */ }
  }, []);
  const carouselRef = useRef(null);
  const scrollCarousel = useCallback((dir) => {
    const track = carouselRef.current;
    if (!track) return;
    const card = track.querySelector('.workshop-card');
    const amount = card ? card.offsetWidth + 24 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }, []);
  useDragScroll(carouselRef, viewMode === 'carousel');

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchWorkshops();
  }, [fetchWorkshops]);

  // Anyone sees the list; opening a workshop needs sign-in + subscription
  // (or being on the magazine team).
  const { guard, status: accessStatus } = useWorkshopAccess();
  const locked = accessStatus !== 'allowed';
  const openWorkshop = (w) => {
    if (!guard()) return;
    setSelectedWorkshop(w);
    navigateToWorkshopDetail();
  };

  // Filters first; the tabs then split by audience (their counts follow the
  // filters).
  const filtered = applyWorkshopFilters(workshops, filters);
  const filtersActive = countActiveWorkshopFilters(filters) > 0;
  const counts = {
    general: filtered.filter(w => audienceOf(w) === 'general').length,
    infantil: filtered.filter(w => audienceOf(w) === 'infantil').length
  };
  const visible = filtered.filter(w => audienceOf(w) === audience);

  const renderCard = (w) => {
    const cover = resolveImg(w.cover_image_workshop);
    const dateStr = formatDate(w.date_workshop);
    return (
      <article key={w.id_workshop} className="workshop-card" onClick={() => openWorkshop(w)}>
        <div className="workshop-card-image">
          {cover
            ? <img src={cover} alt={w.title_workshop} onError={(e) => { e.target.style.display = 'none'; }} />
            : <div className="workshop-card-image--placeholder"><Users size={32} /></div>}
          {w.is_full && <span className="workshop-badge workshop-badge--full">{t('workshops.full')}</span>}
          {locked && (
            <span className="workshop-badge workshop-badge--locked">
              <Lock size={12} /> {t('workshops.lockedBadge', 'Para suscriptores')}
            </span>
          )}
        </div>
        <div className="workshop-card-body">
          <h3 className="workshop-card-title">{w.title_workshop}</h3>
          {dateStr && <p className="workshop-meta"><Calendar size={15} /> {dateStr}</p>}
          <p className="workshop-meta"><MapPin size={15} /> {w.location_workshop || t('workshops.map.defaultPlace', 'Matiko, Uribarri')}</p>
          {/* Where: small map preview (the workshop's place or the default). */}
          <WorkshopMap lat={w.lat_workshop} lng={w.lng_workshop} compact />
          <p className="workshop-meta">
            <Users size={15} />{' '}
            {w.capacity_workshop != null
              ? t('workshops.spots', { left: w.spots_left, total: w.capacity_workshop })
              : t('workshops.participants', { count: w.reservation_count })}
          </p>
          {/* Who teaches it: photo + name, opens the author's card. */}
          {w.authors?.length > 0 && (
            <div className="workshop-card-authors">
              {w.authors.map(a => (
                <AuthorChip key={a.id_user || a.name_user} author={a.id_user ? a : null} name={a.name_user} tone="dark" />
              ))}
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="workshops-page">
      <div className="workshops-container">
        <header className="workshops-header">
          <div className="workshops-header-content">
            <h1>{t('workshops.title')}</h1>
            <p className="workshops-subtitle">{t('workshops.subtitle')}</p>
          </div>
          {canCreateWorkshop && (
            <button type="button" className="workshops-create-btn" onClick={() => setShowCreate(true)}>
              <Plus size={18} />
              <span>{t('workshops.create', 'Crear taller')}</span>
            </button>
          )}
        </header>
        {showCreate && (
          <CreateWorkshopModal
            onClose={() => setShowCreate(false)}
            onSaved={(w) => setAudience(w?.audience_workshop === 'infantil' ? 'infantil' : 'general')}
          />
        )}

        <>
            {/* Sections (general / children's) + grid/carousel toggle */}
            <div className="workshops-toolbar">
            <div className="workshops-tabs" role="tablist" aria-label={t('workshops.tabsLabel', 'Tipo de taller')}>
              {AUDIENCE_TABS.map(key => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={audience === key}
                  className={`workshops-tab ${audience === key ? 'is-active' : ''}`}
                  onClick={() => setAudience(key)}
                >
                  {key === 'infantil'
                    ? t('workshops.tabKids', 'Talleres infantiles')
                    : t('workshops.tabGeneral', 'Talleres')}
                  <span className="workshops-tab__count">{counts[key]}</span>
                </button>
              ))}
            </div>
            <div className="articles-view-toggle workshops-view-toggle" data-mode={viewMode} role="group" aria-label={t('article.list.viewMode')}>
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

            <WorkshopFilters workshops={workshops} filters={filters} onChange={setFilters} />

            {loading && <div className="workshops-loading"><div className="workshops-spinner" /></div>}

            {!loading && visible.length === 0 && (
              <div className="workshops-empty">
                <p>
                  {filtersActive
                    ? t('workshops.filters.noResults', 'Ningún taller coincide con los filtros.')
                    : filters.when === 'upcoming'
                    ? (audience === 'infantil'
                      ? t('workshops.emptyKidsUpcoming', 'No hay talleres infantiles próximos.')
                      : t('workshops.emptyUpcoming', 'No hay talleres próximos.'))
                    : audience === 'infantil'
                    ? t('workshops.emptyKids', 'Todavía no hay talleres infantiles programados.')
                    : t('workshops.empty')}
                </p>
                {filtersActive && (
                  <button
                    type="button"
                    className="workshop-back-btn"
                    onClick={() => setFilters(prev => ({ ...EMPTY_WORKSHOP_FILTERS, sort: prev.sort }))}
                  >
                    {t('filters.clear', 'Limpiar filtros')}
                  </button>
                )}
              </div>
            )}

            {!loading && visible.length > 0 && (
          viewMode === 'carousel' ? (
            <div className="articles-carousel-wrap workshops-carousel-wrap">
              <button type="button" className="carousel-arrow carousel-arrow--prev" onClick={() => scrollCarousel(-1)} aria-label={t('common.buttons.previous', 'Anterior')}>
                <ChevronLeft size={44} />
              </button>
              <div className="articles-carousel workshops-carousel" ref={carouselRef}>
                {visible.map(renderCard)}
              </div>
              <button type="button" className="carousel-arrow carousel-arrow--next" onClick={() => scrollCarousel(1)} aria-label={t('common.buttons.next', 'Siguiente')}>
                <ChevronRight size={44} />
              </button>
            </div>
          ) : (
          <div className="workshops-grid">
            {visible.map(renderCard)}
          </div>
          )
            )}
          </>
      </div>
    </div>
  );
}

export default WorkshopsList;
