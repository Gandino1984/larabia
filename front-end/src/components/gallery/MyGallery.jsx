// magazine-front/src/components/gallery/MyGallery.jsx
//
// «Mi galería», for visual artists: their exhibition — its title (none: their
// name) and short text — and up to 15 works: an image (kept as WebP), a title
// (none: «Sin título») and its size in pixels, read from the file. Top to
// bottom: the texts, the upload box, the works, «Guardar la exposición» (the
// texts and any work title left unsaved) and the count. Every new or changed
// work goes to the team's review before it shows in the gallery; each one
// says where it stands (and why, if it wasn't published). «Mis charlas»: the
// magazine's chat (ChatPanel), where socios/as who asked to chat are.
// With galleryView.forUser, a super admin prepares the gallery of someone
// invited, on their behalf (/gallery/for/:id): no review, no messages, not
// public until that person accepts it and takes it over.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Upload, Save, Eye, MessagesSquare, ImagePlus, RefreshCw } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useGallery } from '../../app_context/GalleryContext';
import { useChat } from '../../app_context/ChatContext';
import { workImageUrl, workTitle, workSize } from './galleryUtils';
import './Gallery.css';

const TITLE_MAX = 120;
const STATEMENT_MAX = 1000;
const WORK_TITLE_MAX = 150;
const IMAGE_MAX_MB = 20;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/tiff'];

function StatusChip({ work, onBehalf }) {
  const { t } = useTranslation();
  if (work.status_work === 'approved') {
    return <span className="gallery-status gallery-status--approved">{onBehalf ? t('gallery.status.ready', 'Lista para exponer') : t('gallery.status.approved', 'En la galería')}</span>;
  }
  if (work.status_work === 'rejected') return <span className="gallery-status gallery-status--rejected">{t('gallery.status.rejected', 'No publicada')}</span>;
  return <span className="gallery-status gallery-status--pending">{t('gallery.status.pending', 'Pendiente de revisión')}</span>;
}

function WorkRow({ work, index, total, busy, onBehalf, onSaveTitle, onDraft, onReplace, onMove, onDelete, progress }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(work.title_work || '');
  useEffect(() => { setTitle(work.title_work || ''); }, [work.title_work]);
  const fileRef = useRef(null);
  const changed = title.trim() !== (work.title_work || '');

  return (
    <li className="my-work">
      <div className="my-work__image">
        <img src={workImageUrl(work.image)} alt={workTitle(work, t)} />
        {progress != null && (
          <div className="my-work__progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span>{progress < 100 ? `${progress}%` : t('hscroll.editor.processingImage', 'Procesando…')}</span>
          </div>
        )}
      </div>
      <div className="my-work__body">
        <div className="my-work__top">
          <StatusChip work={work} onBehalf={onBehalf} />
          {workSize(work, t) && <span className="my-work__size">{workSize(work, t)}</span>}
        </div>
        {work.status_work === 'rejected' && work.rejection_reason && (
          <p className="my-work__reason">{t('gallery.status.reason', { reason: work.rejection_reason, defaultValue: 'Motivo: {{reason}}' })}</p>
        )}
        <form className="my-work__title" onSubmit={(e) => { e.preventDefault(); if (changed) onSaveTitle(work, title); }}>
          <label htmlFor={`work-title-${work.id_work}`}>{t('gallery.mine.workTitle', 'Título')}</label>
          <div className="my-work__title-row">
            <input
              id={`work-title-${work.id_work}`}
              type="text"
              value={title}
              maxLength={WORK_TITLE_MAX}
              placeholder={t('gallery.untitled', 'Sin título')}
              onChange={(e) => { setTitle(e.target.value); onDraft(work.id_work, e.target.value); }}
            />
            <button type="submit" className="gallery-btn gallery-btn--small" disabled={!changed || busy}>
              <Save size={15} aria-hidden="true" /> {t('common.buttons.save', 'Guardar')}
            </button>
          </div>
        </form>
        <div className="my-work__actions">
          <button type="button" className="gallery-icon-btn" onClick={() => onMove(index, -1)} disabled={index === 0 || busy} aria-label={t('gallery.mine.moveUp', 'Subir')} title={t('gallery.mine.moveUp', 'Subir')}><ArrowUp size={16} /></button>
          <button type="button" className="gallery-icon-btn" onClick={() => onMove(index, 1)} disabled={index === total - 1 || busy} aria-label={t('gallery.mine.moveDown', 'Bajar')} title={t('gallery.mine.moveDown', 'Bajar')}><ArrowDown size={16} /></button>
          <button type="button" className="gallery-btn gallery-btn--small" onClick={() => fileRef.current?.click()} disabled={busy}>
            <RefreshCw size={15} aria-hidden="true" /> {t('gallery.mine.replace', 'Cambiar imagen')}
          </button>
          <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(',')} className="gallery-sr" tabIndex={-1}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onReplace(work, f); }} />
          <button type="button" className="gallery-btn gallery-btn--small gallery-btn--danger" onClick={() => onDelete(work)} disabled={busy}>
            <Trash2 size={15} aria-hidden="true" /> {t('gallery.mine.delete', 'Quitar')}
          </button>
        </div>
      </div>
    </li>
  );
}

function MyGallery() {
  const { t } = useTranslation();
  const { galleryView, navigateToGallery, navigateToExhibition, navigateToAdmin, showSuccess, showError } = useUI();
  const { currentUser, isSuperAdmin } = useAuth();
  const { isArtist, feed, markReviewsSeen } = useGallery();
  const chat = useChat();
  // A super admin preparing the gallery of someone invited (on their behalf).
  const forUser = galleryView.forUser || null;
  const base = forUser ? `/gallery/for/${forUser.id_user}` : '/gallery/mine';
  const allowed = forUser ? isSuperAdmin : isArtist;
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState({}); // { [id_work | 'new']: 0–100 }
  const [newTitle, setNewTitle] = useState('');
  const newFileRef = useRef(null);
  const titleDrafts = useRef({}); // { [id_work]: the title being typed }
  const auth = useCallback(() => ({ headers: { 'x-user-id': currentUser?.id_user } }), [currentUser?.id_user]);

  // texts: also take the exhibition's title and text (on loading and saving
  // them) — not after a work changes, which would drop what's being typed.
  const apply = useCallback((d, { texts = false } = {}) => {
    setData(d);
    if (texts) {
      setTitle(d?.title || '');
      setStatement(d?.statement || '');
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!allowed) return;
    setLoadError(null);
    axiosInstance.get(base, auth())
      .then((res) => apply(res.data?.data, { texts: true }))
      .catch((err) => {
        // e.g. on behalf: «… ya gestiona su galería» (they accepted it).
        setLoadError(err.response?.data?.error || t('gallery.mine.loadError', 'No se pudo cargar tu exposición'));
      });
  }, [allowed, base, auth, apply, t]);

  // Opening «Mi galería» = having seen the reviews.
  useEffect(() => { if (!forUser && feed.reviews.length) markReviewsSeen(); }, [forUser, feed.reviews.length, markReviewsSeen]);


  const run = async (request, { quiet = false } = {}) => {
    setBusy(true);
    try {
      const res = await request();
      apply(res.data?.data);
      if (!quiet && res.data?.success) showSuccess(res.data.success);
      return true;
    } catch (err) {
      showError(err.response?.data?.error || t('gallery.mine.error', 'No se pudo guardar'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  // «Guardar la exposición»: the texts, and the work titles typed but not saved.
  const saveAll = async (e) => {
    e.preventDefault();
    const titled = data.works.filter((w) => {
      const draft = titleDrafts.current[w.id_work];
      return draft != null && draft.trim() !== (w.title_work || '');
    });
    setBusy(true);
    try {
      let res = await axiosInstance.patch(base, { title, statement }, auth());
      apply(res.data?.data, { texts: true });
      for (const w of titled) {
        res = await axiosInstance.patch(`${base}/works/${w.id_work}`, { title: titleDrafts.current[w.id_work] }, auth());
        apply(res.data?.data);
      }
      if (res.data?.success) showSuccess(res.data.success);
    } catch (err) {
      showError(err.response?.data?.error || t('gallery.mine.error', 'No se pudo guardar'));
    } finally {
      setBusy(false);
    }
  };

  const checkFile = (file) => {
    if (!IMAGE_TYPES.includes(file.type)) {
      showError(t('gallery.mine.badType', 'Formato de imagen no admitido: usa JPG, PNG, WebP, AVIF, GIF o TIFF'));
      return false;
    }
    if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
      showError(t('gallery.mine.tooBig', { max: IMAGE_MAX_MB, defaultValue: 'La imagen es demasiado grande (máximo {{max}} MB)' }));
      return false;
    }
    return true;
  };

  const sendImage = async (key, url, method, file, fields) => {
    const form = new FormData();
    form.append('image', file);
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    setUploads((u) => ({ ...u, [key]: 0 }));
    const ok = await run(() => axiosInstance({
      url, method, data: form,
      headers: { ...auth().headers, 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => { if (e.total) setUploads((u) => ({ ...u, [key]: Math.round((e.loaded / e.total) * 100) })); }
    }));
    setUploads((u) => { const n = { ...u }; delete n[key]; return n; });
    return ok;
  };

  const addWork = async (file) => {
    if (!checkFile(file)) return;
    if (await sendImage('new', `${base}/works`, 'post', file, { title: newTitle.trim() })) setNewTitle('');
  };

  const replace = (work, file) => { if (checkFile(file)) sendImage(work.id_work, `${base}/works/${work.id_work}`, 'patch', file, {}); };
  const saveTitle = (work, value) => run(() => axiosInstance.patch(`${base}/works/${work.id_work}`, { title: value }, auth()));
  const remove = (work) => {
    if (!window.confirm(t('gallery.mine.confirmDelete', { title: workTitle(work, t), defaultValue: '¿Quitar «{{title}}» de tu exposición? No se puede deshacer.' }))) return;
    run(() => axiosInstance.delete(`${base}/works/${work.id_work}`, auth()));
  };
  const move = (index, d) => {
    const ids = data.works.map((w) => w.id_work);
    [ids[index], ids[index + d]] = [ids[index + d], ids[index]];
    run(() => axiosInstance.patch(`${base}/order`, { ids }, auth()), { quiet: true });
  };

  const hasPublished = !forUser && data?.works?.some((w) => w.status_work === 'approved');
  const artistName = forUser?.name_user || data?.artist?.name_user || '';

  if (!allowed) {
    return (
      <div className="gallery-page">
        <button type="button" className="gallery-back" onClick={navigateToGallery}><ArrowLeft size={18} /> {t('gallery.back', 'Volver a la galería')}</button>
        <p className="gallery-page__empty">{t('gallery.mine.notArtist', 'Esta parte es para las y los artistas de la galería.')}</p>
      </div>
    );
  }


  return (
    <div className="gallery-page my-gallery">
      {forUser ? (
        <button type="button" className="gallery-back" onClick={() => navigateToAdmin('gallery')}>
          <ArrowLeft size={18} aria-hidden="true" /> {t('gallery.forUser.back', 'Volver a Admin › Galería')}
        </button>
      ) : (
        <button type="button" className="gallery-back" onClick={navigateToGallery}>
          <ArrowLeft size={18} aria-hidden="true" /> {t('gallery.back', 'Volver a la galería')}
        </button>
      )}
      <header className="gallery-page__header">
        <div>
          <h1>{forUser ? t('gallery.forUser.title', { name: artistName, defaultValue: 'Galería de {{name}}' }) : t('gallery.mine.title', 'Mi galería')}</h1>
          <p className="gallery-page__subtitle">
            {forUser
              ? t('gallery.forUser.subtitle', 'La preparas en su nombre: un título, un texto breve y hasta quince obras, que no pasan por revisión.')
              : t('gallery.mine.subtitle', 'Tu exposición en la Galería: un título, un texto breve y hasta quince obras.')}
          </p>
        </div>
        {!forUser && (
          <div className="gallery-page__actions">
            {hasPublished && (
              <button type="button" className="gallery-btn" onClick={() => navigateToExhibition(data.id_exhibition)}>
                <Eye size={18} aria-hidden="true" /> {t('gallery.mine.view', 'Ver mi exposición')}
              </button>
            )}
            <button type="button" className="gallery-btn" onClick={() => chat?.openChats()}>
              <MessagesSquare size={18} aria-hidden="true" /> {t('chat.title', 'Mis charlas')}
              {chat?.unreadTotal > 0 && <span className="gallery-badge">{chat.unreadTotal}</span>}
            </button>
          </div>
        )}
      </header>

      {forUser && (
        <p className="my-gallery__behalf" role="note">
          {t('gallery.forUser.notice', { name: artistName, defaultValue: 'No se verá en la galería hasta que {{name}} acepte la invitación: entonces pasará a gestionarla. Si la rechaza, se borrará con sus obras.' })}
        </p>
      )}


      {!data ? (
        <p className="gallery-page__empty">{loadError || t('common.states.loading', 'Cargando…')}</p>
      ) : (
        <>
          <form id="exhibition-form" className="gallery-form" onSubmit={saveAll}>
            <div className="gallery-form__field">
              <label htmlFor="exhibition-title">{t('gallery.mine.exhibitionTitle', 'Título de la exposición')}</label>
              <input id="exhibition-title" type="text" value={title} maxLength={TITLE_MAX}
                placeholder={forUser ? artistName : currentUser?.name_user} onChange={(e) => setTitle(e.target.value)} />
              <p className="gallery-form__hint">
                {forUser
                  ? t('gallery.forUser.titleHint', { name: artistName, defaultValue: 'Si lo dejas vacío, se llamará como la o el artista: {{name}}.' })
                  : t('gallery.mine.exhibitionTitleHint', 'Si lo dejas vacío, se llamará como tú.')}
              </p>
            </div>
            <div className="gallery-form__field">
              <label htmlFor="exhibition-statement">{t('gallery.mine.statement', 'Texto de presentación')}</label>
              <textarea id="exhibition-statement" rows={5} value={statement} maxLength={STATEMENT_MAX}
                onChange={(e) => setStatement(e.target.value)} />
              <p className="gallery-form__hint">{statement.length}/{STATEMENT_MAX}</p>
            </div>
          </form>

          {data.works.length < data.works_max ? (
            <div className="my-work-new">
              <div className="gallery-form__field">
                <label htmlFor="new-work-title">{t('gallery.mine.newTitle', 'Título de la nueva obra (opcional)')}</label>
                <input id="new-work-title" type="text" value={newTitle} maxLength={WORK_TITLE_MAX}
                  placeholder={t('gallery.untitled', 'Sin título')} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
              <button type="button" className="gallery-btn gallery-btn--primary" onClick={() => newFileRef.current?.click()} disabled={busy}>
                {uploads.new != null
                  ? <><Upload size={16} aria-hidden="true" /> {uploads.new < 100 ? `${uploads.new}%` : t('hscroll.editor.processingImage', 'Procesando…')}</>
                  : <><ImagePlus size={16} aria-hidden="true" /> {t('gallery.mine.add', 'Subir una obra')}</>}
              </button>
              <input ref={newFileRef} type="file" accept={IMAGE_TYPES.join(',')} className="gallery-sr" tabIndex={-1}
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) addWork(f); }} />
              <p className="gallery-form__hint">{t('gallery.mine.fileHint', { max: IMAGE_MAX_MB, defaultValue: 'JPG, PNG, WebP, AVIF, GIF o TIFF, hasta {{max}} MB. Se guarda en formato WebP, a su tamaño en píxeles.' })}</p>
              <p className="gallery-form__hint">
                {forUser
                  ? t('gallery.forUser.reviewNote', 'Las obras que subes tú no pasan por revisión.')
                  : t('gallery.mine.reviewNote', 'Cada obra nueva o cambiada pasa por la revisión del equipo antes de verse en la galería.')}
              </p>
            </div>
          ) : (
            <p className="my-work-new my-work-new--full">{t('gallery.mine.full', { max: data.works_max, defaultValue: 'Tu exposición ya tiene {{max}} obras: quita una para subir otra.' })}</p>
          )}

          <section className="my-works">
            {data.works.length > 0 && (
              <>
                <h2>{t('gallery.mine.works', 'Obras')}</h2>
                <ul className="my-works__list">
                  {data.works.map((w, i) => (
                    <WorkRow key={w.id_work} work={w} index={i} total={data.works.length} busy={busy} onBehalf={!!forUser} progress={uploads[w.id_work]}
                      onSaveTitle={saveTitle} onDraft={(id, value) => { titleDrafts.current[id] = value; }} onReplace={replace} onMove={move} onDelete={remove} />
                  ))}
                </ul>
              </>
            )}
            <button type="submit" form="exhibition-form" className="gallery-btn gallery-btn--primary my-works__save" disabled={busy}>
              <Save size={16} aria-hidden="true" /> {t('gallery.mine.saveText', 'Guardar la exposición')}
            </button>
            <p className="my-works__count">{t('gallery.mine.worksCount', { count: data.works.length, max: data.works_max, defaultValue: 'Obras subidas: {{count}} de {{max}}' })}</p>
          </section>
        </>
      )}

    </div>
  );
}

export default MyGallery;
