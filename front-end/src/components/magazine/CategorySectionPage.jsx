// magazine-front/src/components/magazine/CategorySectionPage.jsx
//
// Generic "section with its own page" that lists the published articles of a
// single category (e.g. Micro-perfiles, Talleres) and the publications placed
// in its section (`sectionKey`, utils/sections.js) — projects included.
// Mirrors OpenMicPublications but is parameterised by category +
// title/subtitle so one component serves several sections.
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../app_context/UIContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { ArrowLeft } from 'lucide-react';
import ArticleCard from './ArticleCard';
import SectionProjects from './SectionProjects';
import { inSection } from '../../utils/sections';
import './CategorySectionPage.css';

function CategorySectionPage({ category, sectionKey, titleKey, subtitleKey }) {
  const { t } = useTranslation();
  const title = titleKey ? t(titleKey) : '';
  const subtitle = subtitleKey ? t(subtitleKey) : '';
  const { navigateBack } = useUI();
  const { articles, loading, fetchArticles } = useMagazine();

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchArticles();
  }, [fetchArticles]);

  const sectionArticles = useMemo(() => {
    if (!articles) return [];
    return articles.filter(article => article.category_article === category || inSection(article, sectionKey));
  }, [articles, category, sectionKey]);

  return (
    <div className="category-section-page">
      <div className="category-section-container">
        <header className="category-section-header">
          <div className="category-section-header-content">
            <h1>{title}</h1>
            {subtitle && <p className="category-section-subtitle">{subtitle}</p>}
          </div>
        </header>

        {sectionKey && <SectionProjects sectionKey={sectionKey} />}

        {loading && (
          <div className="category-section-loading">
            <div className="category-section-spinner"></div>
            <p>{t('magazine.loadingArticles')}</p>
          </div>
        )}

        {!loading && sectionArticles.length === 0 && (
          <div className="category-section-empty">
            <p>{t('categorySection.empty')}</p>
          </div>
        )}

        {!loading && sectionArticles.length > 0 && (
          <div className="category-section-content">
            <div className="category-section-grid">
              {sectionArticles.map(article => (
                <ArticleCard key={article.id_article} article={article} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CategorySectionPage;
