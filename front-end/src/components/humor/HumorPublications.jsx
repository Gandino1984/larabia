// magazine-front/src/components/humor/HumorPublications.jsx
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../app_context/UIContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { ArrowLeft } from 'lucide-react';
import ArticleCard from '../magazine/ArticleCard';
import './HumorPublications.css';

function HumorPublications() {
  const { t } = useTranslation();
  const { navigateBack } = useUI();
  const { articles, loading } = useMagazine();

  const humorArticles = useMemo(() => {
    if (!articles) return [];
    return articles.filter(article => article.category_article === 'humor');
  }, [articles]);

  return (
    <div className="humor-page">
      <div className="humor-container">
        <header className="humor-header">
          <button onClick={navigateBack} className="btn-back-nav" title={t('common.buttons.back')}>
            <ArrowLeft size={24} />
          </button>
          <div className="humor-header-content">
            <div className="humor-title-row">
              <h1>{t('humor.title')}</h1>
            </div>
            <p className="humor-subtitle">{t('humor.subtitle')}</p>
          </div>
        </header>

        {loading && (
          <div className="humor-loading">
            <div className="humor-spinner"></div>
            <p>{t('magazine.loadingArticles')}</p>
          </div>
        )}

        {!loading && humorArticles.length === 0 && (
          <div className="humor-empty">
            <p>{t('humor.empty')}</p>
          </div>
        )}

        {!loading && humorArticles.length > 0 && (
          <div className="humor-content">
            <div className="humor-count">
              {t('humor.count', { count: humorArticles.length })}
            </div>
            <div className="humor-grid">
              {humorArticles.map(article => (
                <ArticleCard key={article.id_article} article={article} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HumorPublications;
