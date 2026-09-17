// magazine-front/src/components/workshops/WorkshopsList.jsx
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';
import { useUI } from '../../app_context/UIContext';
import { useWorkshop } from '../../app_context/WorkshopContext';
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

function WorkshopsList() {
  const { t } = useTranslation();
  const { navigateToHome, navigateToWorkshopDetail } = useUI();
  const { workshops, loading, fetchWorkshops, setSelectedWorkshop } = useWorkshop();

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchWorkshops();
  }, [fetchWorkshops]);

  const openWorkshop = (w) => {
    setSelectedWorkshop(w);
    navigateToWorkshopDetail();
  };

  return (
    <div className="workshops-page">
      <div className="workshops-container">
        <header className="workshops-header">
          <button onClick={navigateToHome} className="btn-back-nav" title={t('common.buttons.back')}>
            <ArrowLeft size={24} />
          </button>
          <div className="workshops-header-content">
            <h1>{t('workshops.title')}</h1>
            <p className="workshops-subtitle">{t('workshops.subtitle')}</p>
          </div>
        </header>

        {loading && <div className="workshops-loading"><div className="workshops-spinner" /></div>}

        {!loading && workshops.length === 0 && (
          <div className="workshops-empty"><p>{t('workshops.empty')}</p></div>
        )}

        {!loading && workshops.length > 0 && (
          <div className="workshops-grid">
            {workshops.map(w => {
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
      </div>
    </div>
  );
}

export default WorkshopsList;
