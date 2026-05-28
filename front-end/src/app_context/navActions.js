// magazine-front/src/app_context/navActions.js
//
// Runtime resolver for a nav item's action. Maps the stored {type,value} to the
// existing UIContext navigators / MagazineContext setters, so the configurable
// top bar reuses the exact same navigation the hardcoded bar used.

import { useCallback } from 'react';
import { useUI } from './UIContext';
import { useMagazine } from './MagazineContext';

const SECTION_NAV = {
  home: 'navigateToHome',
  articles: 'navigateToArticlesList',
  authors: 'navigateToAuthors',
  openmic: 'navigateToOpenMic',
  humor: 'navigateToHumor',
  projects: 'navigateToProjectDetail'
};

export function useNavActions() {
  const ui = useUI();
  const { allArticles, projects, setSelectedArticle, setSelectedProject, setFilters } = useMagazine();

  return useCallback((action) => {
    if (!action || typeof action !== 'object') return;
    const { type, value } = action;

    switch (type) {
      case 'section': {
        const fnName = SECTION_NAV[value] || 'navigateToHome';
        ui[fnName]?.();
        break;
      }
      case 'modal':
        if (value === 'contact') ui.openContactModal?.();
        else if (value === 'newsletter') ui.openNewsletterModal?.();
        break;
      case 'category':
        // Open the article list pre-filtered to a category (e.g. "internacional").
        setFilters?.({ category: value, searchTerm: '' });
        ui.navigateToArticlesList?.();
        break;
      case 'article': {
        const a = (allArticles || []).find((x) => String(x.id_article) === String(value));
        if (a) { setSelectedArticle?.(a); ui.navigateToArticleDetail?.(a); }
        break;
      }
      case 'project': {
        const p = (projects || []).find((x) => String(x.id_project) === String(value));
        if (p) { setSelectedProject?.(p); ui.navigateToProjectDetail?.(); }
        break;
      }
      case 'author':
        // Author deep-link → that author's publications (id-based navigator).
        ui.navigateToAuthorPublications?.(value);
        break;
      case 'url':
        if (/^https?:\/\//i.test(value)) {
          window.open(value, '_blank', 'noopener,noreferrer');
        } else if (value?.startsWith('/')) {
          window.location.assign(value);
        }
        break;
      default:
        break;
    }
  }, [ui, allArticles, projects, setSelectedArticle, setSelectedProject, setFilters]);
}
