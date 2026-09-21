// magazine-front/src/App.jsx
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, X } from 'lucide-react';
import { useUI } from './app_context/UIContext';
import { useMagazine } from './app_context/MagazineContext';
import { useAuth } from './app_context/AuthContext';
import { usePreloader } from './hooks/usePreloader';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import FloatingEditorButton from './components/layout/FloatingEditorButton';
import AnimatedView from './components/layout/AnimatedView';
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
  const { t } = useTranslation();
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [showContent, setShowContent] = useState(false);
  // Capture the deep-linked article id once, before we clean up the URL.
  const [pendingArticleId, setPendingArticleId] = useState(() => {
    const id = new URLSearchParams(window.location.search).get('article');
    return id ? parseInt(id) : null;
  });
  // Whether this tab was opened as a draft preview from the editor.
  const [isPreview] = useState(
    () => new URLSearchParams(window.location.search).get('preview') === '1'
  );

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
    if (showArticleDetail) return <ArticleDetail previewMode={isPreview} />;
    if (showArticlesList) return <ArticlesList />;
    if (showHome) return <HomePage />;

    // Default
    return <HomePage />;
  };

  // A key that changes whenever the active top-level view changes, so the page
  // entrance animation replays on every navigation.
  const viewKey = (
    (showForgotPassword && 'forgot') ||
    (showLogin && 'login') ||
    (showEditor && 'editor') ||
    (showAuthorEditor && 'authorEditor') ||
    (showAuthorPublications && 'authorPublications') ||
    (showAuthorProfile && 'authorProfile') ||
    (showAuthors && 'authors') ||
    (showAdmin && 'admin') ||
    (showProjectDetail && 'projectDetail') ||
    (showOpenMic && 'openmic') ||
    (showMicroPerfiles && 'microperfiles') ||
    (showWorkshopDetail && 'workshopDetail') ||
    (showTalleres && 'talleres') ||
    (showArticleDetail && 'articleDetail') ||
    (showArticlesList && 'articlesList') ||
    (showHome && 'home') ||
    'home'
  );

  const appClassName = `app ${showContent ? 'content-visible' : ''} ${showEditor || showAuthorEditor ? 'editor-active' : ''} ${isPreview && showArticleDetail ? 'preview-active' : ''}`;
  console.log('App render - showContent:', showContent, 'className:', appClassName);

  const handleClosePreview = useCallback(() => {
    // The editor is still open in the tab that spawned this preview, so the
    // cleanest "back to editor" is to close this preview tab. If the browser
    // refuses (e.g. tab wasn't script-opened), fall back to going home.
    window.close();
    window.location.href = '/';
  }, []);

  return (
    <>
      {isPreview && showArticleDetail && (
        <div className="preview-banner" role="status">
          <span className="preview-banner__label">
            <Eye size={18} />
            {t('preview.banner.label')}
          </span>
          <button type="button" className="preview-banner__back" onClick={handleClosePreview}>
            <X size={16} />
            {t('preview.banner.back')}
          </button>
        </div>
      )}

      {showLoadingScreen && (
        <LoadingScreen
          isLoading={isLoading}
          progress={progress}
          onLoadingComplete={handleLoadingComplete}
        />
      )}

      <div className={appClassName}>
        {!isPreview && !showEditor && !showAuthorEditor && !isFullscreen && <Header />}
        {!isPreview && <FloatingEditorButton />}
        {!isPreview && <CardDisplay />}
        <main className="main-content">
          <AnimatedView key={viewKey}>
            {renderMainContent()}
          </AnimatedView>
        </main>
        {!isPreview && !showEditor && !showAuthorEditor && !isFullscreen && <Footer />}
      </div>
    </>
  );
}

export default App;
