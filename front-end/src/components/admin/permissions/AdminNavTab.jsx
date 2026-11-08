import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNav } from '../../../app_context/NavContext';
import { useUI } from '../../../app_context/UIContext';
import {
  DEFAULT_NAV,
  ACTION_TYPE_OPTIONS,
  SECTION_OPTIONS,
  MODAL_OPTIONS,
  ROLE_OPTIONS,
  withDefaultCycles
} from '../../../app_context/navConfig';
import { ChevronUp, ChevronDown, Trash2, Plus, Eye, EyeOff, X } from 'lucide-react';
import './AdminNavTab.css';

const clone = (x) => JSON.parse(JSON.stringify(x));
const newId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const blankLink = () => ({
  id: newId('link'),
  kind: 'link',
  label: { es: 'Nuevo botón', en: 'New button', eu: 'Botoi berria' },
  visible: true,
  min_role: 'all',
  action: { type: 'section', value: 'home' }
});
const blankGroup = () => ({
  id: newId('group'),
  kind: 'group',
  label: { es: 'Nuevo grupo', en: 'New group', eu: 'Talde berria' },
  visible: true,
  min_role: 'all',
  children: []
});

/** Editor for a link's action (type + value). */
function ActionEditor({ action: rawAction, onChange }) {
  const { t } = useTranslation();
  // Items without an action (e.g. legacy/malformed config) get a safe default.
  const action = rawAction || { type: 'section', value: 'home' };
  const set = (patch) => onChange({ ...action, ...patch });
  const onType = (type) => {
    // sensible default value per type
    const def = { section: 'home', modal: 'contact', category: '', url: '', article: '', project: '', author: '' };
    set({ type, value: def[type] ?? '' });
  };
  return (
    <div className="nav-action">
      <select value={action.type} onChange={(e) => onType(e.target.value)}>
        {ACTION_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.key, o.label)}</option>)}
      </select>
      {action.type === 'section' && (
        <select value={action.value} onChange={(e) => set({ value: e.target.value })}>
          {SECTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.key, o.label)}</option>)}
        </select>
      )}
      {action.type === 'modal' && (
        <select value={action.value} onChange={(e) => set({ value: e.target.value })}>
          {MODAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.key, o.label)}</option>)}
        </select>
      )}
      {action.type === 'category' && (
        <input type="text" placeholder={t('admin.nav.categoryPlaceholder', 'categoría (p. ej. internacional)')}
          value={action.value} onChange={(e) => set({ value: e.target.value })} />
      )}
      {action.type === 'url' && (
        <input type="text" placeholder={t('admin.nav.urlPlaceholder', 'https://… o /ruta')}
          value={action.value} onChange={(e) => set({ value: e.target.value })} />
      )}
      {(action.type === 'article' || action.type === 'project' || action.type === 'author') && (
        <input type="text" inputMode="numeric" placeholder="ID"
          value={action.value} onChange={(e) => set({ value: e.target.value })} />
      )}
    </div>
  );
}

// The label in each language: [code, i18n key, Spanish default].
const LABEL_FIELDS = [
  ['es', 'admin.nav.labelEs', 'Etiqueta (ES)'],
  ['en', 'admin.nav.labelEn', 'Etiqueta (EN)'],
  ['eu', 'admin.nav.labelEu', 'Etiqueta (EU)']
];

/** For a button: a second text it alternates with every 3 s (es/en/eu —
    the Talleres button: «Concursos»). Folded until it's used; empty = none. */
function CycleField({ item, onChange }) {
  const { t } = useTranslation();
  const cycle = item.cycle || null;
  const [open, setOpen] = useState(!!(cycle && (cycle.es || cycle.en || cycle.eu)));
  const setCycle = (lang, v) => onChange({ ...item, cycle: { ...(item.cycle || {}), [lang]: v } });
  if (!open) {
    return (
      <button type="button" className="admin-nav__add-child nav-item__cycle-add" onClick={() => setOpen(true)}>
        <Plus size={14} /> {t('admin.nav.cycleAdd', 'Alternar con otro texto')}
      </button>
    );
  }
  return (
    <div className="nav-item__cycle">
      <span className="nav-item__cycle-title">
        {t('admin.nav.cycleTitle', 'Alterna cada 3 segundos con')}
        <button
          type="button"
          className="nav-icon-btn nav-icon-btn--danger"
          onClick={() => { onChange({ ...item, cycle: null }); setOpen(false); }}
          title={t('admin.nav.cycleRemove', 'Quitar el texto alterno')}
          aria-label={t('admin.nav.cycleRemove', 'Quitar el texto alterno')}
        >
          <X size={14} />
        </button>
      </span>
      <div className="nav-item__labels">
        {LABEL_FIELDS.map(([lang]) => (
          <label key={lang} className="nav-item__label-field">
            <span className="nav-item__lang" aria-hidden="true">{lang.toUpperCase()}</span>
            <input className="nav-item__label" type="text" maxLength={40} lang={lang}
              aria-label={`${t('admin.nav.cycleTitle', 'Alterna cada 3 segundos con')} (${lang.toUpperCase()})`}
              value={cycle?.[lang] || ''} onChange={(e) => setCycle(lang, e.target.value)} />
          </label>
        ))}
      </div>
    </div>
  );
}

/** Shared row controls: label (es/en/eu, each tagged with its language —
    once filled, the placeholder no longer says which), visibility, role,
    reorder, delete. */
function ItemMeta({ item, onChange, onMove, onDelete, canDelete, isFirst, isLast }) {
  const { t } = useTranslation();
  const setLabel = (lang, v) => onChange({ ...item, label: { ...item.label, [lang]: v } });
  return (
    <div className="nav-item__meta">
      <div className="nav-item__labels">
        {LABEL_FIELDS.map(([lang, key, fallback]) => (
          <label key={lang} className="nav-item__label-field">
            <span className="nav-item__lang" aria-hidden="true">{lang.toUpperCase()}</span>
            <input className="nav-item__label" type="text" maxLength={40} placeholder={t(key, fallback)} aria-label={t(key, fallback)} lang={lang}
              value={item.label?.[lang] || ''} onChange={(e) => setLabel(lang, e.target.value)} />
          </label>
        ))}
      </div>
      <div className="nav-item__controls">
        <button type="button" title={item.visible ? t('admin.nav.visible', 'Visible') : t('admin.nav.hidden', 'Oculto')}
          className={`nav-icon-btn ${item.visible ? 'is-on' : ''}`}
          onClick={() => onChange({ ...item, visible: !item.visible })}>
          {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <select value={item.min_role} title={t('admin.nav.whoSees', 'Quién lo ve')}
          onChange={(e) => onChange({ ...item, min_role: e.target.value })}>
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.key, o.label)}</option>)}
        </select>
        <button type="button" className="nav-icon-btn" disabled={isFirst} onClick={() => onMove(-1)} title={t('admin.nav.moveUp', 'Subir')}><ChevronUp size={16} /></button>
        <button type="button" className="nav-icon-btn" disabled={isLast} onClick={() => onMove(1)} title={t('admin.nav.moveDown', 'Bajar')}><ChevronDown size={16} /></button>
        {canDelete && (
          <button type="button" className="nav-icon-btn nav-icon-btn--danger" onClick={onDelete} title={t('common.buttons.delete', 'Eliminar')}><Trash2 size={16} /></button>
        )}
      </div>
      {item.kind === 'link' && <CycleField item={item} onChange={onChange} />}
    </div>
  );
}

/** Nested subgroup inside a group (e.g. "Barrio" inside "Más"): edits its own
    links. Subgroups have no action of their own, only children. */
function SubGroupEditor({ group, onChange }) {
  const { t } = useTranslation();
  const kids = group.children || [];
  const setKids = (next) => onChange({ ...group, children: next });
  const moveKid = (k, dir) => {
    const j = k + dir;
    if (j < 0 || j >= kids.length) return;
    const copy = [...kids];
    [copy[k], copy[j]] = [copy[j], copy[k]];
    setKids(copy);
  };
  return (
    <div className="nav-children nav-children--nested">
      {kids.map((kid, k) => (
        <div key={kid.id} className="nav-child">
          <ItemMeta
            item={kid}
            onChange={(next) => setKids(kids.map((c, i) => (i === k ? next : c)))}
            onMove={(dir) => moveKid(k, dir)}
            onDelete={() => setKids(kids.filter((_, i) => i !== k))}
            canDelete
            isFirst={k === 0}
            isLast={k === kids.length - 1}
          />
          <ActionEditor
            action={kid.action}
            onChange={(action) => setKids(kids.map((c, i) => (i === k ? { ...kid, action } : c)))}
          />
        </div>
      ))}
      <button type="button" className="admin-nav__add-child" onClick={() => setKids([...kids, blankLink()])}>
        <Plus size={14} /> {t('admin.nav.addToSubgroup', 'Añadir elemento al subgrupo')}
      </button>
    </div>
  );
}

function AdminNavTab() {
  const { t } = useTranslation();
  const { rawConfig, isCustom, updateNav, loaded } = useNav();
  const { showSuccess, showError } = useUI();
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    setItems(withDefaultCycles(clone(isCustom ? rawConfig : DEFAULT_NAV)));
  }, [loaded, isCustom, rawConfig]);

  const move = (arr, idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return arr;
    const copy = [...arr];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    return copy;
  };

  const updateItem = (idx, next) => setItems((prev) => prev.map((it, i) => (i === idx ? next : it)));
  const moveItem = (idx, dir) => setItems((prev) => move(prev, idx, dir));
  const deleteItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateChild = (idx, cIdx, nextChild) =>
    setItems((prev) => prev.map((it, i) =>
      i === idx ? { ...it, children: it.children.map((c, k) => (k === cIdx ? nextChild : c)) } : it));
  const moveChild = (idx, cIdx, dir) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, children: move(it.children, cIdx, dir) } : it)));
  const deleteChild = (idx, cIdx) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, children: it.children.filter((_, k) => k !== cIdx) } : it)));
  const addChild = (idx) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, children: [...(it.children || []), blankLink()] } : it)));

  const handleSave = async () => {
    setSaving(true);
    const result = await updateNav(items);
    setSaving(false);
    if (result.error) showError(result.error);
    else showSuccess(result.success);
  };

  const handleReset = async () => {
    setSaving(true);
    const result = await updateNav(null); // null = back to built-in default
    setSaving(false);
    if (result.error) showError(result.error);
    else { showSuccess(t('admin.nav.restored', 'Navegación restaurada')); setItems(withDefaultCycles(clone(DEFAULT_NAV))); }
  };

  return (
    <section className="admin-nav">
      <p className="admin-nav__hint">
        {t('admin.nav.hint', 'Configura los botones de la barra superior: visibilidad, orden, etiquetas (en castellano, inglés y euskera), quién los ve y qué hacen. «Proyectos», la búsqueda, el idioma y Admin son fijos. Pulsa «Guardar» para aplicar a todo el mundo, o «Restaurar» para volver al menú por defecto.')}
      </p>

      <div className="admin-nav__list">
        {items.map((item, idx) => (
          <div key={item.id} className="nav-item">
            <div className="nav-item__row">
              <span className="nav-item__kind">
                {item.kind === 'group' ? t('admin.nav.kindGroup', 'Grupo') : item.kind === 'projects' ? t('admin.nav.kindProjects', 'Proyectos (fijo)') : t('admin.nav.kindButton', 'Botón')}
              </span>
              <ItemMeta
                item={item}
                onChange={(next) => updateItem(idx, next)}
                onMove={(dir) => moveItem(idx, dir)}
                onDelete={() => deleteItem(idx)}
                canDelete={item.kind !== 'projects'}
                isFirst={idx === 0}
                isLast={idx === items.length - 1}
              />
            </div>

            {item.kind === 'link' && (
              <ActionEditor action={item.action} onChange={(action) => updateItem(idx, { ...item, action })} />
            )}

            {item.kind === 'group' && (
              <div className="nav-children">
                {(item.children || []).map((child, cIdx) => (
                  <div key={child.id} className="nav-child">
                    <ItemMeta
                      item={child}
                      onChange={(next) => updateChild(idx, cIdx, next)}
                      onMove={(dir) => moveChild(idx, cIdx, dir)}
                      onDelete={() => deleteChild(idx, cIdx)}
                      canDelete
                      isFirst={cIdx === 0}
                      isLast={cIdx === item.children.length - 1}
                    />
                    {child.kind === 'group' ? (
                      <SubGroupEditor group={child} onChange={(next) => updateChild(idx, cIdx, next)} />
                    ) : (
                      <ActionEditor action={child.action} onChange={(action) => updateChild(idx, cIdx, { ...child, action })} />
                    )}
                  </div>
                ))}
                <button type="button" className="admin-nav__add-child" onClick={() => addChild(idx)}>
                  <Plus size={14} /> {t('admin.nav.addToGroup', 'Añadir elemento al grupo')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="admin-nav__add-row">
        <button type="button" onClick={() => setItems((p) => [...p, blankLink()])}><Plus size={14} /> {t('admin.nav.addButton', 'Añadir botón')}</button>
        <button type="button" onClick={() => setItems((p) => [...p, blankGroup()])}><Plus size={14} /> {t('admin.nav.addGroup', 'Añadir grupo')}</button>
      </div>

      <div className="admin-nav__actions">
        <button type="button" className="admin-nav__reset" onClick={handleReset} disabled={saving}>{t('admin.nav.reset', 'Restaurar por defecto')}</button>
        <button type="button" className="admin-nav__save" onClick={handleSave} disabled={saving}>
          {saving ? t('common.states.saving', 'Guardando') : t('common.buttons.save', 'Guardar')}
        </button>
      </div>
    </section>
  );
}

export default AdminNavTab;
