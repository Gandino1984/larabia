// magazine-front/src/components/gallery/MyGallery.jsx
//
// «Mi galería», for visual artists: their exhibition — its title (none: their
// name) and short text — and up to 7 works: an image, a title (none: «Sin
// título») and its size in pixels, read from the file. Every new or changed
// work goes to the team's review before it shows in the gallery; each one
// says where it stands (and why, if it wasn't published). «Mensajes»: the
// conversations visitors opened with them, answered in the chat.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Upload, Save, Eye, MessageCircle, ImagePlus, RefreshCw } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useGallery } from '../../app_context/GalleryContext';
import { useAuthorPhoto } from '../../app_context/AuthorContext';
import { localDate } from '../../utils/locale';
import GalleryChat from './GalleryChat';
import { workImageUrl, workTitle, workSize } from './galleryUtils';
import './Gallery.css';

const TITLE_MAX = 120;
const STATEMENT_MAX = 1000;
const WORK_TITLE_MAX = 150;
const IMAGE_MAX_MB = 20;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/tiff'];

function StatusChip({ work }) {
  const { t } = useTranslation();
  if (work.status_work === 'approved') return <span className="gallery-status gallery-status--approved">{t('gallery.status.approved', 'En la galería')}</span>;
  if (work.status_work === 'rejected') return <span className="gallery-status gallery-status--rejected">{t('gallery.status.rejected', 'No publicada')}</span>;
  return <span className="gallery-status gallery-status--pending">{t('gallery.status.pending', 'Pendiente de revisión')}</span>;
}

function WorkRow({ work, index, total, busy, onSaveTitle, onReplace, onMove, onDelete, progress }) {
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
          <StatusChip work={work} />
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
              onChange={(e) => setTitle(e.target.value)}
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
  const { galleryView, navigateToGallery, navigateToExhibition, showSuccess, showError } = useUI();
  const { currentUser } = useAuth();
  const { isArtist, feed, markReviewsSeen, refreshFeed } = useGallery();
  const photoOf = useAuthorPhoto();
  const [tab, setTab] = useState(galleryView.tab || 'works');
  const [data, setData] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState({}); // { [id_work | 'new']: 0–100 }
  const [newTitle, setNewTitle] = useState('');
  const newFileRef = useRef(null);
  const [conversations, setConversations] = useState(null);
  const [openConversation, setOpenConversation] = useState(galleryView.conversationId || null);
  const auth = useCallback(() => ({ headers: { 'x-user-id': currentUser?.id_user } }), [currentUser?.id_user]);

  const apply = useCallback((d) => {
    setData(d);
    setTitle(d?.title || '');
    setStatement(d?.statement || '');
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isArtist) return;
    setLoadFailed(false);
    axiosInstance.get('/gallery/mine', auth())
      .then((res) => apply(res.data?.data))
      .catch((err) => {
        setLoadFailed(true);
        showError(err.response?.data?.error || t('gallery.mine.loadError', 'No se pudo cargar tu exposición'));
      });
  }, [isArtist, auth, apply, showError, t]);

  // Opening «Mi galería» = having seen the reviews.
  useEffect(() => { if (feed.reviews.length) markReviewsSeen(); }, [feed.reviews.length, markReviewsSeen]);

  const loadConversations = useCallback(() => {
    axiosInstance.get('/gallery/conversations', auth())
      .then((res) => setConversations(res.data?.data || []))
      .catch(() => setConversations([]));
  }, [auth]);
  useEffect(() => { if (tab === 'messages') loadConversations(); }, [tab, loadConversations, feed.messages]);

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

  const saveText = (e) => {
    e.preventDefault();
    run(() => axiosInstance.patch('/gallery/mine', { title, statement }, auth()));
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
    if (await sendImage('new', '/gallery/mine/works', 'post', file, { title: newTitle.trim() })) setNewTitle('');
  };

  const replace = (work, file) => { if (checkFile(file)) sendImage(work.id_work, `/gallery/mine/works/${work.id_work}`, 'patch', file, {}); };
  const saveTitle = (work, value) => run(() => axiosInstance.patch(`/gallery/mine/works/${work.id_work}`, { title: value }, auth()));
  const remove = (work) => {
    if (!window.confirm(t('gallery.mine.confirmDelete', { title: workTitle(work, t), defaultValue: '¿Quitar «{{title}}» de tu exposición? No se puede deshacer.' }))) return;
    run(() => axiosInstance.delete(`/gallery/mine/works/${work.id_work}`, auth()));
  };
  const move = (index, d) => {
    const ids = data.works.map((w) => w.id_work);
    [ids[index], ids[index + d]] = [ids[index + d], ids[index]];
    run(() => axiosInstance.patch('/gallery/mine/order', { ids }, auth()), { quiet: true });
  };

  const unread = useMemo(() => (conversations || []).reduce((n, c) => n + c.unread, 0), [conversations]);
  const feedUnread = feed.messages.reduce((n, c) => n + c.unread, 0);
  const hasPublished = data?.works?.some((w) => w.status_work === 'approved');

  if (!isArtist) {
    return (
      <div className="gallery-page">
        <button type="button" className="gallery-back" onClick={navigateToGallery}><ArrowLeft size={18} /> {t('gallery.back', 'Volver a la galería')}</button>
        <p className="gallery-page__empty">{t('gallery.mine.notArtist', 'Esta parte es para las y los artistas de la galería.')}</p>
      </div>
    );
  }

  const current = (conversations || []).find((c) => c.id_conversation === openConversation);

  return (
    <div className="gallery-page my-gallery">
      <button type="button" className="gallery-back" onClick={navigateToGallery}>
        <ArrowLeft size={18} aria-hidden="true" /> {t('gallery.back', 'Volver a la galería')}
      </button>
      <header className="gallery-page__header">
        <div>
          <h1>{t('gallery.mine.title', 'Mi galería')}</h1>
          <p className="gallery-page__subtitle">
            {t('gallery.mine.subtitle', 'Tu exposición en la Galería: un título, un texto breve y hasta siete obras.')}
          </p>
        </div>
        {hasPublished && (
          <div className="gallery-page__actions">
            <button type="button" className="gallery-btn" onClick={() => navigateToExhibition(data.id_exhibition)}>
              <Eye size={18} aria-hidden="true" /> {t('gallery.mine.view', 'Ver mi exposición')}
            </button>
          </div>
        )}
      </header>

      <nav className="gallery-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'works'} className={`gallery-tab ${tab === 'works' ? 'is-active' : ''}`} onClick={() => setTab('works')}>
          {t('gallery.mine.tabWorks', 'Mi exposición')}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'messages'} className={`gallery-tab ${tab === 'messages' ? 'is-active' : ''}`} onClick={() => setTab('messages')}>
          <MessageCircle size={16} aria-hidden="true" /> {t('gallery.mine.tabMessages', 'Mensajes')}
          {(conversations ? unread : feedUnread) > 0 && <span className="gallery-badge">{conversations ? unread : feedUnread}</span>}
        </button>
      </nav>

      {tab === 'works' && (!data ? (
        <p className="gallery-page__empty">
          {loadFailed ? t('gallery.mine.loadError', 'No se pudo cargar tu exposición') : t('common.states.loading', 'Cargando…')}
        </p>
      ) : (
        <>
          <form className="gallery-form" onSubmit={saveText}>
            <div className="gallery-form__field">
              <label htmlFor="exhibition-title">{t('gallery.mine.exhibitionTitle', 'Título de la exposición')}</label>
              <input id="exhibition-title" type="text" value={title} maxLength={TITLE_MAX}
                placeholder={currentUser?.name_user} onChange={(e) => setTitle(e.target.value)} />
              <p className="gallery-form__hint">{t('gallery.mine.exhibitionTitleHint', 'Si lo dejas vacío, se llamará como tú.')}</p>
            </div>
            <div className="gallery-form__field">
              <label htmlFor="exhibition-statement">{t('gallery.mine.statement', 'Texto de presentación')}</label>
              <textarea id="exhibition-statement" rows={5} value={statement} maxLength={STATEMENT_MAX}
                onChange={(e) => setStatement(e.target.value)} />
              <p className="gallery-form__hint">{statement.length}/{STATEMENT_MAX}</p>
            </div>
            <button type="submit" className="gallery-btn gallery-btn--primary" disabled={busy}>
              <Save size={16} aria-hidden="true" /> {t('gallery.mine.saveText', 'Guardar la exposición')}
            </button>
          </form>

          <section className="my-works">
            <h2>
              {t('gallery.mine.works', 'Obras')}
              <span className="my-works__count">{t('gallery.mine.worksCount', { count: data.works.length, max: data.works_max, defaultValue: '{{count}} de {{max}}' })}</span>
            </h2>
            <p className="gallery-form__hint">
              {t('gallery.mine.reviewNote', 'Cada obra nueva o cambiada pasa por la revisión del equipo antes de verse en la galería.')}
            </p>
            {data.works.length > 0 && (
              <ul className="my-works__list">
                {data.works.map((w, i) => (
                  <WorkRow key={w.id_work} work={w} index={i} total={data.works.length} busy={busy}
                    progress={uploads[w.id_work]} onSaveTitle={saveTitle} onReplace={replace} onMove={move} onDelete={remove} />
                ))}
              </ul>
            )}
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
                <p className="gallery-form__hint">{t('gallery.mine.fileHint', { max: IMAGE_MAX_MB, defaultValue: 'JPG, PNG, WebP, AVIF, GIF o TIFF, hasta {{max}} MB. Se guarda a su tamaño, en píxeles.' })}</p>
              </div>
            ) : (
              <p className="gallery-form__hint">{t('gallery.mine.full', { max: data.works_max, defaultValue: 'Tu exposición ya tiene {{max}} obras: quita una para subir otra.' })}</p>
            )}
          </section>
        </>
      ))}

      {tab === 'messages' && (
        <section className="my-messages">
          {conversations === null ? (
            <p className="gallery-page__empty">{t('common.states.loading', 'Cargando…')}</p>
          ) : conversations.length === 0 ? (
            <p className="gallery-page__empty">{t('gallery.mine.noMessages', 'Todavía no tienes mensajes. Cuando alguien te escriba desde tu exposición, aparecerá aquí.')}</p>
          ) : (
            <div className={`my-messages__layout ${current ? 'has-open' : ''}`}>
              <ul className="my-messages__list">
                {conversations.map((c) => (
                  <li key={c.id_conversation}>
                    <button type="button" className={`my-messages__item ${c.id_conversation === openConversation ? 'is-open' : ''}`}
                      onClick={() => setOpenConversation(c.id_conversation)}>
                      {photoOf(c.other)
                        ? <img src={photoOf(c.other)} alt="" className="gallery-artist__photo" />
                        : <span className="gallery-artist__photo gallery-artist__photo--initial" aria-hidden="true">{c.other?.name_user?.charAt(0)?.toUpperCase()}</span>}
                      <span className="my-messages__text">
                        <strong>{c.other?.name_user}</strong>
                        {c.last_message && <span className="my-messages__preview">{c.last_message.body}</span>}
                      </span>
                      <span className="my-messages__side">
                        {c.last_message_at && <span className="my-messages__when">{localDate(c.last_message_at, { day: 'numeric', month: 'short' })}</span>}
                        {c.unread > 0 && <span className="gallery-badge">{c.unread}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {current && (
                <div className="my-messages__chat">
                  <div className="my-messages__chat-head">
                    <button type="button" className="gallery-back gallery-back--inline" onClick={() => { setOpenConversation(null); loadConversations(); refreshFeed(); }}>
                      <ArrowLeft size={16} aria-hidden="true" /> {t('gallery.mine.allMessages', 'Todas las conversaciones')}
                    </button>
                    <strong>{current.other?.name_user}</strong>
                  </div>
                  <GalleryChat conversationId={current.id_conversation} other={current.other} />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default MyGallery;
