// magazine-front/src/App.jsx
import { useState, useCallback, useEffect } from 'react';
import { useUI } from './app_context/UIContext';
import { useMagazine } from './app_context/MagazineContext';
import { useAuth } from './app_context/AuthContext';
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
import CategorySectionPage from './components/magazine/CategorySectionPage';
import WorkshopsList from './components/workshops/WorkshopsList';
import WorkshopDetail from './components/workshops/WorkshopDetail';
import AdminPage from './components/admin/permissions/AdminPage';
import LoginPage from './components/layout/LoginPage';
import ForgotPasswordPage from './components/layout/ForgotPasswordPage';
import CardDisplay from './components/notifications/CardDisplay';
import LoadingScreen from './components/layout/LoadingScreen';
import './App.css';

function App() {
  const { showHome, showArticleDetail, showArticlesList, showEditor, showLogin, showForgotPassword, showAuthors, showAuthorEditor, showAuthorProfile, showAuthorPublications, showProjectDetail, showOpenMic, showMicroPerfiles, showTalleres, showWorkshopDetail, showAdmin, isFullscreen, navigateToArticle } = useUI();
  const { fetchArticleById, featuredLoaded } = useMagazine();
  const { loading: authLoading } = useAuth();
  const { isLoading, progress } = usePreloader();
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [showContent, setShowContent] = useState(false);
  // Capture the deep-linked article id once, before we clean up the URL.
  const [pendingArticleId, setPendingArticleId] = useState(() => {
    const id = new URLSearchParams(window.location.search).get('article');
    return id ? parseInt(id) : null;
  });

  // Open a deep-linked article only after auth has finished restoring the
  // session from localStorage. Otherwise fetchArticleById fires with no
  // x-user-id and the backend hides drafts/pending content (only published
  // articles would load). Waiting lets authors/super admins preview drafts.
  useEffect(() => {
    if (pendingArticleId == null || authLoading) return;
    window.history.replaceState({}, '', '/');
    fetchArticleById(pendingArticleId).then(result => {
      if (result?.success) navigateToArticle();
    });
    setPendingArticleId(null);
  }, [pendingArticleId, authLoading, fetchArticleById, navigateToArticle]);

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
    if (showAdmin) return <AdminPage />;
    if (showProjectDetail) return <ProjectDetail />;
    if (showOpenMic) return <OpenMicPublications />;
    if (showMicroPerfiles) return <CategorySectionPage category="micro-perfiles" titleKey="microperfiles.title" subtitleKey="microperfiles.subtitle" />;
    if (showWorkshopDetail) return <WorkshopDetail />;
    if (showTalleres) return <WorkshopsList />;
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
