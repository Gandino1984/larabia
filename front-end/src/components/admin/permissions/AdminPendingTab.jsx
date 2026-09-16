import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../../utils/axiosConfig';
import { useAuth } from '../../../app_context/AuthContext';
import { useUI } from '../../../app_context/UIContext';
import { useMagazine } from '../../../app_context/MagazineContext';
import { usePendingReview } from '../../../app_context/PendingReviewContext';
import './AdminPendingTab.css';

function AdminPendingTab() {
  const { currentUser } = useAuth();
  const { showSuccess, showError, navigateToProjectDetail } = useUI();
  const { fetchArticleById, navigateToArticle, setSelectedProject } = useMagazine?.() || {};
  const { pendingArticles, pendingProjects, loading, refresh } = usePendingReview();
  const [actingId, setActingId] = useState(null);
  // Reject-with-reason modal: { kind: 'article'|'project', id, title } | null
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const buildAuthHeader = useCallback(() => ({
    headers: { 'x-user-id': currentUser?.id_user }
  }), [currentUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const resourcePath = (kind) => (kind === 'article' ? 'magazine-article' : 'magazine-project');
  const idOf = (kind, item) => (kind === 'article' ? item.id_article : item.id_project);

  const handleApprove = async (kind, id) => {
    setActingId(id);
    try {
      const res = await axiosInstance.patch(
        `/${resourcePath(kind)}/approve/${id}`,
        {},
        buildAuthHeader()
      );
      if (res.data.error) {
        showError(res.data.error);
      } else {
        showSuccess(res.data.success || 'Contenido aprobado');
        await refresh();
      }
    } catch (err) {
      showError(err.response?.data?.error || 'Error al aprobar el contenido');
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
        `/${resourcePath(kind)}/reject/${id}`,
        { reason: rejectReason.trim() || null },
        buildAuthHeader()
      );
      if (res.data.error) {
        showError(res.data.error);
      } else {
        showSuccess(res.data.success || 'Contenido devuelto al autor');
        await refresh();
      }
    } catch (err) {
      showError(err.response?.data?.error || 'Error al rechazar el contenido');
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

  const handlePreviewProject = (project) => {
    if (!setSelectedProject || !navigateToProjectDetail) return;
    setSelectedProject(project);
    navigateToProjectDetail();
  };

  const authorLabelOf = (item) =>
    item.authors?.length
      ? item.authors.map((a) => a.name_user).join(', ')
      : (item.author_name || 'Autor desconocido');

  const total = pendingArticles.length + pendingProjects.length;

  return (
    <section className="admin-pending">
      <div className="admin-pending__header">
        <h2>Pendientes de aprobación</h2>
        <button className="admin-pending__refresh" onClick={refresh}>Actualizar</button>
      </div>

      {loading ? (
        <p className="admin-pending__loading">Cargando…</p>
      ) : total === 0 ? (
        <p className="admin-pending__empty">No hay contenido pendiente de revisión.</p>
      ) : (
        <>
          <h3 className="admin-pending__section-title">
            Artículos <span className="admin-pending__count">{pendingArticles.length}</span>
          </h3>
          {pendingArticles.length === 0 ? (
            <p className="admin-pending__empty">No hay artículos pendientes.</p>
          ) : (
            <ul className="admin-pending__list">
              {pendingArticles.map((article) => {
                const isActing = actingId === article.id_article;
                return (
                  <li key={`a-${article.id_article}`} className="admin-pending-card">
                    <div className="admin-pending-card__body">
                      <h3 className="admin-pending-card__title">{article.title_article}</h3>
                      <p className="admin-pending-card__author">Por {authorLabelOf(article)}</p>
                      {article.excerpt_article && (
                        <p className="admin-pending-card__excerpt">{article.excerpt_article}</p>
                      )}
                      <p className="admin-pending-card__meta">
                        Categoría: <strong>{article.category_article || 'sin categoría'}</strong>
                        {article.is_premium ? ' · Premium' : ''}
                      </p>
                    </div>
                    <div className="admin-pending-card__actions">
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--preview"
                        onClick={() => handlePreview(article)}
                      >
                        Vista previa
                      </button>
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--reject"
                        disabled={isActing}
                        onClick={() => setRejectTarget({ kind: 'article', id: article.id_article, title: article.title_article })}
                      >
                        Devolver al autor
                      </button>
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--approve"
                        disabled={isActing}
                        onClick={() => handleApprove('article', article.id_article)}
                      >
                        Aprobar y publicar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <h3 className="admin-pending__section-title">
            Proyectos <span className="admin-pending__count">{pendingProjects.length}</span>
          </h3>
          {pendingProjects.length === 0 ? (
            <p className="admin-pending__empty">No hay proyectos pendientes.</p>
          ) : (
            <ul className="admin-pending__list">
              {pendingProjects.map((project) => {
                const isActing = actingId === project.id_project;
                return (
                  <li key={`p-${project.id_project}`} className="admin-pending-card">
                    <div className="admin-pending-card__body">
                      <h3 className="admin-pending-card__title">{project.title_project}</h3>
                      <p className="admin-pending-card__author">Por {authorLabelOf(project)}</p>
                      {project.description_project && (
                        <p className="admin-pending-card__excerpt">{project.description_project}</p>
                      )}
                      <p className="admin-pending-card__meta">
                        {project.type_project ? <>Tipo: <strong>{project.type_project}</strong></> : 'Sin tipo'}
                        {project.format_project ? ` · ${project.format_project}` : ''}
                      </p>
                    </div>
                    <div className="admin-pending-card__actions">
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--preview"
                        onClick={() => handlePreviewProject(project)}
                      >
                        Vista previa
                      </button>
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--reject"
                        disabled={isActing}
                        onClick={() => setRejectTarget({ kind: 'project', id: project.id_project, title: project.title_project })}
                      >
                        Devolver al autor
                      </button>
                      <button
                        className="admin-pending-card__btn admin-pending-card__btn--approve"
                        disabled={isActing}
                        onClick={() => handleApprove('project', project.id_project)}
                      >
                        Aprobar y publicar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {rejectTarget && (
        <div className="admin-pending__modal-overlay" onClick={() => setRejectTarget(null)}>
          <div className="admin-pending__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-pending__modal-title">Devolver al autor</h3>
            <p className="admin-pending__modal-subtitle">«{rejectTarget.title}»</p>
            <label className="admin-pending__modal-label" htmlFor="reject-reason">
              Motivo (opcional, lo verá el autor):
            </label>
            <textarea
              id="reject-reason"
              className="admin-pending__modal-textarea"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explica qué debe corregir el autor antes de reenviarlo…"
            />
            <div className="admin-pending__modal-actions">
              <button
                className="admin-pending-card__btn"
                onClick={() => { setRejectTarget(null); setRejectReason(''); }}
              >
                Cancelar
              </button>
              <button
                className="admin-pending-card__btn admin-pending-card__btn--reject"
                onClick={confirmReject}
              >
                Devolver al autor
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminPendingTab;
