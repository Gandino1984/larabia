// magazine-front/src/components/magazine/SectionPreviews.jsx
//
// "Section previews": a full-width area shown on the home page between the hero
// and the footer. Each entry mirrors one header-bar button and shows a
// horizontal slideshow of the works that belong to it.
//
// Items can come from projects, articles and workshops. A section either matches
// a single tag/type or combines several (e.g. "Barrio").
//
// Extensible: add more entries to PREVIEW_SECTIONS as we build out the buttons.
import { useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMagazine } from '../../app_context/MagazineContext';
import { useWorkshop } from '../../app_context/WorkshopContext';
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

// Article categories that make up the "Barrio" section (neighbourhood content:
// micro-perfiles, espacio abierto, talleres, infantil).
const BARRIO_CATEGORIES = ['micro-perfiles', 'terrenito en pluton', 'micro abierto', 'talleres', 'infantil'];

// Each section declares which projects/articles belong to it, and whether it
// also pulls in workshops.
const PREVIEW_SECTIONS = [
  {
    id: 'barrio',
    titleKey: 'sectionPreviews.barrio',
    matchProject: () => false,
    matchArticle: (a) => BARRIO_CATEGORIES.includes(norm(a.category_article)),
    includeWorkshops: true,
  },
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
  const { workshops, fetchWorkshops, setSelectedWorkshop } = useWorkshop();
  const { navigateToArticle, navigateToProjectDetail, navigateToWorkshopDetail } = useUI();

  // Projects and workshops aren't loaded by default on the home page; fetch once.
  useEffect(() => {
    fetchProjects();
    fetchWorkshops();
  }, [fetchProjects, fetchWorkshops]);

  const handleItemClick = useCallback(async (item) => {
    if (item.kind === 'project') {
      setSelectedProject(item.raw);
      navigateToProjectDetail();
      return;
    }
    if (item.kind === 'workshop') {
      setSelectedWorkshop(item.raw);
      navigateToWorkshopDetail();
      return;
    }
    // Article: mirror the hero/card open path so the detail has full data.
    setSelectedArticle(item.raw);
    if (item.raw?.id_article && fetchArticleById) {
      await fetchArticleById(item.raw.id_article);
    }
    navigateToArticle();
  }, [setSelectedProject, navigateToProjectDetail, setSelectedWorkshop, navigateToWorkshopDetail, setSelectedArticle, fetchArticleById, navigateToArticle]);

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

      const workshopItems = sec.includeWorkshops
        ? (workshops || []).map((w) => ({
            key: `workshop-${w.id_workshop}`,
            kind: 'workshop',
            title: w.title_workshop,
            description: w.description_workshop,
            image: resolveImage(w.cover_image_workshop),
            raw: w,
          }))
        : [];

      return { id: sec.id, title: t(sec.titleKey), items: [...projectItems, ...articleItems, ...workshopItems] };
    });
  }, [projects, allArticles, workshops, t]);

  const visibleSections = sections.filter((s) => s.items.length > 0);
  if (visibleSections.length === 0) return null;

  return (
    <div className="section-previews">
      {visibleSections.map((sec, index) => (
        <SectionPreviewRow
          key={sec.id}
          title={sec.title}
          items={sec.items}
          onItemClick={handleItemClick}
          /* A single sideways-swipe hint for the whole page, on the first visible
             carousel (Barrio when it has content). */
          enableSwipeHint={index === 0}
        />
      ))}
    </div>
  );
}

export default SectionPreviews;
