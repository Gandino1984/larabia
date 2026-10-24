// magazine-front/src/app_context/UIContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  // Navigation states
  const [showHome, setShowHome] = useState(true);
  const [showArticleDetail, setShowArticleDetail] = useState(false);
  const [showArticlesList, setShowArticlesList] = useState(false);
  // The projects page (ProjectsList) — the top bar's «Proyectos».
  const [showProjectsList, setShowProjectsList] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showAuthors, setShowAuthors] = useState(false);
  const [showAuthorEditor, setShowAuthorEditor] = useState(false);
  const [showAuthorProfile, setShowAuthorProfile] = useState(false);
  const [showAuthorPublications, setShowAuthorPublications] = useState(false);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [showOpenMic, setShowOpenMic] = useState(false);
  const [showMicroPerfiles, setShowMicroPerfiles] = useState(false);
  const [showTalleres, setShowTalleres] = useState(false);
  // The Galería: the exhibitions, one exhibition (galleryView.exhibitionId;
  // chat: open the chat with its artist), and the artist's own «Mi galería»
  // (galleryView.tab: 'works' | 'messages', conversationId: one to open).
  const [showGallery, setShowGallery] = useState(false);
  const [showExhibition, setShowExhibition] = useState(false);
  const [showMyGallery, setShowMyGallery] = useState(false);
  const [galleryView, setGalleryView] = useState({ exhibitionId: null, chat: false, tab: 'works', conversationId: null });
  const [showWorkshopDetail, setShowWorkshopDetail] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  // The tab Admin opens on (navigateToAdmin('workshops')…).
  const [adminTab, setAdminTab] = useState('users');
  // The workshop editor (WorkshopEditor): the workshop it edits (null = a new
  // one), its first view ('wizard' | 'mine' = «Mis talleres») and where its
  // close button returns ('talleres' | 'workshopDetail' | 'admin').
  const [showWorkshopEditor, setShowWorkshopEditor] = useState(false);
  const [workshopEditor, setWorkshopEditor] = useState({ workshop: null, view: 'wizard', returnTo: 'talleres' });
  const [openEditorToEdit, setOpenEditorToEdit] = useState(false);
  // Publication creator: which view it opens on ('wizard' = the step-by-step
  // creator, 'mine' = "Mis publicaciones"), and where its close button returns
  // ('home' | 'articlesList').
  const [editorInitialView, setEditorInitialView] = useState('wizard');
  const [editorReturnTo, setEditorReturnTo] = useState('home');

  // Selected data for views
  const [selectedAuthorProfile, setSelectedAuthorProfile] = useState(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState(null);

  // Super admin: profile being edited (null = editing own profile)
  const [superAdminEditingProfile, setSuperAdminEditingProfile] = useState(null);

  // Fullscreen state for HScrollViewer
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Contact modal
  const [showContactModal, setShowContactModal] = useState(false);
  const openContactModal = useCallback(() => setShowContactModal(true), []);
  const closeContactModal = useCallback(() => setShowContactModal(false), []);

  // Recommendations modal (admins: send article recommendations to the
  // newsletter subscribers) — opened from the header's "Más" menu.
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);
  const openRecommendationsModal = useCallback(() => setShowRecommendationsModal(true), []);
  const closeRecommendationsModal = useCallback(() => setShowRecommendationsModal(false), []);

  // Newsletter modal
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const openNewsletterModal = useCallback(() => setShowNewsletterModal(true), []);
  const closeNewsletterModal = useCallback(() => setShowNewsletterModal(false), []);

  // Author info card (opened by clicking an author's name/avatar anywhere).
  const [authorCardUser, setAuthorCardUser] = useState(null);
  const openAuthorCard = useCallback((user) => { if (user) setAuthorCardUser(user); }, []);
  const closeAuthorCard = useCallback(() => setAuthorCardUser(null), []);

  // Navigation history (to track where user came from)
  const [previousView, setPreviousView] = useState('home');
  // Dedicated origin for the project detail view. The single `previousView`
  // above gets overwritten when you open an article from inside a project, so
  // the project's own "Volver" needs its own remembered origin.
  const [projectBackView, setProjectBackView] = useState('home');
  // The magazine section (header button such as «Internacional») the
  // «Artículos» list is showing, or null for all of it. Kept while the reader
  // opens a publication from it and comes back.
  const [articlesSection, setArticlesSection] = useState(null);

  // Card notification states
  const [error, setError] = useState({ databaseResponseError: '', imageError: '', articleError: '', userError: '' });
  const [success, setSuccess] = useState({ databaseResponseSuccess: '', imageSuccess: '', articleSuccess: '', userSuccess: '' });
  const [info, setInfo] = useState({ databaseResponseInfo: '', imageInfo: '', articleInfo: '', userInfo: '' });
  const [infoIconType, setInfoIconType] = useState(null);

  const [showErrorCard, setShowErrorCard] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [showInfoCard, setShowInfoCard] = useState(false);

  // Card history tracking
  const [cardHistory, setCardHistory] = useState([]);

  // Uploading state for image uploads
  const [uploading, setUploading] = useState(false);

  // Language management
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(
    localStorage.getItem('userLanguage') || 'es'
  );

  const changeLanguage = useCallback((lng) => {
    i18n.changeLanguage(lng);
    setCurrentLanguage(lng);
    localStorage.setItem('userLanguage', lng);
  }, [i18n]);

  const getCurrentLocale = useCallback(() => {
    const localeMap = {
      es: 'es-ES',
      en: 'en-US',
      eu: 'eu-ES'
    };
    return localeMap[currentLanguage] || 'es-ES';
  }, [currentLanguage]);

  // Navigation helpers
  const resetAllViews = () => {
    setShowHome(false);
    setShowArticleDetail(false);
    setShowArticlesList(false);
    setShowProjectsList(false);
    setShowEditor(false);
    setShowLogin(false);
    setShowForgotPassword(false);
    setShowAuthors(false);
    setShowAuthorEditor(false);
    setShowAuthorProfile(false);
    setShowAuthorPublications(false);
    setShowProjectDetail(false);
    setShowOpenMic(false);
    setShowMicroPerfiles(false);
    setShowTalleres(false);
    setShowWorkshopDetail(false);
    setShowGallery(false);
    setShowExhibition(false);
    setShowMyGallery(false);
    setShowAbout(false);
    setShowAdmin(false);
    setShowWorkshopEditor(false);
  };

  const navigateToHome = () => {
    resetAllViews();
    setShowHome(true);
  };

  const navigateToArticle = () => {
    if (showHome) setPreviousView('home');
    else if (showArticlesList) setPreviousView('articlesList');
    else if (showEditor) setPreviousView('editor');
    else if (showProjectDetail) setPreviousView('projectDetail');
    resetAllViews();
    setShowArticleDetail(true);
  };

  const navigateToArticleDetail = (article) => {
    if (showHome) setPreviousView('home');
    else if (showArticlesList) setPreviousView('articlesList');
    else if (showEditor) setPreviousView('editor');
    else if (showProjectDetail) setPreviousView('projectDetail');
    resetAllViews();
    setShowArticleDetail(true);
  };

  // `section`: a section key (header button) — anything else (no argument,
  // a click event) means the whole list.
  const navigateToArticlesList = (section) => {
    setArticlesSection(typeof section === 'string' && section ? section : null);
    setPreviousView('home');
    resetAllViews();
    setShowArticlesList(true);
  };
  // Back to the list as it was (same section).
  const returnToArticlesList = () => {
    setPreviousView('home');
    resetAllViews();
    setShowArticlesList(true);
  };

  const navigateBack = () => {
    switch (previousView) {
      case 'authors':
        navigateToAuthors();
        break;
      case 'authorProfile':
        if (selectedAuthorProfile) {
          navigateToAuthorProfile(selectedAuthorProfile);
        } else {
          navigateToAuthors();
        }
        break;
      case 'articlesList':
        returnToArticlesList();
        break;
      case 'editor':
        navigateToEditor();
        break;
      case 'projectDetail':
        resetAllViews();
        setShowProjectDetail(true);
        break;
      case 'home':
      default:
        navigateToHome();
        break;
    }
  };

  const navigateToEditor = () => {
    resetAllViews();
    setOpenEditorToEdit(false);
    setEditorInitialView('wizard');
    setEditorReturnTo('home');
    setShowEditor(true);
  };

  const navigateToEditorForEdit = () => {
    resetAllViews();
    setOpenEditorToEdit(true);
    setEditorInitialView('wizard');
    setEditorReturnTo('home');
    setShowEditor(true);
  };

  // Open the creator on "Mis publicaciones" (the author's own list). `from`
  // is where its close button should return.
  const navigateToMyPublications = (from = 'home') => {
    resetAllViews();
    setOpenEditorToEdit(false);
    setEditorInitialView('mine');
    setEditorReturnTo(from);
    setShowEditor(true);
  };

  const navigateToLogin = () => {
    resetAllViews();
    setShowLogin(true);
  };

  const navigateToForgotPassword = () => {
    resetAllViews();
    setShowForgotPassword(true);
  };

  const navigateToAuthors = () => {
    setPreviousView('home');
    resetAllViews();
    setShowAuthors(true);
  };

  const navigateToAuthorEditor = () => {
    setSuperAdminEditingProfile(null); // own profile
    setPreviousView(showAuthors ? 'authors' : 'home');
    resetAllViews();
    setShowAuthorEditor(true);
  };

  // Super admin: navigate to author editor for a specific author's profile
  const navigateToAuthorEditorForProfile = (profile) => {
    setSuperAdminEditingProfile(profile);
    setPreviousView('authors');
    resetAllViews();
    setShowAuthorEditor(true);
  };

  // Super admin: navigate to author editor to CREATE a profile for an editor without one
  // editorUser = { id_user, name_user, image_user }
  const navigateToAuthorEditorForUser = (editorUser) => {
    // Use a synthetic object so AuthorProfileEditor treats it as "no existing profile"
    // but knows which user to create it for
    setSuperAdminEditingProfile({ _noProfile: true, user: editorUser, user_id: editorUser.id_user });
    setPreviousView('authors');
    resetAllViews();
    setShowAuthorEditor(true);
  };

  const navigateToAuthorProfile = (profile) => {
    setPreviousView('authors');
    setSelectedAuthorProfile(profile);
    resetAllViews();
    setShowAuthorProfile(true);
  };

  const navigateToAuthorPublications = (authorId) => {
    setPreviousView(showAuthorProfile ? 'authorProfile' : 'authors');
    setSelectedAuthorId(authorId);
    resetAllViews();
    setShowAuthorPublications(true);
  };

  const navigateToProjectDetail = () => {
    // Remember the actual page we came from so the project's back button
    // returns there (home, article list, an article, authors, admin, etc.).
    const origin =
      showArticleDetail ? 'articleDetail' :
      showArticlesList ? 'articlesList' :
      showProjectsList ? 'projectsList' :
      showAuthors ? 'authors' :
      showAuthorProfile ? 'authorProfile' :
      showAuthorPublications ? 'authorPublications' :
      showAdmin ? 'admin' :
      showTalleres ? 'talleres' :
      showWorkshopDetail ? 'workshopDetail' :
      showOpenMic ? 'openmic' :
      showMicroPerfiles ? 'microperfiles' :
      'home';
    setProjectBackView(origin);
    setPreviousView('home');
    resetAllViews();
    setShowProjectDetail(true);
  };

  // Back from the project detail view — uses the project's own remembered origin.
  const navigateBackFromProject = () => {
    resetAllViews();
    switch (projectBackView) {
      case 'articlesList': setShowArticlesList(true); break;
      case 'projectsList': setShowProjectsList(true); break;
      case 'articleDetail': setShowArticleDetail(true); break;
      case 'authors': setShowAuthors(true); break;
      case 'authorProfile': setShowAuthorProfile(true); break;
      case 'authorPublications': setShowAuthorPublications(true); break;
      case 'admin': setShowAdmin(true); break;
      case 'talleres': setShowTalleres(true); break;
      case 'workshopDetail': setShowWorkshopDetail(true); break;
      case 'openmic': setShowOpenMic(true); break;
      case 'microperfiles': setShowMicroPerfiles(true); break;
      case 'home':
      default: setShowHome(true); break;
    }
  };

  const navigateToProjectsList = () => {
    setPreviousView('home');
    resetAllViews();
    setShowProjectsList(true);
  };

  const navigateToOpenMic = () => {
    setPreviousView('home');
    resetAllViews();
    setShowOpenMic(true);
  };

  const navigateToMicroPerfiles = () => {
    setPreviousView('home');
    resetAllViews();
    setShowMicroPerfiles(true);
  };

  const navigateToTalleres = () => {
    setPreviousView('home');
    resetAllViews();
    setShowTalleres(true);
  };

  const navigateToGallery = () => {
    setPreviousView('home');
    resetAllViews();
    setShowGallery(true);
  };

  const navigateToExhibition = (exhibitionId, { chat = false } = {}) => {
    setGalleryView((v) => ({ ...v, exhibitionId, chat }));
    resetAllViews();
    setShowExhibition(true);
  };

  const navigateToMyGallery = ({ tab = 'works', conversationId = null } = {}) => {
    setGalleryView((v) => ({ ...v, tab, conversationId }));
    resetAllViews();
    setShowMyGallery(true);
  };

  const navigateToWorkshopDetail = () => {
    setPreviousView('talleres');
    resetAllViews();
    setShowWorkshopDetail(true);
  };

  const navigateToAbout = () => {
    setPreviousView('home');
    resetAllViews();
    setShowAbout(true);
  };

  const navigateToAdmin = (tab) => {
    setPreviousView('home');
    resetAllViews();
    setAdminTab(typeof tab === 'string' ? tab : 'users');
    setShowAdmin(true);
  };

  // The workshop editor, like the publications creator: a workshop to edit
  // (null = create one) or «Mis talleres». `from` = where closing returns.
  const navigateToWorkshopEditor = (workshop = null, from = 'talleres') => {
    resetAllViews();
    setWorkshopEditor({ workshop, view: 'wizard', returnTo: from });
    setShowWorkshopEditor(true);
  };
  const navigateToMyWorkshops = (from = 'talleres') => {
    resetAllViews();
    setWorkshopEditor({ workshop: null, view: 'mine', returnTo: from });
    setShowWorkshopEditor(true);
  };

  // Notification helpers
  const showSuccess = useCallback((message) => {
    setSuccess(prev => ({ ...prev, databaseResponseSuccess: message }));
  }, []);

  const showError = useCallback((message) => {
    setError(prev => ({ ...prev, databaseResponseError: message }));
  }, []);

  const showInfo = useCallback((message, iconType = null) => {
    console.log('UIContext showInfo called with:', message, iconType);
    setInfo(prev => ({ ...prev, databaseResponseInfo: message }));
    setInfoIconType(iconType);
  }, []);

  const clearError = useCallback(() => {
    setError({ databaseResponseError: '', imageError: '', articleError: '', userError: '' });
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccess({ databaseResponseSuccess: '', imageSuccess: '', articleSuccess: '', userSuccess: '' });
  }, []);

  const clearInfo = useCallback(() => {
    setInfo({ databaseResponseInfo: '', imageInfo: '', articleInfo: '', userInfo: '' });
  }, []);

  const addToCardHistory = (type, content) => {
    const newEntry = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date()
    };
    setCardHistory(prev => [newEntry, ...prev].slice(0, 50)); // Keep last 50 notifications
  };

  const value = {
    // Navigation states
    showHome,
    showArticleDetail,
    showArticlesList,
    showEditor,
    showLogin,
    showForgotPassword,
    showAuthors,
    showAuthorEditor,
    showAuthorProfile,
    showAuthorPublications,
    showProjectDetail,
    selectedAuthorProfile,
    selectedAuthorId,
    isFullscreen,
    setIsFullscreen,
    showContactModal,
    openContactModal,
    closeContactModal,
    showNewsletterModal,
    openNewsletterModal,
    closeNewsletterModal,
    showRecommendationsModal,
    openRecommendationsModal,
    closeRecommendationsModal,
    authorCardUser,
    openAuthorCard,
    closeAuthorCard,

    // Navigation methods
    navigateToHome,
    navigateToArticle,
    navigateToArticleDetail,
    navigateToArticlesList,
    articlesSection,
    navigateToEditor,
    navigateToEditorForEdit,
    navigateToMyPublications,
    editorInitialView,
    editorReturnTo,
    openEditorToEdit,
    setOpenEditorToEdit,
    navigateToLogin,
    navigateToForgotPassword,
    navigateToAuthors,
    navigateToAuthorEditor,
    navigateToAuthorEditorForProfile,
    navigateToAuthorEditorForUser,
    superAdminEditingProfile,
    setSuperAdminEditingProfile,
    navigateToAuthorProfile,
    navigateToAuthorPublications,
    navigateToProjectDetail,
    navigateBackFromProject,
    showOpenMic,
    navigateToOpenMic,
    showMicroPerfiles,
    navigateToMicroPerfiles,
    showTalleres,
    showProjectsList,
    showGallery,
    showExhibition,
    showMyGallery,
    galleryView,
    navigateToGallery,
    navigateToExhibition,
    navigateToMyGallery,
    navigateToProjectsList,
    navigateToTalleres,
    showWorkshopDetail,
    navigateToWorkshopDetail,
    showWorkshopEditor,
    workshopEditor,
    navigateToWorkshopEditor,
    navigateToMyWorkshops,
    adminTab,
    showAbout,
    navigateToAbout,
    showAdmin,
    navigateToAdmin,
    navigateBack,

    // Card notifications
    error,
    success,
    info,
    infoIconType,
    setError,
    setSuccess,
    setInfo,
    showError,
    showSuccess,
    showInfo,
    clearError,
    clearSuccess,
    clearInfo,
    showErrorCard,
    showSuccessCard,
    showInfoCard,
    setShowErrorCard,
    setShowSuccessCard,
    setShowInfoCard,
    cardHistory,
    addToCardHistory,
    uploading,
    setUploading,

    // Language management
    currentLanguage,
    changeLanguage,
    getCurrentLocale,
    t
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

export default UIContext;
