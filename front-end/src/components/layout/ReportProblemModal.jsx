// magazine-front/src/components/layout/ReportProblemModal.jsx
//
// «Reportar un error»: someone signed in tells the team something on the web
// doesn't work. With their words go where they were — the address, the view
// and what was open (an article, a project, a workshop…) — and their
// language, screen and browser, so the team can find it. The form's note
// asks them to say where they were and on what device, too.
// The super admins hear of it (Admin badge and bell) and handle it in
// Admin › Errores. Opened from the menu (Más) and from the pill under the
// language picker (FloatingLanguage). Looks like the contact form.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Send, AlertCircle, CheckCircle } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { useWorkshop } from '../../app_context/WorkshopContext';
import '../contact/ContactModal.css';

const MAX = 2000;

// The magazine's view the person is on (the first flag that's set).
const VIEWS = [
  ['showEditor', 'editor'], ['showWorkshopEditor', 'workshopEditor'], ['showAuthorEditor', 'authorEditor'],
  ['showAdmin', 'admin'], ['showArticleDetail', 'article'], ['showProjectDetail', 'project'],
  ['showWorkshopDetail', 'workshop'], ['showTalleres', 'talleres'], ['showExhibition', 'exhibition'],
  ['showMyGallery', 'myGallery'], ['showGallery', 'gallery'], ['showArticlesList', 'articles'],
  ['showProjectsList', 'projects'], ['showAuthorProfile', 'authorProfile'], ['showAuthorPublications', 'authorPublications'],
  ['showAuthors', 'authors'], ['showOpenMic', 'openmic'], ['showMicroPerfiles', 'microperfiles'],
  ['showAbout', 'about'], ['showLogin', 'login']
];

function ReportProblemModal({ onClose }) {
  const { t, i18n } = useTranslation();
  const { currentUser } = useAuth();
  const ui = useUI();
  const { selectedArticle, selectedProject } = useMagazine();
  const { selectedWorkshop } = useWorkshop();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // null | 'sent' | 'error'
  const [error, setError] = useState('');

  const view = (VIEWS.find(([flag]) => ui[flag]) || [null, 'home'])[1];
  // What was open, by its title and id.
  const open = view === 'article' && selectedArticle ? `${selectedArticle.title_article} (#${selectedArticle.id_article})`
    : view === 'project' && selectedProject ? `${selectedProject.title_project} (#${selectedProject.id_project})`
    : (view === 'workshop' || view === 'workshopEditor') && selectedWorkshop ? `${selectedWorkshop.title_workshop} (#${selectedWorkshop.id_workshop})`
    : '';

  const submit = async (e) => {
    e.preventDefault();
    const description = text.trim();
    if (!description) { setError(t('report.need', 'Cuéntanos qué ha pasado')); setStatus('error'); return; }
    setSending(true);
    setStatus(null);
    try {
      const res = await axiosInstance.post('/bug-reports', {
        description,
        page: window.location.href,
        view,
        context: {
          open,
          language: i18n.language,
          screen: `${window.innerWidth}×${window.innerHeight}`,
          browser: navigator.userAgent
        }
      }, { headers: { 'x-user-id': currentUser?.id_user } });
      if (res.data?.error) { setError(res.data.error); setStatus('error'); return; }
      setStatus('sent');
      setText('');
      setTimeout(onClose, 2500);
    } catch (err) {
      setError(err.response?.data?.error || t('report.error', 'No se ha podido enviar el aviso. Inténtalo de nuevo.'));
      setStatus('error');
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div className="contact-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="contact-modal-container" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <div className="contact-modal-header">
          <h2 id="report-title" className="contact-modal-title">{t('report.title', 'Reportar un error')}</h2>
          <button className="contact-close-button" onClick={onClose} aria-label={t('common.buttons.close')} type="button">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={submit} className="contact-modal-content">
          <div className="contact-form-group">
            <label htmlFor="report-text" className="contact-label">{t('report.label', '¿Qué ha pasado?')}</label>
            <textarea
              id="report-text"
              className="contact-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('report.placeholder', 'Cuéntanos qué estabas haciendo, qué esperabas que pasara y qué ha pasado.')}
              maxLength={MAX}
              rows={7}
              disabled={sending || status === 'sent'}
              autoFocus
            />
            <div className="contact-char-counter">
              {t('contact.form.charactersRemaining', { count: MAX - text.length })}
            </div>
          </div>

          <p className="report-modal-note">
            {t('report.note', 'En tu mensaje, para ubicarnos mejor, envíanos la sección de la revista en la que estás y qué navegador usas, si estás en móvil u ordenador, etc. Así encontraremos el error más rápido. Muchas gracias por tu ayuda.')}
          </p>

          {status === 'error' && (
            <div className="contact-error-message">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}
          {status === 'sent' && (
            <div className="contact-success-message">
              <CheckCircle size={20} />
              <span>{t('report.sent', '¡Gracias! El equipo ya sabe lo que ha pasado.')}</span>
            </div>
          )}

          <div className="contact-modal-footer">
            <button type="button" className="contact-cancel-button" onClick={onClose} disabled={sending}>
              {t('common.buttons.cancel', 'Cancelar')}
            </button>
            <button type="submit" className="contact-submit-button" disabled={sending || status === 'sent' || !text.trim()}>
              <Send size={18} />
              <span>{sending ? t('report.sending', 'Enviando…') : t('report.submit', 'Enviar')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default ReportProblemModal;
