// magazine-front/src/components/magazine/FeaturedArticles.jsx
import ArticleCard from './ArticleCard';
import './FeaturedArticles.css';

function FeaturedArticles({ articles }) {
  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <div className="featured-articles">
      {articles.map((article) => (
        <div key={article.id_article} className="featured-article-wrapper">
          <ArticleCard article={article} />
        </div>
      ))}
    </div>
  );
}

export default FeaturedArticles;
