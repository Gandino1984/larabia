// magazine-front/src/app_context/UIContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  // Navigation states
  const [showHome, setShowHome] = useState(true);
  const [showArticleDetail, setShowArticleDetail] = useState(false);
  const [showArticlesList, setShowArticlesList] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showAuthors, setShowAuthors] = useState(false);
  const [showAuthorEditor, setShowAuthorEditor] = useState(false);
  const [showAuthorProfile, setShowAuthorProfile] = useState(false);
  const [showAuthorPublications, setShowAuthorPublications] = useState(false);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [showOpenMic, setShowOpenMic] = useState(false);
  const [showHumor, setShowHumor] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [openEditorToEdit, setOpenEditorToEdit] = useState(false);

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

  // Newsletter modal
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const openNewsletterModal = useCallback(() => setShowNewsletterModal(true), []);
  const closeNewsletterModal = useCallback(() => setShowNewsletterModal(false), []);

  // Navigation history (to track where user came from)
  const [previousView, setPreviousView] = useState('home');

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
    setShowEditor(false);
    setShowLogin(false);
    setShowForgotPassword(false);
    setShowAuthors(false);
    setShowAuthorEditor(false);
    setShowAuthorProfile(false);
    setShowAuthorPublications(false);
    setShowProjectDetail(false);
    setShowOpenMic(false);
    setShowHumor(false);
    setShowAdmin(false);
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

  const navigateToArticlesList = () => {
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
        navigateToArticlesList();
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
    setShowEditor(true);
  };

  const navigateToEditorForEdit = () => {
    resetAllViews();
    setOpenEditorToEdit(true);
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
    setPreviousView('home');
    resetAllViews();
    setShowProjectDetail(true);
  };

  const navigateToOpenMic = () => {
    setPreviousView('home');
    resetAllViews();
    setShowOpenMic(true);
  };

  const navigateToHumor = () => {
    setPreviousView('home');
    resetAllViews();
    setShowHumor(true);
  };

  const navigateToAdmin = () => {
    setPreviousView('home');
    resetAllViews();
    setShowAdmin(true);
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

    // Navigation methods
    navigateToHome,
    navigateToArticle,
    navigateToArticleDetail,
    navigateToArticlesList,
    navigateToEditor,
    navigateToEditorForEdit,
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
    showOpenMic,
    navigateToOpenMic,
    showHumor,
    navigateToHumor,
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
