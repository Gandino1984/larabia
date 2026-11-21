// magazine-front/src/components/workshops/ContestEntriesPanel.jsx
//
// A convocatoria's works, for its managers (its organisers on the team and
// the super admins): each one's title, author, date and note, its pasted
// text (folded), its file to download — and its review. Super admins accept
// a work (a draft article is made from it in the call's section, with its
// author: «Abrir el borrador» opens it in the editor to finish and publish
// it) or decline it (with an optional reason its author sees). Only they see
// the panel (the server checks).
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Paperclip, ChevronDown, Check, X, FilePen, ExternalLink } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { localDate, serverDate } from '../../utils/locale';
import { downloadEntryFile } from '../../utils/contestEntries';

/** Where a work's review stands: 'sent' | 'accepted' (draft) | 'published' | 'declined'. */
const reviewOf = (e) => (e.status_entry === 'accepted' && e.article?.status_article === 'published' ? 'published' : e.status_entry || 'sent');

function ContestEntriesPanel({ contest, onChange }) {
  const { t } = useTranslation();
  const { currentUser, isSuperAdmin } = useAuth();
  const { showError, showSuccess, navigateToEditorForEdit, navigateToArticle } = useUI();
  const { fetchArticleById } = useMagazine();
  const [entries, setEntries] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const userId = currentUser?.id_user;
  const headers = { 'x-user-id': userId };

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/magazine-workshop/contests/${contest.id_workshop}/entries`, { headers: { 'x-user-id': userId } });
      setEntries(res.data.data || []);
    } catch (err) {
      setEntries([]);
      showError(err.response?.data?.error || t('contests.entries.loadError', 'No se pudieron cargar las obras'));
    }
  }, [contest.id_workshop, userId, showError, t]);
  useEffect(() => { load(); }, [load]);

  const download = async (entry) => {
    try {
      await downloadEntryFile(contest.id_workshop, entry, userId);
    } catch {
      showError(t('openspace.mine.downloadError', 'No se pudo descargar el archivo'));
    }
  };

  // The answer replaces the entry (its user stays: the answer doesn't carry it).
  const review = async (entry, action, body = {}) => {
    setBusyId(entry.id_entry);
    try {
      const res = await axiosInstance.post(`/magazine-workshop/contests/${contest.id_workshop}/entries/${entry.id_entry}/${action}`, body, { headers });
      setEntries((list) => list.map((e) => (e.id_entry === entry.id_entry ? { ...e, ...res.data.data, user: e.user } : e)));
      showSuccess(res.data.success);
      onChange?.();
      return res.data.data;
    } catch (err) {
      showError(err.response?.data?.error || t('calls.review.error', 'No se pudo guardar la revisión'));
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const openDraft = async (articleId) => {
    const r = await fetchArticleById(articleId);
    if (r?.success) navigateToEditorForEdit();
  };
  const openPublished = async (articleId) => {
    const r = await fetchArticleById(articleId);
    if (r?.success) navigateToArticle();
  };
  const accept = async (entry) => {
    const done = await review(entry, 'accept');
    if (done?.article && window.confirm(t('calls.review.openNow', 'Borrador creado con la obra. ¿Abrirlo ahora en el editor para revisarlo y publicarlo?'))) {
      openDraft(done.article.id_article);
    }
  };
  const decline = async (entry) => {
    const reason = window.prompt(t('calls.review.declinePrompt', 'Motivo (opcional): lo verá la persona que la envió.'), '');
    if (reason === null) return;
    review(entry, 'decline', { reason });
  };

  const STATUS = {
    sent: t('calls.review.status.sent', 'Pendiente de revisión'),
    accepted: t('calls.review.status.accepted', 'Aceptada · borrador'),
    published: t('calls.review.status.published', 'Publicada'),
    declined: t('calls.review.status.declined', 'Rechazada')
  };

  return (
    <section className="workshop-people contest-entries" aria-labelledby="contest-entries-title">
      <header className="workshop-people__header">
        <h3 id="contest-entries-title">
          <FileText size={18} /> {t('contests.entries.title', 'Obras recibidas')} ({entries?.length ?? '…'})
        </h3>
        <p className="workshop-people__hint">{t('contests.entries.hint', 'Solo las ven quienes gestionan la convocatoria. Cada persona envía una; puede cambiarla o retirarla hasta que se cierren las inscripciones o se acepte. Un super admin revisa cada obra: al aceptarla se crea un borrador en la sección de la convocatoria para publicarla.')}</p>
        {isSuperAdmin && !contest.section_workshop && (
          <p className="contest-entries__warning" role="note">{t('calls.review.noSection', 'Para aceptar obras, edita la convocatoria y elige la sección de la revista donde se publican.')}</p>
        )}
      </header>
      {entries && entries.length === 0 && (
        <p className="workshop-people__empty">{t('contests.entries.empty', 'Todavía no ha llegado ninguna obra.')}</p>
      )}
      {entries && entries.length > 0 && (
        <ul className="contest-entries__list">
          {entries.map((e) => {
            const open = openId === e.id_entry;
            const at = serverDate(e.updated_at || e.created_at);
            const state = reviewOf(e);
            const busy = busyId === e.id_entry;
            const draft = state === 'accepted' && e.article;
            return (
              <li key={e.id_entry} className="contest-entry">
                <div className="contest-entry__head">
                  <div>
                    <strong className="contest-entry__title">{e.title_entry}</strong>
                    <span className="contest-entry__meta">
                      {e.user?.name_user || t('admin.proposals.deletedUser', 'Cuenta eliminada')}
                      {at && <> · {localDate(at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>}
                      {e.user?.email_user && <> · <a href={`mailto:${e.user.email_user}`}>{e.user.email_user}</a></>}
                    </span>
                  </div>
                  <span className={`contest-entry__status contest-entry__status--${state}`}>{STATUS[state]}</span>
                </div>
                {e.note_entry && <p className="contest-entry__note">{e.note_entry}</p>}
                {state === 'declined' && e.decline_reason_entry && (
                  <p className="contest-entry__reason">{t('calls.review.reason', { reason: e.decline_reason_entry, defaultValue: 'Motivo: {{reason}}' })}</p>
                )}
                <div className="contest-entry__actions">
                  {e.has_file && (
                    <button type="button" className="workshop-people-btn" onClick={() => download(e)}>
                      <Paperclip size={15} aria-hidden="true" /><span>{e.file_name_entry}</span>
                    </button>
                  )}
                  {e.text_entry && (
                    <button type="button" className="workshop-people-btn" aria-expanded={open} onClick={() => setOpenId(open ? null : e.id_entry)}>
                      <ChevronDown size={15} aria-hidden="true" className={open ? 'is-open' : ''} />
                      <span>{open ? t('contests.entries.hideText', 'Ocultar el texto') : t('contests.entries.showText', 'Leer el texto')}</span>
                    </button>
                  )}
                </div>
                {open && e.text_entry && <div className="contest-entry__text" tabIndex={0}>{e.text_entry}</div>}

                {/* The review: super admins. */}
                {isSuperAdmin && (
                  <div className="contest-entry__review">
                    {state === 'published' ? (
                      <button type="button" className="workshop-people-btn" onClick={() => openPublished(e.article.id_article)}>
                        <ExternalLink size={15} aria-hidden="true" /><span>{t('calls.review.viewPublished', 'Ver la obra publicada')}</span>
                      </button>
                    ) : draft ? (
                      <button type="button" className="workshop-people-btn workshop-people-btn--primary" onClick={() => openDraft(e.article.id_article)} disabled={busy}>
                        <FilePen size={15} aria-hidden="true" /><span>{t('calls.review.openDraft', 'Abrir el borrador para publicarla')}</span>
                      </button>
                    ) : (
                      <button type="button" className="workshop-people-btn workshop-people-btn--primary" onClick={() => accept(e)} disabled={busy || !contest.section_workshop}>
                        <Check size={15} aria-hidden="true" /><span>{t('calls.review.accept', 'Aceptar y crear borrador')}</span>
                      </button>
                    )}
                    {state !== 'published' && state !== 'declined' && (
                      <button type="button" className="workshop-people-btn" onClick={() => decline(e)} disabled={busy}>
                        <X size={15} aria-hidden="true" /><span>{t('calls.review.decline', 'Rechazar')}</span>
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default ContestEntriesPanel;
