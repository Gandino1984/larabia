// magazine-front/src/components/openmic/OpenMicPublications.jsx
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../app_context/UIContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { ArrowLeft } from 'lucide-react';
import ArticleCard from '../magazine/ArticleCard';
import './OpenMicPublications.css';

function OpenMicPublications() {
  const { t } = useTranslation();
  const { navigateBack } = useUI();
  const { articles, loading, fetchArticles } = useMagazine();

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchArticles();
  }, [fetchArticles]);

  const openMicArticles = useMemo(() => {
    if (!articles) return [];
    return articles.filter(article => article.category_article === 'terrenito en pluton' || article.category_article === 'micro abierto');
  }, [articles]);

  return (
    <div className="openmic-page">
      <div className="openmic-container">
        <header className="openmic-header">
          <button onClick={navigateBack} className="btn-back-nav" title={t('common.buttons.back')}>
            <ArrowLeft size={24} />
          </button>
          <div className="openmic-header-content">
            <div className="openmic-title-row">
              <h1>{t('openmic.title')}</h1>
            </div>
            <p className="openmic-subtitle">{t('openmic.subtitle')}</p>
          </div>
        </header>

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
    </div>
  );
}

export default OpenMicPublications;
