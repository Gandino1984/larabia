// magazine-front/src/utils/projectKinds.js
//
// A project's type (genre) and format: [stored value, i18n key]. The values
// are what the database keeps (Spanish, as they always were); readers see the
// label in their language.

export const PROJECT_TYPES = [
  ['ficción', 'project.type.ficcion'], ['no-ficción', 'project.type.noficcion'], ['ensayo', 'project.type.ensayo'],
  ['académico', 'project.type.academico'], ['científico', 'project.type.cientifico'],
  ['periodístico', 'project.type.periodistico'], ['poético', 'project.type.poetico'],
  ['narrativo', 'project.type.narrativo'], ['experimental', 'project.type.experimental'],
  ['documental', 'project.type.documental'], ['autobiográfico', 'project.type.autobiografico']
];

export const PROJECT_FORMATS = [
  ['cómic', 'project.format.comic'], ['crónica', 'project.format.cronica'], ['ensayo', 'project.format.ensayo'],
  ['cuento', 'project.format.cuento'], ['multimedia', 'project.format.multimedia'], ['podcast', 'project.format.podcast'],
  ['video', 'project.format.video'], ['fotografía', 'project.format.fotografia'],
  ['ilustración', 'project.format.ilustracion'], ['performance', 'project.format.performance'],
  ['instalación', 'project.format.instalacion'], ['novela', 'project.format.novela'],
  ['artículo', 'project.format.articulo'], ['reportaje', 'project.format.reportaje'],
  ['entrevista', 'project.format.entrevista'], ['poesía', 'project.format.poesia']
];

const plain = (s) => String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const keyOf = (list) => {
  const byPlain = Object.fromEntries(list.map(([v, k]) => [plain(v), k]));
  return (value) => byPlain[plain(value)];
};
const typeKey = keyOf(PROJECT_TYPES);
const formatKey = keyOf(PROJECT_FORMATS);
const capitalized = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** A project type's label in the reader's language (unknown: as it is). */
export const projectTypeLabel = (value, t) => {
  if (!value) return '';
  const key = typeKey(value);
  return key ? t(key) : capitalized(value);
};

/** A project format's label in the reader's language (unknown: as it is). */
export const projectFormatLabel = (value, t) => {
  if (!value) return '';
  const key = formatKey(value);
  return key ? t(key) : capitalized(value);
};
