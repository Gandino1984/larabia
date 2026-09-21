// magazine-front/src/components/magazine/HomePage.jsx
import { useState, useEffect, useRef } from 'react';
import { useMagazine } from '../../app_context/MagazineContext';
import { useUI } from '../../app_context/UIContext';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import SectionPreviews from './SectionPreviews';
import './HomePage.css';

function AuthorAvatar({ author, getUrl }) {
  const [imgError, setImgError] = useState(false);
  const url = getUrl(author);

  if (!url || imgError) {
    return (
      <span className="hero-author-avatar hero-author-avatar--fallback">
        {author.name_user?.charAt(0)?.toUpperCase() || '?'}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={author.name_user}
      className="hero-author-avatar"
      onError={() => setImgError(true)}
    />
  );
}

function HomePage() {
  const { featuredArticles, setSelectedArticle, fetchArticleById } = useMagazine();
  const { navigateToArticle } = useUI();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [brokenImages, setBrokenImages] = useState({});
  // Touch swipe support for the hero (it advances by state, not native scroll,
  // so it needs explicit touch handling to pan sideways with a finger).
  const touchStartX = useRef(null);
  const touchDeltaX = useRef(0);

  // Auto-advance slides every 8 seconds
  useEffect(() => {
    if (!featuredArticles || featuredArticles.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredArticles.length);
    }, 12000);

    return () => clearInterval(interval);
  }, [featuredArticles]);

  const nextSlide = () => {
    if (featuredArticles && featuredArticles.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % featuredArticles.length);
    }
  };

  const prevSlide = () => {
    if (featuredArticles && featuredArticles.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + featuredArticles.length) % featuredArticles.length);
    }
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Swipe to change slides on touch devices.
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const handleTouchMove = (e) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const handleTouchEnd = () => {
    const dx = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    if (Math.abs(dx) < 40) return; // ignore taps / tiny drags
    if (dx < 0) nextSlide();
    else prevSlide();
  };

  const handleArticleClick = async (article) => {
    // Load the full, canonical article by id (same path as an article card /
    // deep link) so the detail always has the complete data — the featured
    // object alone was leaving the description empty in the detail view.
    setSelectedArticle(article); // instant paint with what we have
    if (article?.id_article && fetchArticleById) {
      await fetchArticleById(article.id_article);
    }
    navigateToArticle();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAuthorImageUrl = (author) => {
    const img = author?.image_user;
    if (!img) return null;
    if (img.startsWith('http://') || img.startsWith('https://')) return img;
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
    return `${apiUrl}/user/image/${encodeURIComponent(img)}`;
  };

  const getCoverImageUrl = (article) => {
    const cover = article?.cover_image_article;
    if (!cover) return '/logoFondoNegro.jpg';
    if (cover.startsWith('http://') || cover.startsWith('https://')) return cover;
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
    return `${apiUrl}${cover.startsWith('/') ? cover : '/' + cover}`;
  };

  const currentArticle = featuredArticles?.[currentSlide];

  return (
    <div className="home-page">
      {/* Hero Section with Featured Articles Slider */}
      <section className="hero-section">
        {currentArticle ? (
          <div
            className="hero-slider"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="hero-slide"
              style={{
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.88)), url(${brokenImages[currentArticle.id_article] ? '/logoFondoNegro.jpg' : getCoverImageUrl(currentArticle)})`
              }}
              onClick={() => handleArticleClick(currentArticle)}
            >
              {/* Hidden img to detect broken cover images and fall back to logo */}
              <img
                src={getCoverImageUrl(currentArticle)}
                alt=""
                style={{ display: 'none' }}
                onError={() => setBrokenImages(prev => ({ ...prev, [currentArticle.id_article]: true }))}
              />
              <div className="hero-content">
                {currentArticle.project_title && (
                  <span className="hero-project-label">Proyecto: {currentArticle.project_title}</span>
                )}
                <h1 className="hero-title">{currentArticle.title_article}</h1>
                {currentArticle.excerpt_article && (
                  <p className="hero-excerpt">{currentArticle.excerpt_article}</p>
                )}
                <div className="hero-meta">
                  {currentArticle.date_published && (
                    <span className="meta-item">
                      <Calendar size={18} />
                      {formatDate(currentArticle.date_published)}
                    </span>
                  )}
                  {(currentArticle.authors?.length > 0 || currentArticle.author_name) && (
                    <span className="meta-item hero-authors">
                      {currentArticle.authors?.length > 0
                        ? currentArticle.authors.map((author) => (
                            <span key={author.id_user} className="hero-author">
                              <AuthorAvatar author={author} getUrl={getAuthorImageUrl} />
                              <span className="hero-author-name">{author.name_user}</span>
                            </span>
                          ))
                        : <span className="hero-author-name">{currentArticle.author_name}</span>
                      }
                    </span>
                  )}
                  {currentArticle.category_article && currentArticle.category_article.toLowerCase() !== 'general' && (
                    <span className="hero-category">{currentArticle.category_article}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            {featuredArticles && featuredArticles.length > 1 && (
              <>
                <button className="hero-nav prev" onClick={(e) => { e.stopPropagation(); prevSlide(); }}>
                  <ChevronLeft size={32} />
                </button>
                <button className="hero-nav next" onClick={(e) => { e.stopPropagation(); nextSlide(); }}>
                  <ChevronRight size={32} />
                </button>

                {/* Slide Indicators */}
                <div className="hero-indicators">
                  {featuredArticles.map((_, index) => (
                    <button
                      key={index}
                      className={`indicator ${index === currentSlide ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); goToSlide(index); }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="hero-slide hero-default">
            <div className="hero-content">
              <img
                src="/LogoLaRabiaWhite.png"
                alt="La Rabia"
                className="hero-logo"
              />
            </div>
          </div>
        )}
      </section>

      {/* Section previews: full-width slideshows per header-bar button */}
      <SectionPreviews />
    </div>
  );
}

export default HomePage;
