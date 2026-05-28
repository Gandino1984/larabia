// magazine-front/src/app_context/navConfig.js
//
// Built-in default top-bar navigation + metadata for the nav builder.
//
// DEFAULT_NAV mirrors today's bar exactly, so when the DB nav_config is null
// (un-customized) the header looks unchanged. The dynamic "Proyectos" dropdown
// is NOT part of this config — it's rendered as a fixed special element in the
// header — and search / language / Admin / logout stay fixed system controls.

export const DEFAULT_NAV = [
  { id: 'articles', kind: 'link', visible: true, min_role: 'all',
    label: { es: 'Artículos', en: 'Articles' },
    action: { type: 'section', value: 'articles' } },
  // Special non-deletable item: renders the dynamic "all projects" dropdown.
  // Reorderable + hideable + relabelable, but its behavior is fixed.
  { id: 'projects', kind: 'projects', visible: true, min_role: 'all',
    label: { es: 'Proyectos', en: 'Projects' } },
  { id: 'authors', kind: 'link', visible: true, min_role: 'all',
    label: { es: 'Autoras', en: 'Authors' },
    action: { type: 'section', value: 'authors' } },
  { id: 'more', kind: 'group', visible: true, min_role: 'all',
    label: { es: 'Más', en: 'More' },
    children: [
      { id: 'contact', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'Contacto', en: 'Contact' }, action: { type: 'modal', value: 'contact' } },
      { id: 'newsletter', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'Newsletter', en: 'Newsletter' }, action: { type: 'modal', value: 'newsletter' } },
      { id: 'editorial', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'Editorial', en: 'Editorial' }, action: { type: 'category', value: 'editorial' } },
      { id: 'internacional', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'Internacional', en: 'International' }, action: { type: 'category', value: 'internacional' } },
      { id: 'humor', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'Humor', en: 'Humor' }, action: { type: 'section', value: 'humor' } },
      { id: 'microabierto', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'Micro abierto', en: 'Open mic' }, action: { type: 'section', value: 'openmic' } },
      { id: 'galeria', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'Galería', en: 'Gallery' }, action: { type: 'category', value: 'galeria' } }
    ] }
];

// Builder metadata (Spanish UI labels for the admin).
export const ACTION_TYPE_OPTIONS = [
  { value: 'section', label: 'Sección del sitio' },
  { value: 'category', label: 'Categoría de artículos' },
  { value: 'modal', label: 'Ventana (contacto/newsletter)' },
  { value: 'article', label: 'Artículo concreto' },
  { value: 'project', label: 'Proyecto concreto' },
  { value: 'author', label: 'Autora concreta' },
  { value: 'url', label: 'Enlace externo' }
];

export const SECTION_OPTIONS = [
  { value: 'home', label: 'Inicio' },
  { value: 'articles', label: 'Artículos' },
  { value: 'authors', label: 'Autoras' },
  { value: 'humor', label: 'Humor' },
  { value: 'openmic', label: 'Micro abierto' }
];

export const MODAL_OPTIONS = [
  { value: 'contact', label: 'Contacto' },
  { value: 'newsletter', label: 'Newsletter' }
];

export const ROLE_OPTIONS = [
  { value: 'all', label: 'Todo el mundo' },
  { value: 'editor', label: 'Editores y superiores' },
  { value: 'super_admin', label: 'Solo super-admin' }
];

/** Pick the label for the current language, falling back to Spanish then English. */
export function navLabel(item, lang) {
  if (!item?.label) return '';
  return item.label[lang] || item.label.es || item.label.en || '';
}

/** Can a user with the given role flags see an item with this min_role? */
export function canSeeNavItem(item, { isEditor, isAdmin, isSuperAdmin } = {}) {
  switch (item?.min_role) {
    case 'super_admin': return !!isSuperAdmin;
    case 'editor': return !!(isEditor || isAdmin || isSuperAdmin);
    case 'all':
    default: return true;
  }
}
