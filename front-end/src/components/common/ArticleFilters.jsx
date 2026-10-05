// magazine-front/src/components/common/ArticleFilters.jsx
//
// Filter bar for article lists (Artículos section + "Mis publicaciones"):
// Categoría · Proyecto · Autor/a · Año · Mes · Ordenar, plus "Limpiar
// filtros". The options come from the given articles. On small screens the
// bar folds behind a "Filtros" button. Logic: utils/articleFilters.js.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X } from 'lucide-react';
import {
  EMPTY_ARTICLE_FILTERS,
  NO_PROJECT,
  buildFilterOptions,
  categoryLabelKey,
  countActiveFilters
} from '../../utils/articleFilters';
import './ArticleFilters.css';

function ArticleFilters({ articles, filters, onChange, defaultSort = 'newest', tone = 'dark' }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const options = useMemo(() => buildFilterOptions(articles, filters), [articles, filters]);
  const active = countActiveFilters(filters);

  // Changing the year resets the month (months depend on the year).
  const set = (key, value) => onChange({ ...filters, [key]: value, ...(key === 'year' ? { month: '' } : {}) });

  const categoryLabel = (value) => {
    const key = categoryLabelKey(value);
    return key ? t(key) : value.charAt(0).toUpperCase() + value.slice(1);
  };
  const monthLabel = (m) => {
    const name = new Date(2000, Number(m) - 1, 1).toLocaleDateString(i18n.language || 'es', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const SORTS = [
    ['newest', t('filters.sort.newest', 'Más recientes')],
    ['oldest', t('filters.sort.oldest', 'Más antiguos')],
    ['views', t('filters.sort.views', 'Más vistos')],
    ['title', t('filters.sort.title', 'Título A–Z')]
  ];

  return (
    <div className={`article-filters article-filters--${tone} ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="article-filters__toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <SlidersHorizontal size={16} />
        <span>{t('filters.toggle', 'Filtros')}</span>
        {active > 0 && <span className="article-filters__badge">{active}</span>}
      </button>

      <div className="article-filters__bar">
        <label className="article-filters__field">
          <span>{t('filters.category', 'Categoría')}</span>
          <select value={filters.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">{t('filters.allF', 'Todas')}</option>
            {options.categories.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
          </select>
        </label>

        <label className="article-filters__field">
          <span>{t('filters.project', 'Proyecto')}</span>
          <select value={filters.project} onChange={(e) => set('project', e.target.value)}>
            <option value="">{t('filters.allM', 'Todos')}</option>
            {options.projects.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
            {(options.withoutProject || filters.project === NO_PROJECT) && (
              <option value={NO_PROJECT}>{t('filters.noProject', 'Sin proyecto')}</option>
            )}
          </select>
        </label>

        <label className="article-filters__field">
          <span>{t('filters.author', 'Autor/a')}</span>
          <select value={filters.author} onChange={(e) => set('author', e.target.value)}>
            <option value="">{t('filters.allAuthors', 'Todas/os')}</option>
            {options.authors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>

        <label className="article-filters__field article-filters__field--short">
          <span>{t('filters.year', 'Año')}</span>
          <select value={filters.year} onChange={(e) => set('year', e.target.value)}>
            <option value="">{t('filters.allM', 'Todos')}</option>
            {options.years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>

        <label className="article-filters__field article-filters__field--short">
          <span>{t('filters.month', 'Mes')}</span>
          <select
            value={filters.month}
            onChange={(e) => set('month', e.target.value)}
            disabled={!filters.year}
            title={!filters.year ? t('filters.pickYearFirst', 'Elige primero un año') : undefined}
          >
            <option value="">{t('filters.allM', 'Todos')}</option>
            {options.months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </label>

        <label className="article-filters__field">
          <span>{t('filters.sort.label', 'Ordenar')}</span>
          <select value={filters.sort || defaultSort} onChange={(e) => set('sort', e.target.value)}>
            {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        {active > 0 && (
          <button
            type="button"
            className="article-filters__clear"
            onClick={() => onChange({ ...EMPTY_ARTICLE_FILTERS, sort: filters.sort })}
          >
            <X size={15} />
            <span>{t('filters.clear', 'Limpiar filtros')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default ArticleFilters;
