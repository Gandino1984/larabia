import { useState, useEffect } from 'react';
import { useNav } from '../../../app_context/NavContext';
import { useUI } from '../../../app_context/UIContext';
import {
  DEFAULT_NAV,
  ACTION_TYPE_OPTIONS,
  SECTION_OPTIONS,
  MODAL_OPTIONS,
  ROLE_OPTIONS
} from '../../../app_context/navConfig';
import { ChevronUp, ChevronDown, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import './AdminNavTab.css';

const clone = (x) => JSON.parse(JSON.stringify(x));
const newId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const blankLink = () => ({
  id: newId('link'),
  kind: 'link',
  label: { es: 'Nuevo botón', en: 'New button' },
  visible: true,
  min_role: 'all',
  action: { type: 'section', value: 'home' }
});
const blankGroup = () => ({
  id: newId('group'),
  kind: 'group',
  label: { es: 'Nuevo grupo', en: 'New group' },
  visible: true,
  min_role: 'all',
  children: []
});

/** Editor for a link's action (type + value). */
function ActionEditor({ action, onChange }) {
  const set = (patch) => onChange({ ...action, ...patch });
  const onType = (type) => {
    // sensible default value per type
    const def = { section: 'home', modal: 'contact', category: '', url: '', article: '', project: '', author: '' };
    set({ type, value: def[type] ?? '' });
  };
  return (
    <div className="nav-action">
      <select value={action.type} onChange={(e) => onType(e.target.value)}>
        {ACTION_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {action.type === 'section' && (
        <select value={action.value} onChange={(e) => set({ value: e.target.value })}>
          {SECTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {action.type === 'modal' && (
        <select value={action.value} onChange={(e) => set({ value: e.target.value })}>
          {MODAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {action.type === 'category' && (
        <input type="text" placeholder="categoría (p.ej. internacional)"
          value={action.value} onChange={(e) => set({ value: e.target.value })} />
      )}
      {action.type === 'url' && (
        <input type="text" placeholder="https://… o /ruta"
          value={action.value} onChange={(e) => set({ value: e.target.value })} />
      )}
      {(action.type === 'article' || action.type === 'project' || action.type === 'author') && (
        <input type="text" inputMode="numeric" placeholder="ID"
          value={action.value} onChange={(e) => set({ value: e.target.value })} />
      )}
    </div>
  );
}

/** Shared row controls: label (es/en), visibility, role, reorder, delete. */
function ItemMeta({ item, onChange, onMove, onDelete, canDelete, isFirst, isLast }) {
  const setLabel = (lang, v) => onChange({ ...item, label: { ...item.label, [lang]: v } });
  return (
    <div className="nav-item__meta">
      <div className="nav-item__labels">
        <input className="nav-item__label" type="text" maxLength={40} placeholder="Etiqueta (ES)"
          value={item.label?.es || ''} onChange={(e) => setLabel('es', e.target.value)} />
        <input className="nav-item__label" type="text" maxLength={40} placeholder="Label (EN)"
          value={item.label?.en || ''} onChange={(e) => setLabel('en', e.target.value)} />
      </div>
      <div className="nav-item__controls">
        <button type="button" title={item.visible ? 'Visible' : 'Oculto'}
          className={`nav-icon-btn ${item.visible ? 'is-on' : ''}`}
          onClick={() => onChange({ ...item, visible: !item.visible })}>
          {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <select value={item.min_role} title="Quién lo ve"
          onChange={(e) => onChange({ ...item, min_role: e.target.value })}>
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="button" className="nav-icon-btn" disabled={isFirst} onClick={() => onMove(-1)} title="Subir"><ChevronUp size={16} /></button>
        <button type="button" className="nav-icon-btn" disabled={isLast} onClick={() => onMove(1)} title="Bajar"><ChevronDown size={16} /></button>
        {canDelete && (
          <button type="button" className="nav-icon-btn nav-icon-btn--danger" onClick={onDelete} title="Eliminar"><Trash2 size={16} /></button>
        )}
      </div>
    </div>
  );
}

function AdminNavTab() {
  const { rawConfig, isCustom, updateNav, loaded } = useNav();
  const { showSuccess, showError } = useUI();
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    setItems(clone(isCustom ? rawConfig : DEFAULT_NAV));
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
    else { showSuccess('Navegación restaurada'); setItems(clone(DEFAULT_NAV)); }
  };

  return (
    <section className="admin-nav">
      <p className="admin-nav__hint">
        Configura los botones de la barra superior: visibilidad, orden, etiquetas, quién los
        ve y qué hacen. «Proyectos», la búsqueda, el idioma y Admin son fijos. Pulsa
        <strong> Guardar</strong> para aplicar a todo el mundo, o <strong>Restaurar</strong> para volver al menú por defecto.
      </p>

      <div className="admin-nav__list">
        {items.map((item, idx) => (
          <div key={item.id} className="nav-item">
            <div className="nav-item__row">
              <span className="nav-item__kind">
                {item.kind === 'group' ? 'Grupo' : item.kind === 'projects' ? 'Proyectos (fijo)' : 'Botón'}
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
                    <ActionEditor action={child.action} onChange={(action) => updateChild(idx, cIdx, { ...child, action })} />
                  </div>
                ))}
                <button type="button" className="admin-nav__add-child" onClick={() => addChild(idx)}>
                  <Plus size={14} /> Añadir elemento al grupo
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="admin-nav__add-row">
        <button type="button" onClick={() => setItems((p) => [...p, blankLink()])}><Plus size={14} /> Añadir botón</button>
        <button type="button" onClick={() => setItems((p) => [...p, blankGroup()])}><Plus size={14} /> Añadir grupo</button>
      </div>

      <div className="admin-nav__actions">
        <button type="button" className="admin-nav__reset" onClick={handleReset} disabled={saving}>Restaurar por defecto</button>
        <button type="button" className="admin-nav__save" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </section>
  );
}

export default AdminNavTab;
