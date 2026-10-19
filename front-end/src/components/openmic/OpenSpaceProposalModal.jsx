// magazine-front/src/components/openmic/OpenSpaceProposalModal.jsx
//
// «Espacio abierto»: the form to send the magazine a literary proposal — a
// title, its kind, a short explanation and the text (pasted and/or as a
// file). Anyone signed in can send one; no subscription needed. The server
// checks the same limits (open_space_api_controller.js).
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Send, Paperclip, CheckCircle2 } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import { PROPOSAL_KINDS, PROPOSAL_LIMITS, PROPOSAL_FILE_ACCEPT, proposalKindLabel } from '../../utils/proposals';
import './OpenSpaceProposalModal.css';

const EXTENSIONS = PROPOSAL_FILE_ACCEPT.split(',');

// onSent(proposal): the proposal as the server saved it.
function OpenSpaceProposalModal({ onClose, onSent }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [form, setForm] = useState({ title: '', kind: '', summary: '', text: '', consent: false });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({}); // field → message ('form' for the rest)
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const titleRef = useRef(null);
  const fileRef = useRef(null);

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
      setErrors((er) => ({ ...er, file: t('openspace.form.fileType', 'Formato no admitido: usa PDF, DOC, DOCX, ODT, TXT o RTF.') }));
      return;
    }
    if (f.size > PROPOSAL_LIMITS.fileMb * 1024 * 1024) {
      setErrors((er) => ({ ...er, file: t('openspace.form.fileSize', { mb: PROPOSAL_LIMITS.fileMb, defaultValue: 'El archivo pesa demasiado (máximo {{mb}} MB).' }) }));
      return;
    }
    setFile(f);
  };

  const validate = () => {
    const e = {};
    const title = form.title.trim();
    const summary = form.summary.trim();
    if (!title) e.title = t('openspace.form.needTitle', 'Escribe el título.');
    if (!form.kind) e.kind = t('openspace.form.needKind', 'Elige qué tipo de texto es.');
    if (!summary) e.summary = t('openspace.form.needSummary', 'Cuéntanos brevemente de qué trata.');
    if (!form.text.trim() && !file) e.content = t('openspace.form.needContent', 'Pega el texto o adjunta un archivo.');
    if (!form.consent) e.consent = t('openspace.form.needConsent', 'Marca esta casilla para enviarla.');
    return e;
  };

  const FIELD_IDS = { title: 'proposal-title', kind: 'proposal-kind', summary: 'proposal-summary', content: 'proposal-text', consent: 'proposal-consent' };

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
    data.append('kind', form.kind);
    data.append('summary', form.summary.trim());
    data.append('text', form.text.trim());
    data.append('consent', 'true');
    if (file) data.append('file', file);
    setBusy(true);
    setErrors({});
    try {
      const res = await axiosInstance.post('/open-space/proposals', data, {
        headers: { 'x-user-id': currentUser?.id_user, 'Content-Type': 'multipart/form-data' }
      });
      setSent(res.data.data);
      onSent?.(res.data.data);
    } catch (err) {
      setErrors({ form: err.response?.data?.error || t('openspace.form.error', 'No se pudo enviar. Inténtalo de nuevo.') });
    } finally {
      setBusy(false);
    }
  };

  const counter = (value, max) => (
    <span className={`proposal-form__count ${value.length > max * 0.9 ? 'is-near' : ''}`}>
      {value.length}/{max}
    </span>
  );
  const errorOf = (field) => errors[field]
    ? <p className="proposal-form__error" id={`${FIELD_IDS[field] || field}-error`} role="alert">{errors[field]}</p>
    : null;

  return createPortal(
    <div className="proposal-overlay" onClick={() => !busy && onClose()}>
      <div
        className="proposal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
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
            <h2 id="proposal-modal-title">{t('openspace.form.sentTitle', '¡Gracias!')}</h2>
            <p>
              {t('openspace.form.sentText', {
                title: sent.title_proposal,
                defaultValue: 'Hemos recibido «{{title}}». El equipo de la revista lee todas las propuestas; puedes seguir su estado en esta página.'
              })}
            </p>
            <button type="button" className="proposal-modal__btn proposal-modal__btn--primary" onClick={onClose}>
              {t('common.buttons.close', 'Cerrar')}
            </button>
          </div>
        ) : (
          <>
            <h2 id="proposal-modal-title">{t('openspace.form.title', 'Envía tu propuesta')}</h2>
            <p className="proposal-modal__lead">
              {t('openspace.form.lead', 'Cuéntanos qué nos propones. Los campos con * son obligatorios.')}
            </p>

            <form className="proposal-form" onSubmit={submit} noValidate>
              <div className="proposal-form__field">
                <label htmlFor="proposal-title">{t('openspace.form.titleLabel', 'Título')} *</label>
                <input
                  ref={titleRef}
                  id="proposal-title"
                  type="text"
                  value={form.title}
                  maxLength={PROPOSAL_LIMITS.title}
                  aria-invalid={errors.title ? 'true' : 'false'}
                  aria-describedby={errors.title ? 'proposal-title-error' : undefined}
                  onChange={(e) => set('title', e.target.value)}
                />
                {counter(form.title, PROPOSAL_LIMITS.title)}
                {errorOf('title')}
              </div>

              <div className="proposal-form__field">
                <label htmlFor="proposal-kind">{t('openspace.form.kindLabel', 'Tipo de texto')} *</label>
                <select
                  id="proposal-kind"
                  value={form.kind}
                  aria-invalid={errors.kind ? 'true' : 'false'}
                  aria-describedby={errors.kind ? 'proposal-kind-error' : undefined}
                  className={!form.kind ? 'is-placeholder' : ''}
                  onChange={(e) => set('kind', e.target.value)}
                >
                  <option value="">{t('openspace.form.kindPick', 'Elige…')}</option>
                  {PROPOSAL_KINDS.map((k) => <option key={k} value={k}>{proposalKindLabel(k, t)}</option>)}
                </select>
                {errorOf('kind')}
              </div>

              <div className="proposal-form__field">
                <label htmlFor="proposal-summary">{t('openspace.form.summaryLabel', 'Explicación breve')} *</label>
                <p className="proposal-form__hint" id="proposal-summary-hint">
                  {t('openspace.form.summaryHint', 'De qué trata, cómo nació, por qué nos la envías… en pocas líneas.')}
                </p>
                <textarea
                  id="proposal-summary"
                  rows={4}
                  value={form.summary}
                  maxLength={PROPOSAL_LIMITS.summary}
                  aria-invalid={errors.summary ? 'true' : 'false'}
                  aria-describedby={`proposal-summary-hint${errors.summary ? ' proposal-summary-error' : ''}`}
                  onChange={(e) => set('summary', e.target.value)}
                />
                {counter(form.summary, PROPOSAL_LIMITS.summary)}
                {errorOf('summary')}
              </div>

              <fieldset className={`proposal-form__content ${errors.content ? 'has-error' : ''}`}>
                <legend>{t('openspace.form.contentLegend', 'Tu texto')} *</legend>
                <p className="proposal-form__hint">
                  {t('openspace.form.contentHint', 'Pégalo aquí, adjúntalo como archivo o las dos cosas.')}
                </p>
                <div className="proposal-form__field">
                  <label htmlFor="proposal-text" className="proposal-form__sublabel">{t('openspace.form.textLabel', 'Texto')}</label>
                  <textarea
                    id="proposal-text"
                    rows={8}
                    value={form.text}
                    maxLength={PROPOSAL_LIMITS.text}
                    aria-invalid={errors.content ? 'true' : 'false'}
                    aria-describedby={errors.content ? 'proposal-text-error' : undefined}
                    onChange={(e) => set('text', e.target.value)}
                  />
                </div>
                <div className="proposal-form__field">
                  <span className="proposal-form__sublabel">{t('openspace.form.fileLabel', 'Archivo')}</span>
                  <input
                    ref={fileRef}
                    id="proposal-file"
                    type="file"
                    accept={PROPOSAL_FILE_ACCEPT}
                    className="proposal-form__file-input"
                    onChange={pickFile}
                  />
                  {file ? (
                    <div className="proposal-form__file">
                      <Paperclip size={16} aria-hidden="true" />
                      <span className="proposal-form__file-name">{file.name}</span>
                      <button type="button" className="proposal-form__file-remove" onClick={() => setFile(null)}>
                        {t('openspace.form.fileRemove', 'Quitar')}
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="proposal-file" className="proposal-form__file-pick">
                      <Paperclip size={16} aria-hidden="true" />
                      {t('openspace.form.filePick', 'Adjuntar un archivo')}
                    </label>
                  )}
                  <p className="proposal-form__hint">
                    {t('openspace.form.fileHint', { mb: PROPOSAL_LIMITS.fileMb, defaultValue: 'PDF, Word, ODT, TXT o RTF, hasta {{mb}} MB.' })}
                  </p>
                  {errors.file && <p className="proposal-form__error" role="alert">{errors.file}</p>}
                </div>
                {errors.content && <p className="proposal-form__error" id="proposal-text-error" role="alert">{errors.content}</p>}
              </fieldset>

              <div className="proposal-form__consent">
                <input
                  id="proposal-consent"
                  type="checkbox"
                  checked={form.consent}
                  aria-invalid={errors.consent ? 'true' : 'false'}
                  aria-describedby={errors.consent ? 'proposal-consent-error' : undefined}
                  onChange={(e) => set('consent', e.target.checked)}
                />
                <label htmlFor="proposal-consent">
                  {t('openspace.form.consent', 'El texto es mío y acepto que el equipo de la revista lo lea para valorar su publicación.')}
                </label>
              </div>
              {errorOf('consent')}

              {currentUser?.email_user && (
                <p className="proposal-form__note">
                  {t('openspace.form.replyTo', { email: currentUser.email_user, defaultValue: 'Si la seleccionamos, te escribiremos al email de tu cuenta: {{email}}.' })}
                </p>
              )}

              {errors.form && <p className="proposal-form__error proposal-form__error--box" role="alert">{errors.form}</p>}

              <div className="proposal-modal__actions">
                <button type="submit" className="proposal-modal__btn proposal-modal__btn--primary" disabled={busy}>
                  <Send size={18} aria-hidden="true" />
                  {busy ? t('openspace.form.sending', 'Enviando…') : t('openspace.form.submit', 'Enviar propuesta')}
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

export default OpenSpaceProposalModal;
