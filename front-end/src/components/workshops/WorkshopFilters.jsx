// magazine-front/src/components/workshops/WorkshopFilters.jsx
//
// Filter bar for the workshops page: Buscar · Cuándo · Mes · Tallerista ·
// Plazas · Ordenar + "Limpiar filtros". Same look as the article filters
// (ArticleFilters.css); folds behind "Filtros" on small screens. Logic:
// utils/workshopFilters.js.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import {
  EMPTY_WORKSHOP_FILTERS,
  buildWorkshopFilterOptions,
  countActiveWorkshopFilters
} from '../../utils/workshopFilters';
import '../common/ArticleFilters.css';
import './WorkshopFilters.css';

function WorkshopFilters({ workshops, filters, onChange }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const options = useMemo(() => buildWorkshopFilterOptions(workshops, filters), [workshops, filters]);
  const active = countActiveWorkshopFilters(filters);
  const set = (key, value) => onChange({ ...filters, [key]: value });

  const monthLabel = (key) => {
    const [y, m] = key.split('-').map(Number);
    const name = new Date(y, m - 1, 1).toLocaleDateString(i18n.language || 'es', { month: 'long', year: 'numeric' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className={`article-filters article-filters--light workshop-filters ${open ? 'is-open' : ''}`}>
      <button type="button" className="article-filters__toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <SlidersHorizontal size={16} />
        <span>{t('filters.toggle', 'Filtros')}</span>
        {active > 0 && <span className="article-filters__badge">{active}</span>}
      </button>

      <div className="article-filters__bar">
        <label className="article-filters__field workshop-filters__search">
          <span>{t('workshops.filters.search', 'Buscar')}</span>
          <span className="workshop-filters__search-box">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={filters.q}
              onChange={(e) => set('q', e.target.value)}
              placeholder={t('workshops.filters.searchPlaceholder', 'Título, lugar, tallerista…')}
            />
          </span>
        </label>

        <label className="article-filters__field">
          <span>{t('workshops.filters.when', 'Cuándo')}</span>
          <select value={filters.when} onChange={(e) => set('when', e.target.value)}>
            <option value="upcoming">{t('workshops.filters.upcoming', 'Próximos')}</option>
            <option value="past">{t('workshops.filters.past', 'Pasados')}</option>
            <option value="all">{t('workshops.filters.all', 'Todos')}</option>
          </select>
        </label>

        <label className="article-filters__field">
          <span>{t('filters.month', 'Mes')}</span>
          <select value={filters.month} onChange={(e) => set('month', e.target.value)}>
            <option value="">{t('filters.allM', 'Todos')}</option>
            {options.months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </label>

        <label className="article-filters__field">
          <span>{t('workshops.filters.instructor', 'Tallerista')}</span>
          <select value={filters.author} onChange={(e) => set('author', e.target.value)}>
            <option value="">{t('filters.allAuthors', 'Todas/os')}</option>
            {options.authors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>

        <label className="article-filters__field">
          <span>{t('workshops.filters.spots', 'Plazas')}</span>
          <select value={filters.availability} onChange={(e) => set('availability', e.target.value)}>
            <option value="">{t('workshops.filters.anySpots', 'Todas')}</option>
            <option value="free">{t('workshops.filters.freeSpots', 'Con plazas libres')}</option>
          </select>
        </label>

        <label className="article-filters__field">
          <span>{t('filters.sort.label', 'Ordenar')}</span>
          <select value={filters.sort} onChange={(e) => set('sort', e.target.value)}>
            <option value="date">{t('workshops.filters.sortDate', 'Por fecha')}</option>
            <option value="recent">{t('workshops.filters.sortRecent', 'Recién añadidos')}</option>
            <option value="title">{t('filters.sort.title', 'Título A–Z')}</option>
          </select>
        </label>

        {active > 0 && (
          <button
            type="button"
            className="article-filters__clear"
            onClick={() => onChange({ ...EMPTY_WORKSHOP_FILTERS, sort: filters.sort })}
          >
            <X size={15} />
            <span>{t('filters.clear', 'Limpiar filtros')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default WorkshopFilters;
