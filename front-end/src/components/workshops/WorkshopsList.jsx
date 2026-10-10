// magazine-front/src/components/workshops/WorkshopsList.jsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, MapPin, Users, Lock } from 'lucide-react';
import { useUI } from '../../app_context/UIContext';
import { useWorkshop } from '../../app_context/WorkshopContext';
import { useWorkshopAccess } from '../../app_context/useWorkshopAccess';
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
  const { workshops, loading, fetchWorkshops, setSelectedWorkshop, accessError } = useWorkshop();
  const { status: accessStatus, guard } = useWorkshopAccess();
  const [audience, setAudience] = useState('general');

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchWorkshops();
  }, [fetchWorkshops]);

  const openWorkshop = (w) => {
    setSelectedWorkshop(w);
    navigateToWorkshopDetail();
  };

  // No access (the server has the last word; the client check covers the
  // moment before it answers): explain and offer to sign in / subscribe.
  const blocked = accessError || (accessStatus !== 'allowed' ? (accessStatus === 'login' ? 'login_required' : 'subscription_required') : null);

  const counts = {
    general: workshops.filter(w => audienceOf(w) === 'general').length,
    infantil: workshops.filter(w => audienceOf(w) === 'infantil').length
  };
  const visible = workshops.filter(w => audienceOf(w) === audience);

  return (
    <div className="workshops-page">
      <div className="workshops-container">
        <header className="workshops-header">
          <div className="workshops-header-content">
            <h1>{t('workshops.title')}</h1>
            <p className="workshops-subtitle">{t('workshops.subtitle')}</p>
          </div>
        </header>

        {blocked ? (
          <div className="workshops-gate">
            <Lock size={32} />
            <h2>{t('workshops.gate.title', 'Talleres para personas suscriptoras')}</h2>
            <p>
              {blocked === 'login_required'
                ? t('workshops.gate.loginText', 'Inicia sesión con tu cuenta de suscriptor/a para ver el calendario de talleres y reservar tu plaza.')
                : t('workshops.gate.subscribeText', 'Los talleres de La Rabia son exclusivos para quienes apoyan la revista con su suscripción. Suscríbete para ver el calendario y reservar plaza en los talleres y en los talleres infantiles.')}
            </p>
            <button
              type="button"
              className="workshops-gate__cta"
              onClick={() => guard(blocked === 'login_required' ? 'login' : 'subscribe')}
            >
              {blocked === 'login_required'
                ? t('workshops.gate.loginCta', 'Iniciar sesión')
                : t('workshops.gate.subscribeCta', 'Suscríbete')}
            </button>
          </div>
        ) : (
          <>
            {/* Sections: general workshops / children's workshops */}
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

            {loading && <div className="workshops-loading"><div className="workshops-spinner" /></div>}

            {!loading && visible.length === 0 && (
              <div className="workshops-empty">
                <p>
                  {audience === 'infantil'
                    ? t('workshops.emptyKids', 'Todavía no hay talleres infantiles programados.')
                    : t('workshops.empty')}
                </p>
              </div>
            )}

            {!loading && visible.length > 0 && (
          <div className="workshops-grid">
            {visible.map(w => {
              const cover = resolveImg(w.cover_image_workshop);
              const dateStr = formatDate(w.date_workshop);
              return (
                <article key={w.id_workshop} className="workshop-card" onClick={() => openWorkshop(w)}>
                  <div className="workshop-card-image">
                    {cover
                      ? <img src={cover} alt={w.title_workshop} onError={(e) => { e.target.style.display = 'none'; }} />
                      : <div className="workshop-card-image--placeholder"><Users size={32} /></div>}
                    {w.is_full && <span className="workshop-badge workshop-badge--full">{t('workshops.full')}</span>}
                  </div>
                  <div className="workshop-card-body">
                    <h3 className="workshop-card-title">{w.title_workshop}</h3>
                    {dateStr && <p className="workshop-meta"><Calendar size={15} /> {dateStr}</p>}
                    {w.location_workshop && <p className="workshop-meta"><MapPin size={15} /> {w.location_workshop}</p>}
                    <p className="workshop-meta">
                      <Users size={15} />{' '}
                      {w.capacity_workshop != null
                        ? t('workshops.spots', { left: w.spots_left, total: w.capacity_workshop })
                        : t('workshops.participants', { count: w.reservation_count })}
                    </p>
                    {w.authors?.length > 0 && (
                      <p className="workshop-card-authors">{t('workshops.by')} {w.authors.map(a => a.name_user).join(', ')}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default WorkshopsList;
