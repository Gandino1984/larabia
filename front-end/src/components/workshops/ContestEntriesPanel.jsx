// magazine-front/src/components/workshops/ContestEntriesPanel.jsx
//
// A contest's works, for its managers (its organisers on the team and the
// super admins): each one's title, author, date and note, its pasted text
// (folded) and its file to download. Only they see it (the server checks).
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Paperclip, ChevronDown } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { localDate, serverDate } from '../../utils/locale';
import { downloadEntryFile } from '../../utils/contestEntries';

function ContestEntriesPanel({ contest }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showError } = useUI();
  const [entries, setEntries] = useState(null);
  const [openId, setOpenId] = useState(null);
  const userId = currentUser?.id_user;

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

  return (
    <section className="workshop-people contest-entries" aria-labelledby="contest-entries-title">
      <header className="workshop-people__header">
        <h3 id="contest-entries-title">
          <FileText size={18} /> {t('contests.entries.title', 'Obras recibidas')} ({entries?.length ?? '…'})
        </h3>
        <p className="workshop-people__hint">{t('contests.entries.hint', 'Solo las ven quienes gestionan el concurso. Cada persona envía una; puede cambiarla o retirarla hasta que se cierren las inscripciones.')}</p>
      </header>
      {entries && entries.length === 0 && (
        <p className="workshop-people__empty">{t('contests.entries.empty', 'Todavía no ha llegado ninguna obra.')}</p>
      )}
      {entries && entries.length > 0 && (
        <ul className="contest-entries__list">
          {entries.map((e) => {
            const open = openId === e.id_entry;
            const at = serverDate(e.updated_at || e.created_at);
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
                </div>
                {e.note_entry && <p className="contest-entry__note">{e.note_entry}</p>}
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
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default ContestEntriesPanel;
