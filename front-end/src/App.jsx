// magazine-front/src/App.jsx
import { useState, useCallback, useEffect } from 'react';
import { useUI } from './app_context/UIContext';
import { useMagazine } from './app_context/MagazineContext';
import { usePreloader } from './hooks/usePreloader';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import FloatingEditorButton from './components/layout/FloatingEditorButton';
import HomePage from './components/magazine/HomePage';
import ArticleDetail from './components/magazine/ArticleDetail';
import ArticlesList from './components/magazine/ArticlesList';
import ArticleEditorBlocks from './components/admin/ArticleEditorBlocks';
import AuthorsList from './components/authors/AuthorsList';
import AuthorProfileEditor from './components/authors/AuthorProfileEditor';
import AuthorProfileReader from './components/authors/AuthorProfileReader';
import AuthorPublications from './components/authors/AuthorPublications';
import ProjectDetail from './components/magazine/ProjectDetail';
import OpenMicPublications from './components/openmic/OpenMicPublications';
import HumorPublications from './components/humor/HumorPublications';
import LoginPage from './components/layout/LoginPage';
import ForgotPasswordPage from './components/layout/ForgotPasswordPage';
import CardDisplay from './components/notifications/CardDisplay';
import LoadingScreen from './components/layout/LoadingScreen';
import './App.css';

function App() {
  const { showHome, showArticleDetail, showArticlesList, showEditor, showLogin, showForgotPassword, showAuthors, showAuthorEditor, showAuthorProfile, showAuthorPublications, showProjectDetail, showOpenMic, showHumor, isFullscreen, navigateToArticle } = useUI();
  const { fetchArticleById, featuredLoaded } = useMagazine();
  const { isLoading, progress } = usePreloader();
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('article');
    if (articleId) {
      window.history.replaceState({}, '', '/');
      fetchArticleById(parseInt(articleId)).then(result => {
        if (result?.success) navigateToArticle();
      });
    }
  }, []);

  // Start showing content as soon as preloader finishes (while LoadingScreen is still fading out)
  useEffect(() => {
    if (!isLoading) {
      setShowContent(true);
    }
  }, [isLoading]);

  // Safety net: if data is ready but preloader got stuck, show content anyway
  useEffect(() => {
    if (featuredLoaded) {
      setShowContent(true);
    }
  }, [featuredLoaded]);

  const handleLoadingComplete = useCallback(() => {
    // Loading screen has finished fading out — just remove it from the DOM
    setShowLoadingScreen(false);
  }, []);

  const renderMainContent = () => {
    // Priority-based rendering
    if (showForgotPassword) return <ForgotPasswordPage />;
    if (showLogin) return <LoginPage />;
    if (showEditor) return <ArticleEditorBlocks />;
    if (showAuthorEditor) return <AuthorProfileEditor />;
    if (showAuthorPublications) return <AuthorPublications />;
    if (showAuthorProfile) return <AuthorProfileReader />;
    if (showAuthors) return <AuthorsList />;
    if (showProjectDetail) return <ProjectDetail />;
    if (showOpenMic) return <OpenMicPublications />;
    if (showHumor) return <HumorPublications />;
    if (showArticleDetail) return <ArticleDetail />;
    if (showArticlesList) return <ArticlesList />;
    if (showHome) return <HomePage />;

    // Default
    return <HomePage />;
  };

  const appClassName = `app ${showContent ? 'content-visible' : ''} ${showEditor || showAuthorEditor ? 'editor-active' : ''}`;
  console.log('App render - showContent:', showContent, 'className:', appClassName);

  return (
    <>
      {showLoadingScreen && (
        <LoadingScreen
          isLoading={isLoading}
          progress={progress}
          onLoadingComplete={handleLoadingComplete}
        />
      )}

      <div className={appClassName}>
        {!showEditor && !showAuthorEditor && !isFullscreen && <Header />}
        <FloatingEditorButton />
        <CardDisplay />
        <main className="main-content">
          {renderMainContent()}
        </main>
        {!showEditor && !showAuthorEditor && !isFullscreen && <Footer />}
      </div>
    </>
  );
}

export default App;
