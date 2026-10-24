// magazine-front/src/App.jsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, X } from 'lucide-react';
import { useUI } from './app_context/UIContext';
import { useMagazine } from './app_context/MagazineContext';
import { useAuth } from './app_context/AuthContext';
import { useWorkshop } from './app_context/WorkshopContext';
import { usePreloader } from './hooks/usePreloader';
import axiosInstance from './utils/axiosConfig';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import FloatingLanguage from './components/layout/FloatingLanguage';
import SubscribeButton from './components/layout/SubscribeButton';
import AnimatedView from './components/layout/AnimatedView';
import HomePage from './components/magazine/HomePage';
import ArticleDetail from './components/magazine/ArticleDetail';
import ArticlesList from './components/magazine/ArticlesList';
import ProjectsList from './components/magazine/ProjectsList';
import ArticleEditorBlocks from './components/admin/ArticleEditorBlocks';
import WorkshopEditor from './components/workshops/WorkshopEditor';
import AuthorsList from './components/authors/AuthorsList';
import AuthorProfileEditor from './components/authors/AuthorProfileEditor';
import AuthorProfileReader from './components/authors/AuthorProfileReader';
import AuthorPublications from './components/authors/AuthorPublications';
import ProjectDetail from './components/magazine/ProjectDetail';
import OpenMicPublications from './components/openmic/OpenMicPublications';
import CategorySectionPage from './components/magazine/CategorySectionPage';
import AboutRabia from './components/magazine/AboutRabia';
import WorkshopsList from './components/workshops/WorkshopsList';
import WorkshopDetail from './components/workshops/WorkshopDetail';
import GalleryPage from './components/gallery/GalleryPage';
import ExhibitionPage from './components/gallery/ExhibitionPage';
import MyGallery from './components/gallery/MyGallery';
import GalleryInvitationModal from './components/gallery/GalleryInvitationModal';
import AdminPage from './components/admin/permissions/AdminPage';
import LoginPage from './components/layout/LoginPage';
import ForgotPasswordPage from './components/layout/ForgotPasswordPage';
import CardDisplay from './components/notifications/CardDisplay';
import LoadingScreen from './components/layout/LoadingScreen';
import UserInfoCard from './components/user/UserInfoCard';
import AuthorInvitationModal from './components/authors/AuthorInvitationModal';
import { useAuthor } from './app_context/AuthorContext';
import './App.css';

function App() {
  const { showHome, showArticleDetail, showArticlesList, showProjectsList, showGallery, showExhibition, showMyGallery, galleryView, showEditor, showLogin, showForgotPassword, showAuthors, showAuthorEditor, showAuthorProfile, showAuthorPublications, showProjectDetail, showOpenMic, showMicroPerfiles, showTalleres, showWorkshopDetail, showWorkshopEditor, showAbout, showAdmin, isFullscreen, navigateToArticle, navigateToTalleres, navigateToWorkshopDetail, showSuccess, showError, authorCardUser, closeAuthorCard } = useUI();
  const { fetchArticleById, featuredLoaded } = useMagazine();
  const { authorProfiles, fetchAllProfiles, authorPhotoOf } = useAuthor();
  const { currentUser, setUser, loading: authLoading } = useAuth();
  const { fetchWorkshopById, setFocusWorkshopId } = useWorkshop();
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

  // «Darme de baja» from a newsletter email (?newsletter_unsubscribe=<token>):
  // no sign-in needed. If it's the signed-in reader's, their copy follows.
  const unsubscribeHandled = useRef(false);
  useEffect(() => {
    if (unsubscribeHandled.current || authLoading) return;
    const token = new URLSearchParams(window.location.search).get('newsletter_unsubscribe');
    if (!token) return;
    unsubscribeHandled.current = true;
    window.history.replaceState({}, '', '/');
    axiosInstance.post(`/user/newsletter/unsubscribe/${encodeURIComponent(token)}`)
      .then((res) => {
        if (currentUser && res.data?.data?.id_user === currentUser.id_user) {
          setUser({ ...currentUser, receives_newsletter: false });
        }
        showSuccess(t('newsletter.unsubscribedByLink', 'Te has dado de baja: ya no recibirás las recomendaciones por correo.'));
      })
      .catch((err) => showError(err.response?.data?.error || t('newsletter.error')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // A shared workshop link (?workshop=<id>, WorkshopOptions). Opening a
  // workshop needs an account: signed out, the reader lands on its card in
  // Talleres (public — WorkshopsList finds and highlights it) with a note to
  // sign in, and the workshop opens as soon as they have.
  const [pendingWorkshopId, setPendingWorkshopId] = useState(() => {
    const id = new URLSearchParams(window.location.search).get('workshop');
    return id ? parseInt(id, 10) : null;
  });
  const showedSharedWorkshop = useRef(false);
  useEffect(() => {
    if (pendingWorkshopId == null || authLoading) return;
    if (new URLSearchParams(window.location.search).has('workshop')) {
      window.history.replaceState({}, '', '/');
    }
    if (!currentUser) {
      if (!showedSharedWorkshop.current) {
        showedSharedWorkshop.current = true;
        setFocusWorkshopId(pendingWorkshopId);
        navigateToTalleres();
      }
      return;
    }
    setPendingWorkshopId(null);
    fetchWorkshopById(pendingWorkshopId).then((res) => {
      if (res?.success) navigateToWorkshopDetail();
      else navigateToTalleres();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingWorkshopId, authLoading, currentUser]);

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

  // True once the loading screen is gone and content is visible — used to
  // sequence the entrance animations (header → create button → hero).
  const appReady = showContent && !showLoadingScreen;

  const renderMainContent = () => {
    // Priority-based rendering
    if (showForgotPassword) return <ForgotPasswordPage />;
    if (showLogin) return <LoginPage />;
    if (showEditor) return <ArticleEditorBlocks />;
    if (showWorkshopEditor) return <WorkshopEditor />;
    if (showAuthorEditor) return <AuthorProfileEditor />;
    if (showAuthorPublications) return <AuthorPublications />;
    if (showAuthorProfile) return <AuthorProfileReader />;
    if (showAuthors) return <AuthorsList />;
    if (showAdmin) return <AdminPage />;
    if (showProjectDetail) return <ProjectDetail />;
    if (showOpenMic) return <OpenMicPublications />;
    if (showMicroPerfiles) return <CategorySectionPage category="micro-perfiles" sectionKey="microperfiles" titleKey="microperfiles.title" subtitleKey="microperfiles.subtitle" />;
    if (showWorkshopDetail) return <WorkshopDetail />;
    if (showTalleres) return <WorkshopsList />;
    if (showProjectsList) return <ProjectsList />;
    if (showGallery) return <GalleryPage />;
    if (showExhibition) return <ExhibitionPage key={galleryView.exhibitionId} />;
    if (showMyGallery) return <MyGallery key={`${galleryView.tab}-${galleryView.conversationId}-${galleryView.forUser?.id_user || ''}`} />;
    if (showAbout) return <AboutRabia />;
    if (showArticleDetail) return <ArticleDetail previewMode={isPreview} />;
    if (showArticlesList) return <ArticlesList />;
    if (showHome) return <HomePage ready={appReady} />;

    // Default
    return <HomePage ready={appReady} />;
  };

  // A key that changes whenever the active top-level view changes, so the page
  // entrance animation replays on every navigation.
  const viewKey = (
    (showForgotPassword && 'forgot') ||
    (showLogin && 'login') ||
    (showEditor && 'editor') ||
    (showWorkshopEditor && 'workshopEditor') ||
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
    (showProjectsList && 'projectsList') ||
    (showGallery && 'gallery') ||
    (showExhibition && `exhibition-${galleryView.exhibitionId}`) ||
    (showMyGallery && 'myGallery') ||
    (showAbout && 'about') ||
    (showArticleDetail && 'articleDetail') ||
    (showArticlesList && 'articlesList') ||
    (showHome && 'home') ||
    'home'
  );

  const appClassName = `app ${showContent ? 'content-visible' : ''} ${showEditor || showAuthorEditor || showWorkshopEditor ? 'editor-active' : ''} ${isPreview && showArticleDetail ? 'preview-active' : ''}`;
  console.log('App render - showContent:', showContent, 'className:', appClassName);

  const handleClosePreview = useCallback(() => {
    // The editor is still open in the tab that spawned this preview, so the
    // cleanest "back to editor" is to close this preview tab. If the browser
    // refuses (e.g. tab wasn't script-opened), fall back to going home.
    window.close();
    window.location.href = '/';
  }, []);

  // Author info card (opened by clicking an author anywhere). Make sure the
  // profiles are loaded so we can show the author's bio and full details.
  useEffect(() => {
    if (authorCardUser && authorProfiles.length === 0) fetchAllProfiles();
  }, [authorCardUser, authorProfiles.length, fetchAllProfiles]);

  const authorCardProfile = authorCardUser
    ? authorProfiles.find((p) => String(p.user_id) === String(authorCardUser.id_user))
    : null;
  const authorCardResolvedUser = authorCardProfile?.user
    ? {
        ...authorCardProfile.user,
        name_user: authorCardUser.name_user || authorCardProfile.user.name_user,
        image_user: authorCardProfile.user.image_user || authorCardUser.image_user,
      }
    : authorCardUser;
  const authorCardBio = authorCardProfile?.bio_text;

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
        {!isPreview && !showEditor && !showAuthorEditor && !showWorkshopEditor && !isFullscreen && <Header ready={appReady} />}
        {/* The language picker, outside the bar at the top left (computers and
            tablets) — also on an article, where the bar hides. */}
        {!isPreview && !showEditor && !showAuthorEditor && !showWorkshopEditor && !isFullscreen && (
          <FloatingLanguage ready={appReady} cornered={showArticleDetail} />
        )}
        {!isPreview && <SubscribeButton ready={appReady} />}
        {!isPreview && <CardDisplay />}
        <main className="main-content">
          <AnimatedView key={viewKey}>
            {renderMainContent()}
          </AnimatedView>
        </main>
        {!isPreview && !showEditor && !showAuthorEditor && !showWorkshopEditor && !isFullscreen && <Footer />}
      </div>

      {!isPreview && <AuthorInvitationModal />}
      {!isPreview && <GalleryInvitationModal />}

      {authorCardUser && (
        <UserInfoCard
          user={authorCardResolvedUser}
          imageUrl={authorPhotoOf(authorCardResolvedUser)}
          bioText={authorCardBio}
          onClose={closeAuthorCard}
          isOwner={false}
        />
      )}
    </>
  );
}

export default App;
