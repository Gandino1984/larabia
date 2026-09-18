// magazine-front/src/components/magazine/SectionPreviews.jsx
//
// "Section previews": a full-width area shown on the home page between the hero
// and the footer. Each entry mirrors one header-bar button and shows a
// horizontal slideshow of the works that belong to it (projects + articles).
//
// Extensible: add more entries to PREVIEW_SECTIONS as we build out the other
// buttons. For now only "No-ficción" is defined.
import { useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMagazine } from '../../app_context/MagazineContext';
import { useUI } from '../../app_context/UIContext';
import SectionPreviewRow from './SectionPreviewRow';
import './SectionPreviews.css';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
const FALLBACK_IMAGE = '/logoFondoNegro.jpg';

// Lowercase + strip accents so "No-ficción" / "no-ficcion" / "Periodístico"
// all match regardless of how they were typed.
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const resolveImage = (path) => {
  if (!path) return FALLBACK_IMAGE;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${apiUrl}${path.startsWith('/') ? path : '/' + path}`;
};

// Each section declares which projects and which articles belong to it.
const PREVIEW_SECTIONS = [
  {
    id: 'no-ficcion',
    titleKey: 'editor.category.noficcion',
    matchProject: (p) => ['no-ficcion', 'periodistico'].includes(norm(p.type_project)),
    matchArticle: (a) => norm(a.category_article) === 'no-ficcion',
  },
  {
    id: 'ficcion',
    titleKey: 'editor.category.ficcion',
    matchProject: (p) => norm(p.type_project) === 'ficcion',
    matchArticle: (a) => norm(a.category_article) === 'ficcion',
  },
];

function SectionPreviews() {
  const { t } = useTranslation();
  const { projects, allArticles, fetchProjects, setSelectedArticle, fetchArticleById, setSelectedProject } = useMagazine();
  const { navigateToArticle, navigateToProjectDetail } = useUI();

  // Projects aren't loaded by default on the home page; fetch them once.
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleItemClick = useCallback(async (item) => {
    if (item.kind === 'project') {
      setSelectedProject(item.raw);
      navigateToProjectDetail();
      return;
    }
    // Article: mirror the hero/card open path so the detail has full data.
    setSelectedArticle(item.raw);
    if (item.raw?.id_article && fetchArticleById) {
      await fetchArticleById(item.raw.id_article);
    }
    navigateToArticle();
  }, [setSelectedProject, navigateToProjectDetail, setSelectedArticle, fetchArticleById, navigateToArticle]);

  const sections = useMemo(() => {
    return PREVIEW_SECTIONS.map((sec) => {
      const projectItems = (projects || [])
        .filter(sec.matchProject)
        .map((p) => ({
          key: `project-${p.id_project}`,
          kind: 'project',
          title: p.title_project,
          description: p.description_project,
          image: resolveImage(p.cover_image_project),
          raw: p,
        }));

      const articleItems = (allArticles || [])
        .filter(sec.matchArticle)
        .map((a) => ({
          key: `article-${a.id_article}`,
          kind: 'article',
          title: a.title_article,
          description: a.excerpt_article,
          image: resolveImage(a.cover_image_article),
          raw: a,
        }));

      return { id: sec.id, title: t(sec.titleKey), items: [...projectItems, ...articleItems] };
    });
  }, [projects, allArticles, t]);

  const visibleSections = sections.filter((s) => s.items.length > 0);
  if (visibleSections.length === 0) return null;

  return (
    <div className="section-previews">
      {visibleSections.map((sec) => (
        <SectionPreviewRow
          key={sec.id}
          title={sec.title}
          items={sec.items}
          onItemClick={handleItemClick}
        />
      ))}
    </div>
  );
}

export default SectionPreviews;
