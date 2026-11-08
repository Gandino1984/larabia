// magazine-front/src/components/workshops/ContestEntryModal.jsx
//
// A contest's entry form: the contestant sends their work while sign-ups are
// open — its title, a short note and the work, pasted and/or as a file
// (texts or images, up to 10 MB). Sending it signs them up. With `entry`
// (theirs, already sent) it changes it: the file stays unless they remove or
// replace it. Same look as Espacio abierto's proposal form. The server
// checks the same limits (contest_entry_api_controller.js).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Send, Paperclip, CheckCircle2 } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import { ENTRY_LIMITS, ENTRY_FILE_ACCEPT } from '../../utils/contestEntries';
import '../openmic/OpenSpaceProposalModal.css';

const EXTENSIONS = ENTRY_FILE_ACCEPT.split(',');

// onSent(entry): the entry as the server saved it.
function ContestEntryModal({ contest, entry = null, onClose, onSent }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    title: entry?.title_entry || '',
    note: entry?.note_entry || '',
    text: entry?.text_entry || '',
    consent: !!entry
  });
  // Changing a work already sent, or sending it — as it was when the form
  // opened (once sent, the page reloads and `entry` arrives).
  const [editing] = useState(!!entry);
  const [file, setFile] = useState(null);
  const [keepFile, setKeepFile] = useState(!!entry?.has_file);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, busy]);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined, form: undefined, ...(field === 'text' ? { content: undefined } : {}) }));
  };

  const pickFile = (e) => {
    const f = e.target.files?.[0] || null;
    e.target.value = '';
    setErrors((er) => ({ ...er, file: undefined, content: undefined, form: undefined }));
    if (!f) return;
    const ext = `.${f.name.split('.').pop()}`.toLowerCase();
    if (!EXTENSIONS.includes(ext)) {
      setErrors((er) => ({ ...er, file: t('contests.entry.fileType', 'Formato no admitido: usa PDF, DOC, DOCX, ODT, TXT, RTF, JPG, PNG o WEBP.') }));
      return;
    }
    if (f.size > ENTRY_LIMITS.fileMb * 1024 * 1024) {
      setErrors((er) => ({ ...er, file: t('contests.entry.fileSize', { mb: ENTRY_LIMITS.fileMb, defaultValue: 'El archivo pesa demasiado (máximo {{mb}} MB).' }) }));
      return;
    }
    setFile(f);
    setKeepFile(false);
  };

  const FIELD_IDS = { title: 'entry-title', content: 'entry-text', consent: 'entry-consent' };
  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = t('contests.entry.needTitle', 'Escribe el título de tu obra.');
    if (!form.text.trim() && !file && !keepFile) e.content = t('contests.entry.needContent', 'Pega el texto de tu obra o adjunta un archivo.');
    if (!form.consent) e.consent = t('contests.entry.needConsent', 'Marca esta casilla para enviarla.');
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      const first = Object.keys(FIELD_IDS).find((k) => e[k]);
      document.getElementById(FIELD_IDS[first])?.focus();
      return;
    }
    const data = new FormData();
    data.append('title', form.title.trim());
    data.append('note', form.note.trim());
    data.append('text', form.text.trim());
    if (file) data.append('file', file);
    else if (entry?.has_file && !keepFile) data.append('remove_file', 'true');
    setBusy(true);
    setErrors({});
    try {
      const res = await axiosInstance.post(`/magazine-workshop/contests/${contest.id_workshop}/entry`, data, {
        headers: { 'x-user-id': currentUser?.id_user, 'Content-Type': 'multipart/form-data' }
      });
      setSent(res.data.data);
      onSent?.(res.data.data);
    } catch (err) {
      setErrors({ form: err.response?.data?.error || t('contests.entry.error', 'No se pudo enviar. Inténtalo de nuevo.') });
    } finally {
      setBusy(false);
    }
  };

  const counter = (value, max) => (
    <span className={`proposal-form__count ${value.length > max * 0.9 ? 'is-near' : ''}`}>{value.length}/{max}</span>
  );
  const errorOf = (field) => (errors[field]
    ? <p className="proposal-form__error" id={`${FIELD_IDS[field] || field}-error`} role="alert">{errors[field]}</p>
    : null);

  return createPortal(
    <div className="proposal-overlay" onClick={() => !busy && onClose()}>
      <div className="proposal-modal" role="dialog" aria-modal="true" aria-labelledby="entry-modal-title" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="proposal-modal__close"
          onClick={onClose}
          disabled={busy}
          title={t('common.buttons.close', 'Cerrar')}
          aria-label={t('common.buttons.close', 'Cerrar')}
        >
          <X size={22} />
        </button>

        {sent ? (
          <div className="proposal-modal__done" role="status">
            <CheckCircle2 size={44} aria-hidden="true" />
            <h2 id="entry-modal-title">{t('contests.entry.sentTitle', '¡Gracias!')}</h2>
            <p>
              {editing
                ? t('contests.entry.updatedText', { title: sent.title_entry, defaultValue: 'Hemos guardado los cambios de «{{title}}».' })
                : t('contests.entry.sentText', { title: sent.title_entry, contest: contest.title_workshop, defaultValue: 'Hemos recibido «{{title}}»: ya participas en «{{contest}}». Puedes cambiarla o retirarla hasta que se cierren las inscripciones.' })}
            </p>
            <button type="button" className="proposal-modal__btn proposal-modal__btn--primary" onClick={onClose}>
              {t('common.buttons.close', 'Cerrar')}
            </button>
          </div>
        ) : (
          <>
            <h2 id="entry-modal-title">{editing ? t('contests.entry.editTitle', 'Cambiar tu obra') : t('contests.entry.title', 'Envía tu obra')}</h2>
            <p className="proposal-modal__lead">
              {t('contests.entry.lead', { contest: contest.title_workshop, defaultValue: 'Para participar en «{{contest}}». Lee antes sus bases. Los campos con * son obligatorios.' })}
            </p>

            <form className="proposal-form" onSubmit={submit} noValidate>
              <div className="proposal-form__field">
                <label htmlFor="entry-title">{t('contests.entry.titleLabel', 'Título de la obra')} *</label>
                <input
                  ref={titleRef}
                  id="entry-title"
                  type="text"
                  value={form.title}
                  maxLength={ENTRY_LIMITS.title}
                  aria-invalid={errors.title ? 'true' : 'false'}
                  aria-describedby={errors.title ? 'entry-title-error' : undefined}
                  onChange={(e) => set('title', e.target.value)}
                />
                {counter(form.title, ENTRY_LIMITS.title)}
                {errorOf('title')}
              </div>

              <div className="proposal-form__field">
                <label htmlFor="entry-note">{t('contests.entry.noteLabel', 'Nota (opcional)')}</label>
                <p className="proposal-form__hint" id="entry-note-hint">
                  {t('contests.entry.noteHint', 'Unas líneas sobre tu obra, si quieres.')}
                </p>
                <textarea
                  id="entry-note"
                  rows={3}
                  value={form.note}
                  maxLength={ENTRY_LIMITS.note}
                  aria-describedby="entry-note-hint"
                  onChange={(e) => set('note', e.target.value)}
                />
                {counter(form.note, ENTRY_LIMITS.note)}
              </div>

              <fieldset className={`proposal-form__content ${errors.content ? 'has-error' : ''}`}>
                <legend>{t('contests.entry.contentLegend', 'Tu obra')} *</legend>
                <p className="proposal-form__hint">
                  {t('contests.entry.contentHint', 'Pégala aquí, adjúntala como archivo o las dos cosas.')}
                </p>
                <div className="proposal-form__field">
                  <label htmlFor="entry-text" className="proposal-form__sublabel">{t('openspace.form.textLabel', 'Texto')}</label>
                  <textarea
                    id="entry-text"
                    rows={7}
                    value={form.text}
                    maxLength={ENTRY_LIMITS.text}
                    aria-invalid={errors.content ? 'true' : 'false'}
                    aria-describedby={errors.content ? 'entry-text-error' : undefined}
                    onChange={(e) => set('text', e.target.value)}
                  />
                </div>
                <div className="proposal-form__field">
                  <span className="proposal-form__sublabel">{t('openspace.form.fileLabel', 'Archivo')}</span>
                  <input id="entry-file" type="file" accept={ENTRY_FILE_ACCEPT} className="proposal-form__file-input" onChange={pickFile} />
                  {file || keepFile ? (
                    <div className="proposal-form__file">
                      <Paperclip size={16} aria-hidden="true" />
                      <span className="proposal-form__file-name">{file ? file.name : entry?.file_name_entry}</span>
                      <button type="button" className="proposal-form__file-remove" onClick={() => { setFile(null); setKeepFile(false); }}>
                        {t('openspace.form.fileRemove', 'Quitar')}
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="entry-file" className="proposal-form__file-pick">
                      <Paperclip size={16} aria-hidden="true" />
                      {t('openspace.form.filePick', 'Adjuntar un archivo')}
                    </label>
                  )}
                  <p className="proposal-form__hint">
                    {t('contests.entry.fileHint', { mb: ENTRY_LIMITS.fileMb, defaultValue: 'PDF, Word, ODT, TXT, RTF o una imagen (JPG, PNG, WEBP), hasta {{mb}} MB.' })}
                  </p>
                  {errors.file && <p className="proposal-form__error" role="alert">{errors.file}</p>}
                </div>
                {errors.content && <p className="proposal-form__error" id="entry-text-error" role="alert">{errors.content}</p>}
              </fieldset>

              <div className="proposal-form__consent">
                <input
                  id="entry-consent"
                  type="checkbox"
                  checked={form.consent}
                  aria-invalid={errors.consent ? 'true' : 'false'}
                  aria-describedby={errors.consent ? 'entry-consent-error' : undefined}
                  onChange={(e) => set('consent', e.target.checked)}
                />
                <label htmlFor="entry-consent">
                  {t('contests.entry.consent', 'La obra es mía y acepto las bases del concurso.')}
                </label>
              </div>
              {errorOf('consent')}

              {currentUser?.email_user && (
                <p className="proposal-form__note">
                  {t('contests.entry.replyTo', { email: currentUser.email_user, defaultValue: 'Si hace falta, te escribiremos al email de tu cuenta: {{email}}.' })}
                </p>
              )}

              {errors.form && <p className="proposal-form__error proposal-form__error--box" role="alert">{errors.form}</p>}

              <div className="proposal-modal__actions">
                <button type="submit" className="proposal-modal__btn proposal-modal__btn--primary" disabled={busy}>
                  <Send size={18} aria-hidden="true" />
                  {busy
                    ? t('openspace.form.sending', 'Enviando…')
                    : editing ? t('contests.entry.save', 'Guardar los cambios') : t('contests.entry.submit', 'Enviar mi obra')}
                </button>
                <button type="button" className="proposal-modal__btn" onClick={onClose} disabled={busy}>
                  {t('common.buttons.cancel', 'Cancelar')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default ContestEntryModal;
