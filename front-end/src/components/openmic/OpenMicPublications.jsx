// magazine-front/src/components/openmic/OpenMicPublications.jsx
//
// «Espacio abierto» (its internal key and category are still openmic /
// 'terrenito en pluton'): what the section is, how to send a proposal
// (anyone signed in, no subscription — OpenSpaceProposalModal), the
// proposals you've sent and their status, and what's been published.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, LogIn, Paperclip, FileText } from 'lucide-react';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useMagazine } from '../../app_context/MagazineContext';
import axiosInstance from '../../utils/axiosConfig';
import ArticleCard from '../magazine/ArticleCard';
import SectionProjects from '../magazine/SectionProjects';
import OpenSpaceProposalModal from './OpenSpaceProposalModal';
import { inSection } from '../../utils/sections';
import { localDate, serverDate } from '../../utils/locale';
import { proposalKindLabel, proposalStatusLabel, downloadProposalFile } from '../../utils/proposals';
import './OpenMicPublications.css';

function OpenMicPublications() {
  const { t } = useTranslation();
  const { navigateToLogin, showError, showSuccess } = useUI();
  const { currentUser } = useAuth();
  const { articles, loading, fetchArticles } = useMagazine();
  const [formOpen, setFormOpen] = useState(false);
  const [mine, setMine] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchArticles();
  }, [fetchArticles]);

  const userId = currentUser?.id_user;
  const fetchMine = useCallback(async () => {
    if (!userId) { setMine([]); return; }
    try {
      const res = await axiosInstance.get('/open-space/proposals/mine', { headers: { 'x-user-id': userId } });
      setMine(res.data.data || []);
    } catch (err) {
      console.error('Error loading my proposals:', err);
    }
  }, [userId]);

  useEffect(() => { fetchMine(); }, [fetchMine]);

  const openMicArticles = useMemo(() => {
    if (!articles) return [];
    // Its category (terrenito en pluton) or the section (utils/sections.js).
    return articles.filter(article => inSection(article, 'openmic'));
  }, [articles]);

  const withdraw = async (p) => {
    if (!window.confirm(t('openspace.mine.confirmWithdraw', { title: p.title_proposal, defaultValue: '¿Retirar «{{title}}»? Se borrará, con su archivo si lo tiene.' }))) return;
    try {
      const res = await axiosInstance.delete(`/open-space/proposals/${p.id_proposal}`, { headers: { 'x-user-id': userId } });
      setMine((list) => list.filter((x) => x.id_proposal !== p.id_proposal));
      showSuccess(res.data?.success || t('openspace.mine.withdrawn', 'Propuesta retirada'));
    } catch (err) {
      showError(err.response?.data?.error || t('openspace.mine.withdrawError', 'No se pudo retirar la propuesta'));
    }
  };

  const download = async (p) => {
    try {
      await downloadProposalFile(p, userId);
    } catch {
      showError(t('openspace.mine.downloadError', 'No se pudo descargar el archivo'));
    }
  };

  const steps = [
    { key: 'who', title: t('openspace.how.whoTitle', 'Quién puede participar'), text: t('openspace.how.who', 'Cualquier persona con cuenta en la revista. No hace falta ser socio/a.') },
    { key: 'what', title: t('openspace.how.whatTitle', 'Qué puedes enviar'), text: t('openspace.how.what', 'Poesía, relato, microrrelato, crónica, ensayo… textos escritos por ti.') },
    { key: 'how', title: t('openspace.how.howTitle', 'Cómo'), text: t('openspace.how.how', 'Con el formulario: el título, una explicación breve de tu propuesta y el texto, pegado o en un archivo (PDF, Word, ODT, TXT o RTF).') },
    { key: 'then', title: t('openspace.how.thenTitle', 'Y después'), text: t('openspace.how.then', 'El equipo de la revista lee todas las propuestas. Si la tuya encaja, te escribiremos para publicarla aquí. Puedes seguir su estado en esta página.') }
  ];

  return (
    <div className="openmic-page">
      <div className="openmic-container">
        <header className="openmic-header">
          <div className="openmic-header-content">
            <div className="openmic-title-row">
              <h1>{t('openmic.title')}</h1>
            </div>
            <p className="openmic-subtitle">{t('openmic.subtitle')}</p>
          </div>
        </header>

        <section className="openmic-invite" aria-labelledby="openmic-invite-title">
          <h2 id="openmic-invite-title" className="openmic-invite__title">
            {t('openspace.how.title', '¿Escribes? Envíanos tu propuesta')}
          </h2>
          <ol className="openmic-invite__steps">
            {steps.map((s) => (
              <li key={s.key} className="openmic-invite__step">
                <strong>{s.title}</strong>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
          <div className="openmic-invite__action">
            {currentUser ? (
              <button type="button" className="openmic-btn openmic-btn--primary" onClick={() => setFormOpen(true)}>
                <Send size={18} aria-hidden="true" />
                {t('openspace.cta.send', 'Enviar una propuesta')}
              </button>
            ) : (
              <>
                <p className="openmic-invite__signin-text">
                  {t('openspace.cta.signInText', 'Para enviar una propuesta, inicia sesión o crea tu cuenta. Es gratis.')}
                </p>
                <button type="button" className="openmic-btn openmic-btn--primary" onClick={navigateToLogin}>
                  <LogIn size={18} aria-hidden="true" />
                  {t('openspace.cta.signIn', 'Iniciar sesión')}
                </button>
              </>
            )}
          </div>
        </section>

        {currentUser && mine.length > 0 && (
          <section className="openmic-mine" aria-labelledby="openmic-mine-title">
            <h2 id="openmic-mine-title" className="openmic-mine__title">{t('openspace.mine.title', 'Tus propuestas')}</h2>
            <ul className="openmic-mine__list">
              {mine.map((p) => {
                const sentAt = serverDate(p.created_at);
                return (
                  <li key={p.id_proposal} className="openmic-mine__item">
                    <div className="openmic-mine__head">
                      <span className="openmic-mine__name">{p.title_proposal}</span>
                      <span className={`openmic-status openmic-status--${p.status_proposal}`}>
                        {proposalStatusLabel(p.status_proposal, t)}
                      </span>
                    </div>
                    <p className="openmic-mine__meta">
                      {proposalKindLabel(p.kind_proposal, t)}
                      {sentAt && <> · {t('openspace.mine.sentOn', { date: localDate(sentAt, { day: 'numeric', month: 'long', year: 'numeric' }), defaultValue: 'enviada el {{date}}' })}</>}
                    </p>
                    <div className="openmic-mine__actions">
                      {p.has_text && (
                        <span className="openmic-mine__has"><FileText size={15} aria-hidden="true" />{t('openspace.mine.hasText', 'Texto')}</span>
                      )}
                      {p.file_name_proposal && (
                        <button type="button" className="openmic-mine__file" onClick={() => download(p)} title={t('openspace.mine.download', 'Descargar el archivo')}>
                          <Paperclip size={15} aria-hidden="true" />
                          <span>{p.file_name_proposal}</span>
                        </button>
                      )}
                      <button type="button" className="openmic-mine__withdraw" onClick={() => withdraw(p)}>
                        {t('openspace.mine.withdraw', 'Retirar')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <SectionProjects sectionKey="openmic" />

        {loading && (
          <div className="openmic-loading">
            <div className="openmic-spinner"></div>
            <p>{t('magazine.loadingArticles')}</p>
          </div>
        )}

        {!loading && openMicArticles.length === 0 && (
          <div className="openmic-empty">
            <p>{t('openmic.empty')}</p>
          </div>
        )}

        {!loading && openMicArticles.length > 0 && (
          <div className="openmic-content">
            <div className="openmic-count">
              {t('openmic.count', { count: openMicArticles.length })}
            </div>
            <div className="openmic-grid">
              {openMicArticles.map(article => (
                <ArticleCard key={article.id_article} article={article} />
              ))}
            </div>
          </div>
        )}
      </div>

      {formOpen && (
        <OpenSpaceProposalModal
          onClose={() => setFormOpen(false)}
          onSent={(p) => setMine((list) => [p, ...list])}
        />
      )}
    </div>
  );
}

export default OpenMicPublications;
