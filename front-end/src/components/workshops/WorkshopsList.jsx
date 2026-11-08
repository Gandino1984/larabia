// magazine-front/src/components/workshops/WorkshopsList.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { localDate } from '../../utils/locale';
import { Calendar, MapPin, Users, Lock, LayoutGrid, GalleryHorizontal, ChevronLeft, ChevronRight, Plus, CalendarDays, Hourglass, HandHelping, History } from 'lucide-react';
import { useUI } from '../../app_context/UIContext';
import { useWorkshop } from '../../app_context/WorkshopContext';
import { useAuth } from '../../app_context/AuthContext';
import { useWorkshopAccess, canManageWorkshop } from '../../app_context/useWorkshopAccess';
import WorkshopOptions from './WorkshopOptions';
import WorkshopAccessTag from './WorkshopAccessTag';
import WorkshopSpotDialog from './WorkshopSpotDialog';
import WorkshopFilters from './WorkshopFilters';
import { Person } from './WorkshopParticipantsPanel';
import { EMPTY_WORKSHOP_FILTERS, applyWorkshopFilters, countActiveWorkshopFilters, isPastWorkshop } from '../../utils/workshopFilters';
import { useDragScroll } from '../../hooks/useDragScroll';
import AuthorChip from '../common/AuthorChip';
import WorkshopMap from '../maps/WorkshopMap';
// Grid / carousel toggle + carousel: the same pieces as the article lists;
// the cards' options bar, the article cards' one.
import '../magazine/ArticleCard.css';
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
    return localDate(d, {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch { return null; }
};

// The two sections of the page.
const AUDIENCE_TABS = ['general', 'infantil'];
const audienceOf = (w) => (w.audience_workshop === 'infantil' ? 'infantil' : 'general');

// A card's colour: finished (greyed out, still legible), full (orange: ask
// for a place) or with places left (green).
const statusOf = (w) => (isPastWorkshop(w) ? 'past' : w.is_full ? 'full' : 'open');

function WorkshopsList() {
  const { t } = useTranslation();
  const { navigateToWorkshopDetail, navigateToWorkshopEditor, navigateToMyWorkshops, showInfo } = useUI();
  const { workshops, loading, fetchWorkshops, setSelectedWorkshop, focusWorkshopId, setFocusWorkshopId } = useWorkshop();
  const [audience, setAudience] = useState('general');
  // Search / month / instructor / spots / order (WorkshopFilters); `when`
  // is the «Ocultar / Mostrar talleres finalizados» button ('all', the
  // default, | 'upcoming').
  const [filters, setFilters] = useState(EMPTY_WORKSHOP_FILTERS);
  const showPast = filters.when !== 'upcoming';
  const togglePast = () => setFilters(prev => ({ ...prev, when: prev.when === 'upcoming' ? 'all' : 'upcoming' }));
  // Admins and super admins create workshops (the workshop editor, also from
  // Admin → Talleres); «Mis talleres» for whoever manages one — its
  // talleristas on the team, like an article's authors.
  const { currentUser, isAdmin, isSuperAdmin, canCreateContent } = useAuth();
  const canCreateWorkshop = isAdmin || isSuperAdmin;
  // The full workshop someone is asking a place in (WorkshopSpotDialog).
  const [spotFor, setSpotFor] = useState(null);
  const managesAny = canCreateWorkshop
    || workshops.some((w) => canManageWorkshop(w, currentUser, { isSuperAdmin, canCreateContent }));

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

  // A shared link opened signed out (App.jsx): once the list is in, its card
  // — in its tab; finished ones are shown by default — scrolled into view and
  // ringed, with a note to sign in (here, not in App: on a phone the
  // loading screen still covered the page and hid it).
  const [sharedId, setSharedId] = useState(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    fetchWorkshops().then((res) => {
      if (focusWorkshopId == null) return;
      setFocusWorkshopId(null);
      const w = (res?.data || []).find((x) => x.id_workshop === focusWorkshopId);
      if (!w) return;
      setAudience(audienceOf(w));
      setSharedId(w.id_workshop);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchWorkshops]);
  useEffect(() => {
    if (sharedId == null) return;
    const timer = setTimeout(() => {
      document.querySelector(`.workshop-card[data-workshop-id="${sharedId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      showInfo(t('workshops.sharedSignIn', 'Te han compartido este taller. Inicia sesión para abrirlo y reservar plaza.'));
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedId]);

  // Anyone sees the list; opening a workshop needs a signed-in account
  // (booking it, a subscription — see WorkshopDetail).
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
  // The finished ones of this tab (with the other filters): the button says
  // how many there are.
  const pastCount = applyWorkshopFilters(workshops, { ...filters, when: 'all' })
    .filter(w => audienceOf(w) === audience && isPastWorkshop(w)).length;

  const renderCard = (w) => {
    const cover = resolveImg(w.cover_image_workshop);
    const dateStr = formatDate(w.date_workshop);
    const status = statusOf(w);
    const past = status === 'past';
    // Who asked for an extra place: only its creator and the super admins get
    // the list (the server sends it to nobody else); the rest, how many.
    const requesters = !past ? (w.spot_requests || []) : [];
    return (
      <article
        key={w.id_workshop}
        data-workshop-id={w.id_workshop}
        data-status={status}
        className={`workshop-card workshop-card--${status} ${sharedId === w.id_workshop ? 'is-shared' : ''}`}
        onClick={() => openWorkshop(w)}
      >
        {/* --cover: the blurred copy that fills the frame around the poster. */}
        <div className="workshop-card-image" style={cover ? { '--cover': `url("${cover}")` } : undefined}>
          {cover
            ? <img src={cover} alt={w.title_workshop} onError={(e) => { e.target.style.display = 'none'; }} />
            : <div className="workshop-card-image--placeholder"><Users size={32} /></div>}
          <span className={`workshop-badge workshop-badge--${status}`}>
            {past ? t('workshops.status.past', 'Finalizado')
              : status === 'full' ? t('workshops.full')
              : t('workshops.status.open', 'Plazas libres')}
          </span>
          {locked && (
            <span className="workshop-badge workshop-badge--locked">
              <Lock size={12} /> {t('workshops.lockedBadgeLogin', 'Inicia sesión para entrar')}
            </span>
          )}
        </div>
        <div className="workshop-card-body">
          <WorkshopAccessTag workshop={w} />
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
          {/* Requests for an extra place waiting for an answer: who (its
              creator, super admins — answered on its page or in the bell),
              or how many. */}
          {requesters.length > 0 ? (
            <div className="workshop-card-requesters">
              <p className="workshop-meta workshop-meta--requests">
                <Hourglass size={15} /> {t('workshops.extra.count', { count: requesters.length })}
              </p>
              <ul>
                {requesters.map(r => <li key={r.id_user}><Person person={r} /></li>)}
              </ul>
              <p className="workshop-card-requesters__hint">{t('workshops.extra.cardAnswerHint', 'Respóndelas desde la página del taller o la campana.')}</p>
            </div>
          ) : !past && w.spot_request_count > 0 && (
            <p className="workshop-meta workshop-meta--requests">
              <Hourglass size={15} /> {t('workshops.extra.count', { count: w.spot_request_count })}
            </p>
          )}
          {/* Who teaches it: photo + name, opens the author's card. */}
          {w.authors?.length > 0 && (
            <div className="workshop-card-authors">
              {w.authors.map(a => (
                <AuthorChip key={a.id_user || a.name_user} author={a.id_user ? a : null} name={a.name_user} tone="dark" />
              ))}
            </div>
          )}
        </div>
        {/* ⋯ options: share (everyone), edit / delete (its managers). */}
        <div className="article-engagement-bar workshop-card-bar">
          <WorkshopOptions workshop={w} />
          {/* Full and not finished: ask for an extra place (socios/as;
              anyone signed in if it's free). */}
          {past ? null : w.my_spot_request?.status === 'pending' ? (
            <span className="workshop-card-request workshop-card-request--sent">
              <Hourglass size={15} /> {t('workshops.extra.cardPending', 'Plaza solicitada')}
            </span>
          ) : w.can_request_spot ? (
            <button
              type="button"
              className="workshop-card-request"
              onClick={(e) => { e.stopPropagation(); setSpotFor(w); }}
            >
              <HandHelping size={16} /> {t('workshops.extra.cardAsk', 'Solicitar plaza')}
            </button>
          ) : null}
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
          {managesAny && (
            <div className="workshops-header-actions">
              <button type="button" className="workshops-create-btn workshops-create-btn--ghost" onClick={() => navigateToMyWorkshops('talleres')}>
                <CalendarDays size={18} />
                <span>{t('workshops.editor.mine.button', 'Mis talleres')}</span>
              </button>
              {canCreateWorkshop && (
                <button type="button" className="workshops-create-btn" onClick={() => navigateToWorkshopEditor(null, 'talleres')}>
                  <Plus size={18} />
                  <span>{t('workshops.create', 'Crear taller')}</span>
                </button>
              )}
            </div>
          )}
        </header>

        <>
            {spotFor && <WorkshopSpotDialog workshop={spotFor} onClose={() => setSpotFor(null)} />}

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

            {/* The finished workshops, greyed out after the upcoming ones:
                shown by default, the button hides them (only when this tab
                has some). Dark while they're hidden — not the default. */}
            {pastCount > 0 && (
            <div className="workshops-past-toggle-row">
              <button
                type="button"
                className={`workshops-past-toggle ${showPast ? '' : 'is-on'}`}
                onClick={togglePast}
              >
                <History size={16} />
                <span>
                  {showPast
                    ? t('workshops.past.hide', 'Ocultar talleres finalizados')
                    : t('workshops.past.show', { count: pastCount, defaultValue: 'Mostrar talleres finalizados ({{count}})' })}
                </span>
              </button>
            </div>
            )}

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
                    onClick={() => setFilters(prev => ({ ...EMPTY_WORKSHOP_FILTERS, sort: prev.sort, when: prev.when }))}
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
