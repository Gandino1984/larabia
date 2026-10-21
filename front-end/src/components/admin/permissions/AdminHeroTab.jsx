// Admin → Portada (super admins): the order of the featured stories in the
// home hero. Arrows (or dragging, on a computer) and «Guardar el orden»; take
// a story out; pin one of the most liked ones the hero adds by itself; add any
// published story. Server: /magazine-article/hero.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, ArrowDown, X, Pin, Plus, Search, Heart, GripVertical, Save, Undo2, ExternalLink } from 'lucide-react';
import axiosInstance from '../../../utils/axiosConfig';
import { useAuth } from '../../../app_context/AuthContext';
import { useUI } from '../../../app_context/UIContext';
import { useMagazine } from '../../../app_context/MagazineContext';
import { localDate } from '../../../utils/locale';
import { categoryLabel } from '../../../utils/articleFilters';
import './AdminHeroTab.css';

const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
const coverUrl = (c) => (!c ? null : c.startsWith('http') ? c : `${apiUrl}${c.startsWith('/') ? c : `/${c}`}`);
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const sameOrder = (a, b) => a.length === b.length && a.every((x, i) => x.id_article === b[i].id_article);

function AdminHeroTab() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showSuccess, showError, navigateToHome } = useUI();
  const { fetchFeaturedArticles } = useMagazine();
  const [data, setData] = useState({ max: 10, featured: [], liked: [] });
  const [order, setOrder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [published, setPublished] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const auth = useMemo(() => ({ headers: { 'x-user-id': currentUser?.id_user } }), [currentUser]);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/magazine-article/hero', auth);
      const d = res.data?.data || { max: 10, featured: [], liked: [] };
      setData(d);
      setOrder(d.featured);
    } catch (err) {
      showError(err.response?.data?.error || t('admin.hero.loadError', 'No se pudo cargar la portada'));
    } finally {
      setLoading(false);
    }
  }, [auth, showError, t]);

  useEffect(() => { load(); }, [load]);
  // Published stories, for «Añadir una historia» (what readers can see).
  useEffect(() => {
    axiosInstance.get('/magazine-article', { params: { status: 'published' } })
      .then((res) => setPublished((res.data?.data || []).filter((a) => a.status_article === 'published')))
      .catch(() => setPublished([]));
  }, []);

  const dirty = !sameOrder(order, data.featured);

  const move = (from, to) => {
    if (to < 0 || to >= order.length || from === to) return;
    setOrder((list) => {
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const saveOrder = async ({ quiet = false } = {}) => {
    setBusy(true);
    try {
      const res = await axiosInstance.patch('/magazine-article/hero/order', { ids: order.map((a) => a.id_article) }, auth);
      if (!quiet) showSuccess(res.data?.success || t('admin.hero.saved', 'Orden guardado'));
      await load();
      fetchFeaturedArticles();
      return true;
    } catch (err) {
      showError(err.response?.data?.error || t('admin.hero.saveError', 'No se pudo guardar el orden'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  // In / out of the hero. Unsaved order changes are saved first (adding or
  // removing reloads the list).
  const setFeatured = async (article, featured) => {
    if (!featured && !window.confirm(t('admin.hero.confirmRemove', { title: article.title_article, defaultValue: '¿Quitar «{{title}}» de la portada? La historia sigue publicada.' }))) return;
    if (dirty && !(await saveOrder({ quiet: true }))) return;
    setBusy(true);
    try {
      const res = await axiosInstance.patch(`/magazine-article/hero/${article.id_article}`, { featured }, auth);
      showSuccess(res.data?.success || t('admin.hero.updated', 'Portada actualizada'));
      await load();
      fetchFeaturedArticles();
      if (featured) setQuery('');
    } catch (err) {
      showError(err.response?.data?.error || t('admin.hero.updateError', 'No se pudo cambiar la portada'));
    } finally {
      setBusy(false);
    }
  };

  const inHero = useMemo(() => new Set([...order, ...data.liked].map((a) => a.id_article)), [order, data.liked]);
  const results = useMemo(() => {
    const q = fold(query).trim();
    if (q.length < 2) return [];
    return published.filter((a) => !inHero.has(a.id_article) && fold(a.title_article).includes(q)).slice(0, 8);
  }, [query, published, inHero]);

  const meta = (a) => [
    a.category_article && a.category_article !== 'general' ? categoryLabel(a.category_article, t) : null,
    a.date_published ? localDate(a.date_published, { day: 'numeric', month: 'short', year: 'numeric' }) : null,
    (a.authors?.length ? a.authors.join(', ') : a.author_name) || null
  ].filter(Boolean).join(' · ');

  const thumb = (a) => (coverUrl(a.cover_image_article)
    ? <img src={coverUrl(a.cover_image_article)} alt="" className="admin-hero__thumb" loading="lazy" />
    : <span className="admin-hero__thumb admin-hero__thumb--empty" aria-hidden="true" />);

  if (loading) return <p className="admin-hero__empty">{t('common.states.loading', 'Cargando…')}</p>;

  return (
    <section className="admin-hero">
      <div className="admin-hero__head">
        <h2>{t('admin.hero.title', 'Historias destacadas de la portada')}</h2>
        <button type="button" className="admin-hero__link" onClick={navigateToHome}>
          <ExternalLink size={15} /> {t('admin.hero.view', 'Ver la portada')}
        </button>
      </div>
      <p className="admin-hero__intro">
        {t('admin.hero.intro', 'Se ven en la portada en este orden, de la primera a la última. Cámbialo con las flechas (o arrastrando, en un ordenador) y pulsa «Guardar el orden».')}
      </p>

      {order.length === 0 ? (
        <p className="admin-hero__empty">{t('admin.hero.empty', 'No hay historias destacadas. Añade alguna abajo.')}</p>
      ) : (
        <ol className="admin-hero__list">
          {order.map((a, i) => (
            <li
              key={a.id_article}
              className={`admin-hero__item ${i >= data.max ? 'is-over' : ''} ${dragIndex === i ? 'is-dragging' : ''} ${overIndex === i && dragIndex !== null && dragIndex !== i ? 'is-drop-target' : ''}`}
              draggable
              onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
              onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) move(dragIndex, i); setDragIndex(null); setOverIndex(null); }}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
            >
              <GripVertical size={18} className="admin-hero__grip" aria-hidden="true" />
              <span className="admin-hero__pos">{i + 1}</span>
              {thumb(a)}
              <span className="admin-hero__text">
                <span className="admin-hero__title">{a.title_article}</span>
                <span className="admin-hero__meta">{meta(a)}</span>
                {i >= data.max && (
                  <span className="admin-hero__over">{t('admin.hero.over', { max: data.max, defaultValue: 'No cabe en la portada (se ven las {{max}} primeras)' })}</span>
                )}
              </span>
              <span className="admin-hero__actions">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0 || busy} aria-label={t('admin.hero.up', 'Subir')} title={t('admin.hero.up', 'Subir')}>
                  <ArrowUp size={16} />
                </button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === order.length - 1 || busy} aria-label={t('admin.hero.down', 'Bajar')} title={t('admin.hero.down', 'Bajar')}>
                  <ArrowDown size={16} />
                </button>
                <button type="button" className="admin-hero__remove" onClick={() => setFeatured(a, false)} disabled={busy} aria-label={t('admin.hero.remove', 'Quitar de la portada')} title={t('admin.hero.remove', 'Quitar de la portada')}>
                  <X size={16} />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {order.length > 1 && (
        <div className="admin-hero__save">
          <button type="button" className="admin-hero__btn admin-hero__btn--primary" onClick={() => saveOrder()} disabled={!dirty || busy}>
            <Save size={16} /> {t('admin.hero.save', 'Guardar el orden')}
          </button>
          {dirty && (
            <>
              <button type="button" className="admin-hero__btn" onClick={() => setOrder(data.featured)} disabled={busy}>
                <Undo2 size={16} /> {t('admin.hero.undo', 'Deshacer los cambios')}
              </button>
              <span className="admin-hero__dirty" role="status">{t('admin.hero.unsaved', 'Hay cambios sin guardar')}</span>
            </>
          )}
        </div>
      )}

      {data.liked.length > 0 && (
        <div className="admin-hero__section">
          <h3>{t('admin.hero.likedTitle', 'Se añaden solas: las más gustadas')}</h3>
          <p className="admin-hero__hint">
            {t('admin.hero.likedHint', 'Después de las destacadas, la portada muestra las historias con más «me gusta». Fija una para poder colocarla donde quieras.')}
          </p>
          <ul className="admin-hero__list admin-hero__list--plain">
            {data.liked.map((a) => (
              <li key={a.id_article} className="admin-hero__item">
                {thumb(a)}
                <span className="admin-hero__text">
                  <span className="admin-hero__title">{a.title_article}</span>
                  <span className="admin-hero__meta"><Heart size={12} aria-hidden="true" /> {a.likes} · {meta(a)}</span>
                </span>
                <span className="admin-hero__actions">
                  <button type="button" className="admin-hero__btn" onClick={() => setFeatured(a, true)} disabled={busy}>
                    <Pin size={15} /> {t('admin.hero.pin', 'Fijar')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="admin-hero__section">
        <h3>{t('admin.hero.addTitle', 'Añadir una historia')}</h3>
        <div className="admin-hero__search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.hero.searchPlaceholder', 'Busca por título…')}
            aria-label={t('admin.hero.addTitle', 'Añadir una historia')}
          />
        </div>
        {query.trim().length >= 2 && (
          results.length === 0 ? (
            <p className="admin-hero__hint">{t('admin.hero.noResults', 'No hay historias publicadas con ese título fuera de la portada.')}</p>
          ) : (
            <ul className="admin-hero__list admin-hero__list--plain">
              {results.map((a) => (
                <li key={a.id_article} className="admin-hero__item">
                  {thumb(a)}
                  <span className="admin-hero__text">
                    <span className="admin-hero__title">{a.title_article}</span>
                    <span className="admin-hero__meta">{meta({ ...a, authors: (a.authors || []).map((u) => u.name_user) })}</span>
                  </span>
                  <span className="admin-hero__actions">
                    <button type="button" className="admin-hero__btn" onClick={() => setFeatured(a, true)} disabled={busy}>
                      <Plus size={15} /> {t('admin.hero.add', 'Añadir')}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </section>
  );
}

export default AdminHeroTab;
