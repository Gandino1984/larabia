// magazine-front/src/components/gallery/MyGallery.jsx
//
// «Mi galería», for visual artists: their exhibition — its title (none: their
// name) and short text — organised in obras (up to 5; "pieces" in the API),
// each with its title and up to 10 illustrations ("works"): an image (kept
// as WebP), a title (none: «Sin título»), a description (up to 300
// characters) and its size in pixels, read from the file. Super admins have
// no limits (pieces_max / piece_works_max come back null).
// Top to bottom: the texts, «Nueva obra», the obras (each with its
// illustrations and its own upload box), «Guardar la exposición» (the texts
// and any title or description left unsaved) and the count. Every new or
// changed illustration goes to the team's review before it shows in the
// gallery (moving it to another obra doesn't); each one says where it stands.
// «Mis charlas»: the magazine's chat (ChatPanel).
// With galleryView.forUser, a super admin prepares the gallery of someone
// invited, on their behalf (/gallery/for/:id): no review, no limits, not
// public until that person accepts it and takes it over.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Upload, Save, Eye, MessagesSquare, ImagePlus, RefreshCw, FolderPlus } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useGallery } from '../../app_context/GalleryContext';
import { useChat } from '../../app_context/ChatContext';
import { workImageUrl, workTitle, workSize, pieceTitle } from './galleryUtils';
import './Gallery.css';

const TITLE_MAX = 120;
const STATEMENT_MAX = 1000;
const WORK_TITLE_MAX = 150;
const DESCRIPTION_MAX = 300;
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

// One illustration: its texts (saved with «Guardar» or the bottom button),
// order within the obra, image, obra it belongs to, removal.
function WorkRow({ work, index, total, pieces, busy, onBehalf, onSave, onDraft, onReplace, onOrder, onMoveTo, onDelete, progress }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(work.title_work || '');
  const [description, setDescription] = useState(work.description_work || '');
  useEffect(() => { setTitle(work.title_work || ''); }, [work.title_work]);
  useEffect(() => { setDescription(work.description_work || ''); }, [work.description_work]);
  const fileRef = useRef(null);
  const changed = title.trim() !== (work.title_work || '') || description.trim() !== (work.description_work || '');
  const draft = (next) => onDraft(work.id_work, { title, description, ...next });
  const others = pieces.filter((p) => p.id_piece !== work.piece_id);

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
        <form className="my-work__texts" onSubmit={(e) => { e.preventDefault(); if (changed) onSave(work, { title, description }); }}>
          <label htmlFor={`work-title-${work.id_work}`}>{t('gallery.mine.workTitle', 'Título')}</label>
          <input
            id={`work-title-${work.id_work}`}
            type="text"
            value={title}
            maxLength={WORK_TITLE_MAX}
            placeholder={t('gallery.untitled', 'Sin título')}
            onChange={(e) => { setTitle(e.target.value); draft({ title: e.target.value }); }}
          />
          <label htmlFor={`work-description-${work.id_work}`}>{t('gallery.mine.workDescription', 'Descripción')}</label>
          <textarea
            id={`work-description-${work.id_work}`}
            rows={3}
            value={description}
            maxLength={DESCRIPTION_MAX}
            onChange={(e) => { setDescription(e.target.value); draft({ description: e.target.value }); }}
          />
          <div className="my-work__texts-foot">
            <span className="gallery-form__hint">{description.length}/{DESCRIPTION_MAX}</span>
            <button type="submit" className="gallery-btn gallery-btn--small" disabled={!changed || busy}>
              <Save size={15} aria-hidden="true" /> {t('common.buttons.save', 'Guardar')}
            </button>
          </div>
        </form>
        <div className="my-work__actions">
          <button type="button" className="gallery-icon-btn" onClick={() => onOrder(index, -1)} disabled={index === 0 || busy} aria-label={t('gallery.mine.moveUp', 'Subir')} title={t('gallery.mine.moveUp', 'Subir')}><ArrowUp size={16} /></button>
          <button type="button" className="gallery-icon-btn" onClick={() => onOrder(index, 1)} disabled={index === total - 1 || busy} aria-label={t('gallery.mine.moveDown', 'Bajar')} title={t('gallery.mine.moveDown', 'Bajar')}><ArrowDown size={16} /></button>
          <button type="button" className="gallery-btn gallery-btn--small" onClick={() => fileRef.current?.click()} disabled={busy}>
            <RefreshCw size={15} aria-hidden="true" /> {t('gallery.mine.replace', 'Cambiar imagen')}
          </button>
          <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(',')} className="gallery-sr" tabIndex={-1}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onReplace(work, f); }} />
          {others.length > 0 && (
            <label className="my-work__move">
              <span className="gallery-sr">{t('gallery.mine.moveTo', 'Mover a otra obra')}</span>
              <select value="" disabled={busy} onChange={(e) => { if (e.target.value) onMoveTo(work, Number(e.target.value)); }}>
                <option value="">{t('gallery.mine.moveTo', 'Mover a otra obra')}…</option>
                {others.map((p) => <option key={p.id_piece} value={p.id_piece}>{pieceTitle(p, t)}</option>)}
              </select>
            </label>
          )}
          <button type="button" className="gallery-btn gallery-btn--small gallery-btn--danger" onClick={() => onDelete(work)} disabled={busy}>
            <Trash2 size={15} aria-hidden="true" /> {t('gallery.mine.delete', 'Quitar')}
          </button>
        </div>
      </div>
    </li>
  );
}

// An obra's upload box: a title and a description (optional), then the image.
function NewWorkBox({ piece, busy, progress, onBehalf, onUpload }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const fileRef = useRef(null);
  const id = `new-work-${piece.id_piece}`;
  const pick = async (file) => {
    if (await onUpload(piece, file, { title: title.trim(), description: description.trim() })) {
      setTitle('');
      setDescription('');
    }
  };
  return (
    <div className="my-work-new">
      <div className="gallery-form__field">
        <label htmlFor={`${id}-title`}>{t('gallery.mine.newTitle', 'Título de la nueva ilustración (opcional)')}</label>
        <input id={`${id}-title`} type="text" value={title} maxLength={WORK_TITLE_MAX}
          placeholder={t('gallery.untitled', 'Sin título')} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="gallery-form__field">
        <label htmlFor={`${id}-description`}>{t('gallery.mine.newDescription', 'Descripción (opcional)')}</label>
        <textarea id={`${id}-description`} rows={2} value={description} maxLength={DESCRIPTION_MAX}
          onChange={(e) => setDescription(e.target.value)} />
        <p className="gallery-form__hint">{description.length}/{DESCRIPTION_MAX}</p>
      </div>
      <button type="button" className="gallery-btn gallery-btn--primary" onClick={() => fileRef.current?.click()} disabled={busy}>
        {progress != null
          ? <><Upload size={16} aria-hidden="true" /> {progress < 100 ? `${progress}%` : t('hscroll.editor.processingImage', 'Procesando…')}</>
          : <><ImagePlus size={16} aria-hidden="true" /> {t('gallery.mine.add', 'Subir una ilustración')}</>}
      </button>
      <input ref={fileRef} type="file" accept={IMAGE_TYPES.join(',')} className="gallery-sr" tabIndex={-1}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f); }} />
      <p className="gallery-form__hint">{t('gallery.mine.fileHint', { max: IMAGE_MAX_MB, defaultValue: 'JPG, PNG, WebP, AVIF, GIF o TIFF, hasta {{max}} MB. Se guarda en formato WebP, a su tamaño en píxeles.' })}</p>
      <p className="gallery-form__hint">
        {onBehalf
          ? t('gallery.forUser.reviewNote', 'Las ilustraciones que subes tú no pasan por revisión.')
          : t('gallery.mine.reviewNote', 'Cada ilustración nueva o cambiada pasa por la revisión del equipo antes de verse en la galería.')}
      </p>
    </div>
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
  const [uploads, setUploads] = useState({}); // { [id_work | 'new-<id_piece>']: 0–100 }
  const [newPieceTitle, setNewPieceTitle] = useState('');
  // Titles / descriptions typed but not saved: { [id]: … }.
  const pieceDrafts = useRef({});
  const workDrafts = useRef({});
  const auth = useCallback(() => ({ headers: { 'x-user-id': currentUser?.id_user } }), [currentUser?.id_user]);

  // texts: also take the exhibition's title and text (on loading and saving
  // them) — not after an obra or an illustration changes, which would drop
  // what's being typed.
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

  const pieces = data?.pieces || [];
  const works = pieces.flatMap((p) => p.works);

  // «Guardar la exposición»: the texts, and the obra titles and illustration
  // titles / descriptions typed but not saved.
  const saveAll = async (e) => {
    e.preventDefault();
    const piecesToSave = pieces.filter((p) => {
      const d = pieceDrafts.current[p.id_piece];
      return d != null && d.trim() !== (p.title_piece || '');
    });
    const worksToSave = works.filter((w) => {
      const d = workDrafts.current[w.id_work];
      return d && (d.title.trim() !== (w.title_work || '') || d.description.trim() !== (w.description_work || ''));
    });
    setBusy(true);
    try {
      let res = await axiosInstance.patch(base, { title, statement }, auth());
      apply(res.data?.data, { texts: true });
      for (const p of piecesToSave) {
        res = await axiosInstance.patch(`${base}/pieces/${p.id_piece}`, { title: pieceDrafts.current[p.id_piece] }, auth());
        apply(res.data?.data);
      }
      for (const w of worksToSave) {
        res = await axiosInstance.patch(`${base}/works/${w.id_work}`, workDrafts.current[w.id_work], auth());
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
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    form.append('image', file);
    setUploads((u) => ({ ...u, [key]: 0 }));
    const ok = await run(() => axiosInstance({
      url, method, data: form,
      headers: { ...auth().headers, 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => { if (e.total) setUploads((u) => ({ ...u, [key]: Math.round((e.loaded / e.total) * 100) })); }
    }));
    setUploads((u) => { const n = { ...u }; delete n[key]; return n; });
    return ok;
  };

  // --- obras ---
  const addPiece = async () => {
    if (await run(() => axiosInstance.post(`${base}/pieces`, { title: newPieceTitle.trim() }, auth()))) setNewPieceTitle('');
  };
  const savePieceTitle = (piece, value) => run(() => axiosInstance.patch(`${base}/pieces/${piece.id_piece}`, { title: value }, auth()));
  const removePiece = (piece) => {
    if (!window.confirm(t('gallery.mine.confirmDeletePiece', { title: pieceTitle(piece, t), count: piece.works.length, defaultValue: '¿Quitar la obra «{{title}}» y sus {{count}} ilustraciones? No se puede deshacer.' }))) return;
    run(() => axiosInstance.delete(`${base}/pieces/${piece.id_piece}`, auth()));
  };
  const orderPieces = (index, d) => {
    const ids = pieces.map((p) => p.id_piece);
    [ids[index], ids[index + d]] = [ids[index + d], ids[index]];
    run(() => axiosInstance.patch(`${base}/pieces/order`, { ids }, auth()), { quiet: true });
  };

  // --- illustrations ---
  const addWork = async (piece, file, fields) => {
    if (!checkFile(file)) return false;
    return sendImage(`new-${piece.id_piece}`, `${base}/works`, 'post', file, { piece_id: piece.id_piece, ...fields });
  };
  const replace = (work, file) => { if (checkFile(file)) sendImage(work.id_work, `${base}/works/${work.id_work}`, 'patch', file, {}); };
  const saveWork = (work, texts) => run(() => axiosInstance.patch(`${base}/works/${work.id_work}`, texts, auth()));
  const moveTo = (work, pieceId) => run(() => axiosInstance.patch(`${base}/works/${work.id_work}`, { piece_id: pieceId }, auth()));
  const removeWork = (work) => {
    if (!window.confirm(t('gallery.mine.confirmDelete', { title: workTitle(work, t), defaultValue: '¿Quitar «{{title}}» de tu exposición? No se puede deshacer.' }))) return;
    run(() => axiosInstance.delete(`${base}/works/${work.id_work}`, auth()));
  };
  const orderWorks = (piece, index, d) => {
    const ids = piece.works.map((w) => w.id_work);
    [ids[index], ids[index + d]] = [ids[index + d], ids[index]];
    run(() => axiosInstance.patch(`${base}/pieces/${piece.id_piece}/order`, { ids }, auth()), { quiet: true });
  };

  const hasPublished = !forUser && works.some((w) => w.status_work === 'approved');
  const artistName = forUser?.name_user || data?.artist?.name_user || '';
  // null: no limit (super admins).
  const piecesMax = data?.pieces_max ?? null;
  const worksMax = data?.piece_works_max ?? null;
  const unlimited = piecesMax === null;

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
              ? t('gallery.forUser.subtitle', 'La preparas en su nombre: un título, un texto breve y sus obras, cada una con sus ilustraciones. Sin límites y sin revisión.')
              : unlimited && data
                ? t('gallery.mine.subtitleUnlimited', 'Tu exposición en la Galería: un título, un texto breve y tus obras, cada una con sus ilustraciones. Como super admin, sin límite de obras ni de ilustraciones.')
                : t('gallery.mine.subtitle', 'Tu exposición en la Galería: un título, un texto breve y hasta cinco obras, cada una con hasta diez ilustraciones.')}
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

          {unlimited || pieces.length < piecesMax ? (
            <div className="my-piece-new">
              <div className="gallery-form__field">
                <label htmlFor="new-piece-title">{t('gallery.mine.newPieceTitle', 'Título de la nueva obra (opcional)')}</label>
                <input id="new-piece-title" type="text" value={newPieceTitle} maxLength={WORK_TITLE_MAX}
                  placeholder={t('gallery.untitled', 'Sin título')} onChange={(e) => setNewPieceTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPiece(); } }} />
              </div>
              <button type="button" className="gallery-btn gallery-btn--primary" onClick={addPiece} disabled={busy}>
                <FolderPlus size={16} aria-hidden="true" /> {t('gallery.mine.addPiece', 'Crear la obra')}
              </button>
              <p className="gallery-form__hint">
                {unlimited
                  ? t('gallery.mine.pieceHintUnlimited', 'Cada obra reúne sus ilustraciones: un título y una descripción cada una.')
                  : t('gallery.mine.pieceHint', { max: worksMax, defaultValue: 'Cada obra reúne hasta {{max}} ilustraciones, con un título y una descripción cada una.' })}
              </p>
            </div>
          ) : (
            <p className="my-piece-new my-piece-new--full">{t('gallery.mine.full', { max: piecesMax, defaultValue: 'Tu exposición ya tiene {{max}} obras: quita una para crear otra.' })}</p>
          )}

          <section className="my-works">
            {pieces.length > 0 && <h2>{t('gallery.mine.works', 'Obras')}</h2>}
            <ol className="my-pieces">
              {pieces.map((piece, pi) => (
                <PieceCard
                  key={piece.id_piece}
                  piece={piece}
                  index={pi}
                  total={pieces.length}
                  pieces={pieces}
                  busy={busy}
                  onBehalf={!!forUser}
                  worksMax={worksMax}
                  uploads={uploads}
                  onSaveTitle={savePieceTitle}
                  onDraftTitle={(id, value) => { pieceDrafts.current[id] = value; }}
                  onOrder={orderPieces}
                  onRemove={removePiece}
                  workHandlers={{
                    onSave: saveWork,
                    onDraft: (id, texts) => { workDrafts.current[id] = texts; },
                    onReplace: replace,
                    onOrder: (index, d) => orderWorks(piece, index, d),
                    onMoveTo: moveTo,
                    onDelete: removeWork
                  }}
                  onUpload={addWork}
                />
              ))}
            </ol>
            <button type="submit" form="exhibition-form" className="gallery-btn gallery-btn--primary my-works__save" disabled={busy}>
              <Save size={16} aria-hidden="true" /> {t('gallery.mine.saveText', 'Guardar la exposición')}
            </button>
            <p className="my-works__count">
              {unlimited
                ? t('gallery.mine.countUnlimited', { pieces: pieces.length, works: works.length, defaultValue: 'Obras: {{pieces}} · Ilustraciones: {{works}}' })
                : t('gallery.mine.count', { pieces: pieces.length, max: piecesMax, works: works.length, defaultValue: 'Obras: {{pieces}} de {{max}} · Ilustraciones: {{works}}' })}
            </p>
          </section>
        </>
      )}
    </div>
  );
}

// An obra: its title, its place, its illustrations and their upload box.
function PieceCard({ piece, index, total, pieces, busy, onBehalf, worksMax, uploads, onSaveTitle, onDraftTitle, onOrder, onRemove, workHandlers, onUpload }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(piece.title_piece || '');
  useEffect(() => { setTitle(piece.title_piece || ''); }, [piece.title_piece]);
  const changed = title.trim() !== (piece.title_piece || '');
  const full = worksMax !== null && piece.works.length >= worksMax;

  return (
    <li className="my-piece">
      <div className="my-piece__head">
        <span className="my-piece__number">{t('gallery.mine.pieceNumber', { n: index + 1, defaultValue: 'Obra {{n}}' })}</span>
        <div className="my-piece__head-actions">
          <button type="button" className="gallery-icon-btn" onClick={() => onOrder(index, -1)} disabled={index === 0 || busy} aria-label={t('gallery.mine.pieceUp', 'Subir la obra')} title={t('gallery.mine.pieceUp', 'Subir la obra')}><ArrowUp size={16} /></button>
          <button type="button" className="gallery-icon-btn" onClick={() => onOrder(index, 1)} disabled={index === total - 1 || busy} aria-label={t('gallery.mine.pieceDown', 'Bajar la obra')} title={t('gallery.mine.pieceDown', 'Bajar la obra')}><ArrowDown size={16} /></button>
          <button type="button" className="gallery-btn gallery-btn--small gallery-btn--danger" onClick={() => onRemove(piece)} disabled={busy}>
            <Trash2 size={15} aria-hidden="true" /> {t('gallery.mine.deletePiece', 'Quitar la obra')}
          </button>
        </div>
      </div>
      <form className="my-piece__title" onSubmit={(e) => { e.preventDefault(); if (changed) onSaveTitle(piece, title); }}>
        <label htmlFor={`piece-title-${piece.id_piece}`}>{t('gallery.mine.pieceTitle', 'Título de la obra')}</label>
        <div className="my-work__title-row">
          <input
            id={`piece-title-${piece.id_piece}`}
            type="text"
            value={title}
            maxLength={WORK_TITLE_MAX}
            placeholder={t('gallery.untitled', 'Sin título')}
            onChange={(e) => { setTitle(e.target.value); onDraftTitle(piece.id_piece, e.target.value); }}
          />
          <button type="submit" className="gallery-btn gallery-btn--small" disabled={!changed || busy}>
            <Save size={15} aria-hidden="true" /> {t('common.buttons.save', 'Guardar')}
          </button>
        </div>
      </form>

      {piece.works.length > 0 && (
        <ul className="my-works__list">
          {piece.works.map((w, i) => (
            <WorkRow key={w.id_work} work={w} index={i} total={piece.works.length} pieces={pieces} busy={busy}
              onBehalf={onBehalf} progress={uploads[w.id_work]} {...workHandlers} />
          ))}
        </ul>
      )}

      {full
        ? <p className="my-work-new--full">{t('gallery.mine.pieceFull', { max: worksMax, defaultValue: 'Esta obra ya tiene {{max}} ilustraciones: quita una para subir otra.' })}</p>
        : <NewWorkBox piece={piece} busy={busy} progress={uploads[`new-${piece.id_piece}`]} onBehalf={onBehalf} onUpload={onUpload} />}

      <p className="my-piece__count">
        {worksMax === null
          ? t('gallery.mine.pieceCountUnlimited', { count: piece.works.length, defaultValue: 'Ilustraciones: {{count}}' })
          : t('gallery.mine.pieceCount', { count: piece.works.length, max: worksMax, defaultValue: 'Ilustraciones: {{count}} de {{max}}' })}
      </p>
    </li>
  );
}

export default MyGallery;
