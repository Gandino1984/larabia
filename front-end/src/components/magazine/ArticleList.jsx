// magazine-front/src/components/magazine/ArticleList.jsx
import { useState } from 'react';
import { useMagazine } from '../../app_context/MagazineContext';
import ArticleCard from './ArticleCard';
import { Search } from 'lucide-react';
import './ArticleList.css';

function ArticleList() {
  const { articles, loading, filters, setFilters } = useMagazine();
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({ ...filters, searchTerm: searchInput });
  };

  const clearSearch = () => {
    setSearchInput('');
    setFilters({ ...filters, searchTerm: '' });
  };

  if (loading) {
    return (
      <div className="article-list-loading">
        <p>Cargando artículos...</p>
      </div>
    );
  }

  return (
    <div className="article-list-container">
      <div className="article-list-search">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Buscar artículos..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            <Search size={20} />
          </button>
        </form>
        {filters.searchTerm && (
          <button className="clear-search" onClick={clearSearch}>
            Limpiar búsqueda
          </button>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="article-list-empty">
          <p>No se encontraron artículos</p>
        </div>
      ) : (
        <div className="article-list-grid">
          {articles.map((article) => (
            <ArticleCard key={article.id_article} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ArticleList;
