// magazine-front/src/components/magazine/ProjectsList.jsx
//
// The projects page — the top bar's «Proyectos» opens it, like «Artículos»
// and «Talleres» (it used to open a dropdown of projects). Every published
// project, newest first, with a search bar (title, description, authors —
// no case or accents). Each card opens its project (ProjectCard).
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { useMagazine } from '../../app_context/MagazineContext';
import { projectTitle, projectDescription } from '../../utils/contentLang';
import ProjectCard from './ProjectCard';
import './ProjectsList.css';

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const when = (p) => new Date(p.date_published || p.created_at || 0).getTime();

function ProjectsList() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { projects, fetchProjects } = useMagazine();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchProjects().finally(() => setLoading(false));
  }, [fetchProjects]);

  const published = useMemo(
    () => (projects || [])
      .filter((p) => p.status_project === 'published')
      .sort((a, b) => (when(b) - when(a)) || ((b.id_project || 0) - (a.id_project || 0))),
    [projects]
  );

  const shown = useMemo(() => {
    const q = fold(query).trim();
    if (!q) return published;
    return published.filter((p) => (
      fold(projectTitle(p, lang)).includes(q)
      || fold(p.title_project).includes(q)
      || fold(projectDescription(p, lang)).includes(q)
      || (p.authors || []).some((a) => fold(a.name_user).includes(q))
      || fold(p.author_name).includes(q)
    ));
  }, [published, query, lang]);

  return (
    <div className="projects-page">
      <header className="projects-page__header">
        <h1>{t('projects.list.title', 'Proyectos')}</h1>
        <p className="projects-page__subtitle">
          {t('projects.list.subtitle', 'Series, cómics, fanzines, libros… publicaciones que van juntas.')}
        </p>
        {published.length > 0 && (
          <div className="projects-page__search" role="search">
            <Search size={20} className="projects-page__search-icon" aria-hidden="true" />
            <input
              type="search"
              className="projects-page__search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('projects.list.searchPlaceholder', 'Busca por título o autora/or…')}
              aria-label={t('projects.list.searchLabel', 'Buscar proyectos')}
              autoComplete="off"
              enterKeyHint="search"
            />
            {query && (
              <button
                type="button"
                className="projects-page__search-clear"
                onClick={() => setQuery('')}
                aria-label={t('authors.search.clear', 'Borrar la búsqueda')}
                title={t('authors.search.clear', 'Borrar la búsqueda')}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {query.trim() && shown.length > 0 && (
          <p className="projects-page__count" aria-live="polite">
            {t('projects.list.results', { count: shown.length })}
          </p>
        )}
      </header>

      {loading && published.length === 0 ? (
        <p className="projects-page__empty">{t('common.states.loading', 'Cargando…')}</p>
      ) : published.length === 0 ? (
        <p className="projects-page__empty">{t('header.nav.noProjects', 'Sin proyectos publicados')}</p>
      ) : shown.length === 0 ? (
        <p className="projects-page__empty" role="status">
          {t('projects.list.noResults', { query: query.trim(), defaultValue: 'Ningún proyecto coincide con «{{query}}».' })}
        </p>
      ) : (
        <div className="projects-page__grid">
          {shown.map((project) => <ProjectCard key={project.id_project} project={project} />)}
        </div>
      )}
    </div>
  );
}

export default ProjectsList;
