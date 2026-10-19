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
    label: { es: 'Artículos', en: 'Articles', eu: 'Artikuluak' },
    action: { type: 'section', value: 'articles' } },
  // Special non-deletable item: renders the dynamic "all projects" dropdown.
  // Reorderable + hideable + relabelable, but its behavior is fixed.
  { id: 'projects', kind: 'projects', visible: true, min_role: 'all',
    label: { es: 'Proyectos', en: 'Projects', eu: 'Proiektuak' } },
  { id: 'talleres', kind: 'link', visible: true, min_role: 'all',
    label: { es: 'Talleres', en: 'Workshops', eu: 'Tailerrak' },
    action: { type: 'section', value: 'talleres' } },
  { id: 'more', kind: 'group', visible: true, min_role: 'all',
    label: { es: 'Más', en: 'More', eu: 'Gehiago' },
    children: [
      { id: 'no-ficcion', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'No-ficción', en: 'Non-fiction', eu: 'Ez-fikzioa' }, action: { type: 'category', value: 'no-ficcion' } },
      { id: 'ficcion', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'Ficción', en: 'Fiction', eu: 'Fikzioa' }, action: { type: 'category', value: 'ficcion' } },
      { id: 'barrio', kind: 'group', visible: true, min_role: 'all',
        label: { es: 'Barrio', en: 'Neighbourhood', eu: 'Auzoa' },
        children: [
          { id: 'microperfiles', kind: 'link', visible: true, min_role: 'all',
            label: { es: 'Micro-perfiles', en: 'Micro-profiles', eu: 'Mikro-profilak' }, action: { type: 'section', value: 'microperfiles' } },
          { id: 'microabierto', kind: 'link', visible: true, min_role: 'all',
            label: { es: 'Espacio abierto', en: 'Open space', eu: 'Gune irekia' }, action: { type: 'section', value: 'openmic' } },
          { id: 'galeria', kind: 'link', visible: true, min_role: 'all',
            label: { es: 'Galería', en: 'Gallery', eu: 'Galeria' }, action: { type: 'category', value: 'galeria' } },
          { id: 'infantil', kind: 'link', visible: true, min_role: 'all',
            label: { es: 'Infantil', en: 'Kids', eu: 'Haurrak' }, action: { type: 'category', value: 'infantil' } }
        ] },
      { id: 'internacional', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'Internacional', en: 'International', eu: 'Nazioartea' }, action: { type: 'category', value: 'internacional' } },
      { id: 'authors', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'Autoras/es', en: 'Authors', eu: 'Egileak' }, action: { type: 'section', value: 'authors' } },
      { id: 'contact', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'Contacto', en: 'Contact', eu: 'Kontaktua' }, action: { type: 'modal', value: 'contact' } },
      { id: 'newsletter', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'Newsletter', en: 'Newsletter', eu: 'Buletina' }, action: { type: 'modal', value: 'newsletter' } },
      // Admins: send article recommendations to the newsletter subscribers.
      { id: 'recommendations', kind: 'link', visible: true, min_role: 'admin',
        label: { es: 'Recomendaciones', en: 'Recommendations', eu: 'Gomendioak' }, action: { type: 'modal', value: 'recommendations' } },
      { id: 'about', kind: 'link', visible: true, min_role: 'all',
        label: { es: 'Sobre La Rabia', en: 'About La Rabia', eu: 'La Rabiari buruz' }, action: { type: 'section', value: 'about' } }
    ] }
];

// Builder metadata: `key` = i18n key of the option's label (`label`: Spanish).
export const ACTION_TYPE_OPTIONS = [
  { value: 'section', key: 'admin.nav.action.section', label: 'Sección del sitio' },
  { value: 'category', key: 'admin.nav.action.category', label: 'Categoría de artículos' },
  { value: 'modal', key: 'admin.nav.action.modal', label: 'Ventana (contacto/newsletter)' },
  { value: 'article', key: 'admin.nav.action.article', label: 'Artículo concreto' },
  { value: 'project', key: 'admin.nav.action.project', label: 'Proyecto concreto' },
  { value: 'author', key: 'admin.nav.action.author', label: 'Autora concreta' },
  { value: 'url', key: 'admin.nav.action.url', label: 'Enlace externo' }
];

export const SECTION_OPTIONS = [
  { value: 'home', key: 'admin.nav.section.home', label: 'Inicio' },
  { value: 'articles', key: 'admin.nav.section.articles', label: 'Artículos' },
  { value: 'authors', key: 'admin.nav.section.authors', label: 'Autoras/es' },
  { value: 'openmic', key: 'admin.nav.section.openmic', label: 'Espacio abierto' },
  { value: 'microperfiles', key: 'admin.nav.section.microperfiles', label: 'Micro-perfiles' },
  { value: 'talleres', key: 'admin.nav.section.talleres', label: 'Talleres' },
  { value: 'about', key: 'admin.nav.section.about', label: 'Sobre La Rabia' }
];

export const MODAL_OPTIONS = [
  { value: 'contact', key: 'admin.nav.modal.contact', label: 'Contacto' },
  { value: 'newsletter', key: 'admin.nav.modal.newsletter', label: 'Newsletter' },
  { value: 'recommendations', key: 'admin.nav.modal.recommendations', label: 'Recomendaciones (admins)' }
];

export const ROLE_OPTIONS = [
  { value: 'all', key: 'admin.nav.role.all', label: 'Todo el mundo' },
  { value: 'editor', key: 'admin.nav.role.editor', label: 'Editores y superiores' },
  { value: 'admin', key: 'admin.nav.role.admin', label: 'Admins y super-admin' },
  { value: 'super_admin', key: 'admin.nav.role.superAdmin', label: 'Solo super-admin' }
];

// The default buttons' labels by id: a saved menu whose label wasn't changed
// still gets the languages added later (e.g. Basque).
const DEFAULT_LABELS = {};
(function collect(items) {
  items.forEach((it) => {
    DEFAULT_LABELS[it.id] = it.label;
    if (it.children) collect(it.children);
  });
})(DEFAULT_NAV);

/** Pick the label for the current language, falling back to Spanish then English. */
export function navLabel(item, lang) {
  if (!item?.label) return '';
  if (item.label[lang]) return item.label[lang];
  const def = DEFAULT_LABELS[item.id];
  if (def?.[lang] && (!item.label.es || item.label.es === def.es)) return def[lang];
  return item.label.es || item.label.en || '';
}

/** Can a user with the given role flags see an item with this min_role? */
export function canSeeNavItem(item, { isEditor, isAdmin, isSuperAdmin } = {}) {
  switch (item?.min_role) {
    case 'super_admin': return !!isSuperAdmin;
    case 'admin': return !!(isAdmin || isSuperAdmin);
    case 'editor': return !!(isEditor || isAdmin || isSuperAdmin);
    case 'all':
    default: return true;
  }
}
