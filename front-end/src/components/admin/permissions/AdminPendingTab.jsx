import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../../utils/axiosConfig';
import { useAuth } from '../../../app_context/AuthContext';
import { useUI } from '../../../app_context/UIContext';
import { useMagazine } from '../../../app_context/MagazineContext';
import { usePendingReview } from '../../../app_context/PendingReviewContext';
import { useSectionCatalog } from '../../../app_context/useSectionCatalog';
import { sectionsOf, requestedSectionsOf, sectionList } from '../../../utils/sections';
import SectionPicker from '../../common/SectionPicker';
import { categoryLabel } from '../../../utils/articleFilters';
import { projectTypeLabel, projectFormatLabel } from '../../../utils/projectKinds';
import { useWorkshop } from '../../../app_context/WorkshopContext';
import { formatDay, signupRange } from '../../../utils/contests';
import './AdminPendingTab.css';

function AdminPendingTab() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showSuccess, showError, navigateToProjectDetail, navigateToArticle, navigateToWorkshopDetail } = useUI();
  const { fetchArticleById, setSelectedProject } = useMagazine?.() || {};
  const { setSelectedWorkshop } = useWorkshop();
  const { pendingArticles, pendingProjects, pendingContests, sectionRequestArticles, sectionRequestProjects, loading, refresh } = usePendingReview();
  const [actingId, setActingId] = useState(null);
  // Magazine sections (utils/sections.js): what the approver settles on for
  // each publication — by default what its author asked for.
  const catalog = useSectionCatalog();
  const [chosen, setChosen] = useState({});
  const chosenKey = (kind, item) => `${kind}-${kind === 'article' ? item.id_article : item.id_project}`;
  const sectionsFor = (kind, item) => chosen[chosenKey(kind, item)] ?? requestedSectionsOf(item) ?? sectionsOf(item);
  const choose = (kind, item, value) => setChosen((prev) => ({ ...prev, [chosenKey(kind, item)]: value }));
  // Reject-with-reason modal: { kind: 'article'|'project'|'contest', id, title } | null
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const buildAuthHeader = useCallback(() => ({
    headers: { 'x-user-id': currentUser?.id_user }
  }), [currentUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const resourcePath = (kind) => (kind === 'article' ? 'magazine-article' : 'magazine-project');
  const idOf = (kind, item) => (kind === 'article' ? item.id_article : kind === 'contest' ? item.id_workshop : item.id_project);
  // Contests (Talleres) are reviewed at /magazine-workshop/review/:id/…
  const reviewUrl = (kind, id, decision) => (kind === 'contest'
    ? `/magazine-workshop/review/${id}/${decision}`
    : `/${resourcePath(kind)}/${decision}/${id}`);

  const handleApprove = async (kind, item) => {
    const id = idOf(kind, item);
    setActingId(id);
    try {
      const res = await axiosInstance.patch(
        reviewUrl(kind, id, 'approve'),
        kind === 'contest' ? {} : { sections: sectionsFor(kind, item) },
        buildAuthHeader()
      );
      if (res.data.error) {
        showError(res.data.error);
      } else {
        showSuccess(res.data.success || t('admin.pending.approved', 'Contenido aprobado'));
        await refresh();
      }
    } catch (err) {
      showError(err.response?.data?.error || t('admin.pending.approveError', 'Error al aprobar el contenido'));
    } finally {
      setActingId(null);
    }
  };

  // A published publication whose author asked for other sections: set the
  // approved ones (`keep` = leave them as they are, i.e. reject the change).
  const settleSections = async (kind, item, keep) => {
    const id = idOf(kind, item);
    setActingId(`s-${kind}-${id}`);
    try {
      const res = await axiosInstance.patch(
        `/${resourcePath(kind)}/sections/${id}`,
        { sections: keep ? sectionsOf(item) : sectionsFor(kind, item) },
        buildAuthHeader()
      );
      if (res.data.error) {
        showError(res.data.error);
      } else {
        showSuccess(keep ? t('admin.pending.sectionChangeRejected', 'Cambio de sección rechazado') : t('admin.pending.sectionsUpdated', 'Secciones actualizadas'));
        await refresh();
      }
    } catch (err) {
      showError(err.response?.data?.error || t('admin.pending.sectionsError', 'Error al actualizar las secciones'));
    } finally {
      setActingId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const { kind, id } = rejectTarget;
    setActingId(id);
    try {
      const res = await axiosInstance.patch(
        reviewUrl(kind, id, 'reject'),
        { reason: rejectReason.trim() || null },
        buildAuthHeader()
      );
      if (res.data.error) {
        showError(res.data.error);
      } else {
        showSuccess(res.data.success || t('admin.pending.returned', 'Contenido devuelto al autor'));
        await refresh();
      }
    } catch (err) {
      showError(err.response?.data?.error || t('admin.pending.returnError', 'Error al rechazar el contenido'));
    } finally {
      setActingId(null);
      setRejectTarget(null);
      setRejectReason('');
    }
  };

  const handlePreview = async (article) => {
    if (!fetchArticleById || !navigateToArticle) return;
    const result = await fetchArticleById(article.id_article);
    if (result?.success) navigateToArticle();
  };

  const handlePreviewContest = (contest) => {
    setSelectedWorkshop(contest);
    navigateToWorkshopDetail();
  };

  const handlePreviewProject = (project) => {
    if (!setSelectedProject || !navigateToProjectDetail) return;
    setSelectedProject(project);
    navigateToProjectDetail();
  };

  const authorLabelOf = (item) =>
    item.authors?.length
      ? item.authors.map((a) => a.name_user).join(', ')
      : (item.author_name || t('admin.pending.unknownAuthor', 'Autor desconocido'));

  const total = pendingArticles.length + pendingProjects.length + pendingContests.length
    + sectionRequestArticles.length + sectionRequestProjects.length;

  // The sections block of a pending card.
  const sectionsBlock = (kind, item) => (
    <div className="admin-pending-card__sections">
      <p className="admin-pending-card__note">
        {kind === 'article'
          ? t('admin.pending.sectionsNoteArticle', 'Secciones de la revista (además de «Artículos») — puedes cambiarlas antes de aprobar:')
          : t('admin.pending.sectionsNoteProject', 'Secciones de la revista (además de «Proyectos») — puedes cambiarlas antes de aprobar:')}
      </p>
      <SectionPicker
        catalog={catalog}
        value={sectionsFor(kind, item)}
        onChange={(value) => choose(kind, item, value)}
        idPrefix={`pending-${chosenKey(kind, item)}`}
      />
    </div>
  );

  const sectionRequestCard = (kind, item) => {
    const id = idOf(kind, item);
    const isActing = actingId === `s-${kind}-${id}`;
    const title = kind === 'article' ? item.title_article : item.title_project;
    return (
      <li key={`s-${kind}-${id}`} className="admin-pending-card">
        <div className="admin-pending-card__body">
          <h3 className="admin-pending-card__title">{title}</h3>
          <p className="admin-pending-card__author">
            {kind === 'article' ? t('admin.pending.kindArticle', 'Artículo') : t('admin.pending.kindProject', 'Proyecto')} · {t('article.detail.by', 'Por')} {authorLabelOf(item)}
          </p>
          <p className="admin-pending-card__note">
            {t('admin.pending.nowIn', 'Ahora aparece en')}: <strong>{sectionList(sectionsOf(item), catalog, t('admin.pending.noSection', 'ninguna sección'))}</strong>
            {' · '}{t('admin.pending.asks', 'Pide')}: <strong>{sectionList(requestedSectionsOf(item) || [], catalog, t('admin.pending.removeAll', 'quitarla de todas'))}</strong>
          </p>
          <div className="admin-pending-card__sections">
            <p className="admin-pending-card__note">{t('admin.pending.sectionsWillBe', 'Secciones que quedarán (puedes cambiarlas):')}</p>
            <SectionPicker
              catalog={catalog}
              value={sectionsFor(kind, item)}
              onChange={(value) => choose(kind, item, value)}
              idPrefix={`request-${chosenKey(kind, item)}`}
            />
          </div>
        </div>
        <div className="admin-pending-card__actions">
          <button
            className="admin-pending-card__btn admin-pending-card__btn--reject"
            disabled={isActing}
            onClick={() => settleSections(kind, item, true)}
          >
            {t('admin.pending.rejectChange', 'Rechazar cambio')}
          </button>
          <button
            className="admin-pending-card__btn admin-pending-card__btn--approve"
            disabled={isActing}
            onClick={() => settleSections(kind, item, false)}
          >
            {t('admin.pending.approveSections', 'Aprobar secciones')}
          </button>
        </div>
      </li>
    );
  };

  return (
    <section className="admin-pending">
      <div className="admin-pending__header">
        <h2>{t('admin.pending.title', 'Pendientes de aprobación')}</h2>
        <button className="admin-pending__refresh" onClick={refresh}>{t('admin.pending.refresh', 'Actualizar')}</button>
      </div>

      {loading ? (
        <p className="admin-pending__loading">{t('common.states.loading', 'Cargando…')}</p>
      ) : total === 0 ? (
        <p className="admin-pending__empty">{t('admin.pending.emptyAll', 'No hay contenido pendiente de revisión.')}</p>
      ) : (
        <>
          <h3 className="admin-pending__section-title">
            {t('admin.pending.articles', 'Artículos')} <span className="admin-pending__count">{pendingArticles.length}</span>
          </h3>
          {pendingArticles.length === 0 ? (
            <p className="admin-pending__empty">{t('admin.pending.noArticles', 'No hay artículos pendientes.')}</p>
          ) : (
            <ul className="admin-pending__list">
              {pendingArticles.map((article) => {
                const isActing = actingId === article.id_article;
                return (
                  <li key={`a-${article.id_article}`} className="admin-pending-card">
                    <div className="admin-pending-card__body">
                      <h3 className="admin-pending-card__title">{article.title_article}</h3>
                      <p className="admin-pending-card__author">{t('article.detail.by', 'Por')} {authorLabelOf(article)}</p>
                      {article.excerpt_article && (
                        <p className="admin-pending-card__excerpt">{article.excerpt_article}</p>
                      )}
                      <p className="admin-pending-card__meta">
                        {t('editor.category.label', 'Categoría')}: <strong>{article.category_article ? categoryLabel(article.category_article, t) : t('admin.pending.noCategory', 'sin categoría')}</strong>
                        {article.is_premium ? ' · Premium' : ''}
                      </p>
                      {sectionsBlock('article', article)}
                    </div>
                    <div className="admin-pending-card__actions">
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--preview"
                        onClick={() => handlePreview(article)}
                      >
                        {t('admin.pending.preview', 'Vista previa')}
                      </button>
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--reject"
                        disabled={isActing}
                        onClick={() => setRejectTarget({ kind: 'article', id: article.id_article, title: article.title_article })}
                      >
                        {t('admin.pending.return', 'Devolver al autor')}
                      </button>
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--approve"
                        disabled={isActing}
                        onClick={() => handleApprove('article', article)}
                      >
                        {t('admin.pending.approvePublish', 'Aprobar y publicar')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <h3 className="admin-pending__section-title">
            {t('admin.pending.projects', 'Proyectos')} <span className="admin-pending__count">{pendingProjects.length}</span>
          </h3>
          {pendingProjects.length === 0 ? (
            <p className="admin-pending__empty">{t('admin.pending.noProjects', 'No hay proyectos pendientes.')}</p>
          ) : (
            <ul className="admin-pending__list">
              {pendingProjects.map((project) => {
                const isActing = actingId === project.id_project;
                return (
                  <li key={`p-${project.id_project}`} className="admin-pending-card">
                    <div className="admin-pending-card__body">
                      <h3 className="admin-pending-card__title">{project.title_project}</h3>
                      <p className="admin-pending-card__author">{t('article.detail.by', 'Por')} {authorLabelOf(project)}</p>
                      {project.description_project && (
                        <p className="admin-pending-card__excerpt">{project.description_project}</p>
                      )}
                      <p className="admin-pending-card__meta">
                        {project.type_project ? <>{t('admin.pending.type', 'Tipo')}: <strong>{projectTypeLabel(project.type_project, t)}</strong></> : t('admin.pending.noType', 'Sin tipo')}
                        {project.format_project ? ` · ${projectFormatLabel(project.format_project, t)}` : ''}
                      </p>
                      {sectionsBlock('project', project)}
                    </div>
                    <div className="admin-pending-card__actions">
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--preview"
                        onClick={() => handlePreviewProject(project)}
                      >
                        {t('admin.pending.preview', 'Vista previa')}
                      </button>
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--reject"
                        disabled={isActing}
                        onClick={() => setRejectTarget({ kind: 'project', id: project.id_project, title: project.title_project })}
                      >
                        {t('admin.pending.return', 'Devolver al autor')}
                      </button>
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--approve"
                        disabled={isActing}
                        onClick={() => handleApprove('project', project)}
                      >
                        {t('admin.pending.approvePublish', 'Aprobar y publicar')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <h3 className="admin-pending__section-title">
            {t('admin.pending.contests', 'Concursos')} <span className="admin-pending__count">{pendingContests.length}</span>
          </h3>
          {pendingContests.length === 0 ? (
            <p className="admin-pending__empty">{t('admin.pending.noContests', 'No hay concursos pendientes.')}</p>
          ) : (
            <ul className="admin-pending__list">
              {pendingContests.map((contest) => {
                const isActing = actingId === contest.id_workshop;
                return (
                  <li key={`c-${contest.id_workshop}`} className="admin-pending-card">
                    <div className="admin-pending-card__body">
                      <h3 className="admin-pending-card__title">{contest.title_workshop}</h3>
                      <p className="admin-pending-card__author">
                        {t('contests.kind', 'Concurso')} · {t('article.detail.by', 'Por')} {authorLabelOf(contest)}
                      </p>
                      {contest.description_workshop && (
                        <p className="admin-pending-card__excerpt">{contest.description_workshop}</p>
                      )}
                      <p className="admin-pending-card__meta">
                        {t('contests.signups', { ...signupRange(contest.registration_start_workshop, contest.registration_end_workshop), defaultValue: 'Inscripciones: del {{from}} al {{to}}' })}
                        {' · '}
                        {t('contests.juryOn', { day: formatDay(contest.resolution_date_workshop), defaultValue: 'Fallo del jurado: {{day}}' })}
                      </p>
                    </div>
                    <div className="admin-pending-card__actions">
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--preview"
                        onClick={() => handlePreviewContest(contest)}
                      >
                        {t('admin.pending.preview', 'Vista previa')}
                      </button>
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--reject"
                        disabled={isActing}
                        onClick={() => setRejectTarget({ kind: 'contest', id: contest.id_workshop, title: contest.title_workshop })}
                      >
                        {t('admin.pending.return', 'Devolver al autor')}
                      </button>
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--approve"
                        disabled={isActing}
                        onClick={() => handleApprove('contest', contest)}
                      >
                        {t('admin.pending.approvePublish', 'Aprobar y publicar')}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <h3 className="admin-pending__section-title">
            {t('admin.pending.sectionChanges', 'Cambios de sección')}{' '}
            <span className="admin-pending__count">{sectionRequestArticles.length + sectionRequestProjects.length}</span>
          </h3>
          {sectionRequestArticles.length + sectionRequestProjects.length === 0 ? (
            <p className="admin-pending__empty">{t('admin.pending.noSectionChanges', 'Nadie ha pedido cambiar las secciones de lo ya publicado.')}</p>
          ) : (
            <ul className="admin-pending__list">
              {sectionRequestArticles.map((article) => sectionRequestCard('article', article))}
              {sectionRequestProjects.map((project) => sectionRequestCard('project', project))}
            </ul>
          )}
        </>
      )}

      {rejectTarget && (
        <div className="admin-pending__modal-overlay" onClick={() => setRejectTarget(null)}>
          <div className="admin-pending__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-pending__modal-title">{t('admin.pending.return', 'Devolver al autor')}</h3>
            <p className="admin-pending__modal-subtitle">«{rejectTarget.title}»</p>
            <label className="admin-pending__modal-label" htmlFor="reject-reason">
              {t('admin.pending.reasonLabel', 'Motivo (opcional, lo verá el autor):')}
            </label>
            <textarea
              id="reject-reason"
              className="admin-pending__modal-textarea"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('admin.pending.reasonPlaceholder', 'Explica qué debe corregir el autor antes de reenviarlo…')}
            />
            <div className="admin-pending__modal-actions">
              <button
                className="admin-pending-card__btn"
                onClick={() => { setRejectTarget(null); setRejectReason(''); }}
              >
                {t('common.buttons.cancel', 'Cancelar')}
              </button>
              <button
                className="admin-pending-card__btn admin-pending-card__btn--reject"
                onClick={confirmReject}
              >
                {t('admin.pending.return', 'Devolver al autor')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminPendingTab;
