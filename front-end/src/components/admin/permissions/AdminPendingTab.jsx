import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../../utils/axiosConfig';
import { useAuth } from '../../../app_context/AuthContext';
import { useUI } from '../../../app_context/UIContext';
import { useMagazine } from '../../../app_context/MagazineContext';
import './AdminPendingTab.css';

function AdminPendingTab() {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useUI();
  const { fetchArticleById, navigateToArticle } = useMagazine?.() || {};
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const buildAuthHeader = useCallback(() => ({
    headers: { 'x-user-id': currentUser?.id_user }
  }), [currentUser]);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/magazine-article/pending', buildAuthHeader());
      if (res.data.error) {
        showError(res.data.error);
        setArticles([]);
      } else {
        setArticles(res.data.data || []);
      }
    } catch (err) {
      showError(err.response?.data?.error || 'Error al cargar pendientes');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [buildAuthHeader, showError]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleAction = async (id_article, kind) => {
    setActingId(id_article);
    try {
      const path = kind === 'approve' ? 'approve' : 'reject';
      const res = await axiosInstance.patch(
        `/magazine-article/${path}/${id_article}`,
        {},
        buildAuthHeader()
      );
      if (res.data.error) {
        showError(res.data.error);
      } else {
        showSuccess(res.data.success || (kind === 'approve' ? 'Artículo aprobado' : 'Artículo rechazado'));
        setArticles((prev) => prev.filter((a) => a.id_article !== id_article));
      }
    } catch (err) {
      showError(err.response?.data?.error || 'Error al actualizar el artículo');
    } finally {
      setActingId(null);
    }
  };

  const handlePreview = async (article) => {
    if (!fetchArticleById || !navigateToArticle) return;
    const result = await fetchArticleById(article.id_article);
    if (result?.success) navigateToArticle();
  };

  return (
    <section className="admin-pending">
      <div className="admin-pending__header">
        <h2>Pendientes de aprobación</h2>
        <button className="admin-pending__refresh" onClick={fetchPending}>Actualizar</button>
      </div>

      {loading ? (
        <p className="admin-pending__loading">Cargando…</p>
      ) : articles.length === 0 ? (
        <p className="admin-pending__empty">No hay artículos pendientes.</p>
      ) : (
        <ul className="admin-pending__list">
          {articles.map((article) => {
            const authorLabel = article.authors?.length
              ? article.authors.map((a) => a.name_user).join(', ')
              : (article.author_name || 'Autor desconocido');
            const isActing = actingId === article.id_article;
            return (
              <li key={article.id_article} className="admin-pending-card">
                <div className="admin-pending-card__body">
                  <h3 className="admin-pending-card__title">{article.title_article}</h3>
                  <p className="admin-pending-card__author">Por {authorLabel}</p>
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
                    onClick={() => handleAction(article.id_article, 'reject')}
                  >
                    Devolver al autor
                  </button>
                  <button
                    className="admin-pending-card__btn admin-pending-card__btn--approve"
                    disabled={isActing}
                    onClick={() => handleAction(article.id_article, 'approve')}
                  >
                    Aprobar y publicar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default AdminPendingTab;
