// magazine-front/src/app_context/useSectionCatalog.js
//
// The magazine's sections (utils/sections.js) from the live nav config, in
// the reader's language.
import { useMemo } from 'react';
import { useNav } from './NavContext';
import { useUI } from './UIContext';
import { sectionCatalog } from '../utils/sections';

export function useSectionCatalog() {
  const { navConfig } = useNav();
  const { currentLanguage } = useUI();
  return useMemo(() => sectionCatalog(navConfig, currentLanguage), [navConfig, currentLanguage]);
}
