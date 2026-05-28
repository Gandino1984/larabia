// magazine-front/src/components/layout/Header.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { useAuthor } from '../../app_context/AuthorContext';
import { useMetadata } from '../../app_context/MetadataContext';
import { useNav } from '../../app_context/NavContext';
import { useNavActions } from '../../app_context/navActions';
import { navLabel, canSeeNavItem } from '../../app_context/navConfig';
import { User, LogOut, Menu, X, Trash2, Plus, FolderPlus, Search, ChevronDown, Globe, Shield } from 'lucide-react';
import UserInfoCard from '../user/UserInfoCard';
import LanguageSelector from './LanguageSelector';
import NavGroupDropdown from './NavGroupDropdown';
import AnimatedLogo from './AnimatedLogo';
import ContactModal from '../contact/ContactModal';
import NewsletterModal from '../newsletter/NewsletterModal';
import './Header.css';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

function AuthorResultAvatar({ profile }) {
  const [imgError, setImgError] = useState(false);
  const img = profile.user?.image_user;
  const src = img
    ? (img.startsWith('http://') || img.startsWith('https://') ? img : `${apiBaseUrl}/user/image/${encodeURIComponent(img)}`)
    : null;

  if (!src || imgError) {
    return (
      <span className="search-result-author-avatar search-result-author-avatar--fallback">
        {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={profile.display_name}
      className="search-result-author-avatar"
      onError={() => setImgError(true)}
    />
  );
}

function Header() {
  const { t } = useTranslation();
  const { currentUser, canCreateContent, isEditor, isAdmin, isSuperAdmin, logout } = useAuth();
  const { showArticleDetail, showAuthors, navigateToHome, navigateToArticlesList, navigateToLogin, navigateBack, navigateToEditor, navigateToAuthors, navigateToProjectDetail, navigateToOpenMic, navigateToHumor, navigateToAdmin, showSuccess, showError, navigateToArticle, currentLanguage, changeLanguage, showContactModal, openContactModal, closeContactModal, showNewsletterModal, openNewsletterModal, closeNewsletterModal, navigateToAuthorProfile } = useUI();
  const { selectedArticle, deleteArticle, allArticles, projects, fetchProjects, setSelectedProject, setSelectedArticle, setFilters } = useMagazine();
  const { setAuthorSearch, authorProfiles, fetchAllProfiles } = useAuthor();
  const { metadata, resolveLogoUrl } = useMetadata();
  const { navConfig } = useNav();
  const runNavAction = useNavActions();
  const [showUserCard, setShowUserCard] = useState(false);
  const [isHeaderActive, setIsHeaderActive] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const [showMobileProjectsDropdown, setShowMobileProjectsDropdown] = useState(false);
  const [expandedMobileGroup, setExpandedMobileGroup] = useState(null);
  const searchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const projectsDropdownRef = useRef(null);

  // Configurable top-bar items the current user may see (visibility + role).
  const roleFlags = { isEditor, isAdmin, isSuperAdmin };
  const visibleNavItems = (navConfig || []).filter(
    (item) => item.visible !== false && canSeeNavItem(item, roleFlags)
  );
  // Run a link item's action (also used for group children); close the mobile menu.
  const handleNavItemSelect = (item) => {
    runNavAction(item.action);
    setIsMobileMenuOpen(false);
    setShowProjectsDropdown(false);
  };

  // Reset image load error and update timestamp when user changes
  useEffect(() => {
    setImageLoadError(false);
    setImageTimestamp(Date.now());
  }, [currentUser?.id_user, currentUser?.image_user]);


  // Construct user profile image URL with cache-busting
  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
  const userImageUrl = currentUser?.image_user
    ? `${apiUrl}/user/image/${encodeURIComponent(currentUser.image_user)}?_t=${imageTimestamp}`
    : null;

  const handleLogoClick = () => {
    navigateToHome();
    setIsMobileMenuOpen(false);
  };

  const handleLoginClick = () => {
    navigateToLogin();
    setIsMobileMenuOpen(false);
  };

  const handleArticlesClick = () => {
    navigateToArticlesList();
    setIsMobileMenuOpen(false);
  };

  const handleUserClick = () => {
    setShowUserCard(true);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigateToHome();
    setIsMobileMenuOpen(false);
  };

  const handleProyectosClick = () => {
    if (projects.length === 0) fetchProjects();
    setShowProjectsDropdown(prev => !prev);
  };

  const handleMobileProyectosClick = () => {
    if (projects.length === 0) fetchProjects();
    setShowMobileProjectsDropdown(prev => !prev);
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    navigateToProjectDetail();
    setShowProjectsDropdown(false);
    setIsMobileMenuOpen(false);
  };

  const handleAutorasClick = () => {
    navigateToAuthors();
    setIsMobileMenuOpen(false);
  };

  const handleGaleriaClick = () => {
    // TODO: Navigate to Galería section
    console.log('Galería clicked');
    setIsMobileMenuOpen(false);
  };

  const handleInternacionalClick = () => {
    setFilters({ category: 'internacional', searchTerm: '' });
    navigateToArticlesList();
    setIsMobileMenuOpen(false);
  };

  const handleContactoClick = () => {
    openContactModal();
    setIsMobileMenuOpen(false);
  };

  const handleNewsletterClick = () => {
    openNewsletterModal();
    setIsMobileMenuOpen(false);
  };

  const handleMicroAbiertoClick = () => {
    navigateToOpenMic();
    setIsMobileMenuOpen(false);
  };

  const handleHumorClick = () => {
    navigateToHumor();
    setIsMobileMenuOpen(false);
  };

  const handleEditorialClick = () => {
    // TODO: Navigate to Editorial section
    console.log('Editorial clicked');
    setIsMobileMenuOpen(false);
  };

  const handleAdminClick = () => {
    navigateToAdmin();
    setIsMobileMenuOpen(false);
  };

  const handleLanguageChange = (langCode) => {
    changeLanguage(langCode);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleBackClick = () => {
    navigateBack();
  };

  const handleDeleteClick = async () => {
    if (!selectedArticle) return;

    if (!confirm(t('article.detail.confirmDelete', { title: selectedArticle.title_article }))) {
      return;
    }

    const result = await deleteArticle(selectedArticle.id_article);
    if (!result.error) {
      showSuccess(t('messages.success.articleDeleted'));
      navigateToHome();
    } else {
      showError(result.error || t('messages.error.deleteArticle'));
    }
  };

  const handleCreateProject = () => {
    navigateToEditor();
    setIsMobileMenuOpen(false);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (showAuthors) {
      setAuthorSearch(val);
      setShowSearchResults(false);
    } else {
      setShowSearchResults(val.length > 0);
    }
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setShowSearchResults(false);
    setAuthorSearch('');
  };

  const handleMobileSearchToggle = () => {
    setShowMobileSearch(!showMobileSearch);
    if (showMobileSearch) {
      setSearchQuery('');
      setShowSearchResults(false);
    }
  };

  const handleArticleResultClick = (article) => {
    setSelectedArticle(article);
    navigateToArticle();
    setSearchQuery('');
    setShowSearchResults(false);
    setIsMobileMenuOpen(false);
  };

  const handleAuthorResultClick = (profile) => {
    navigateToAuthorProfile(profile);
    setSearchQuery('');
    setShowSearchResults(false);
    setIsMobileMenuOpen(false);
  };

  // Filter articles based on search query — uses allArticles to search across all sections
  const searchResults = searchQuery.length > 0 ? allArticles.filter(article => {
    const searchLower = searchQuery.toLowerCase();
    return (
      article.title_article?.toLowerCase().includes(searchLower) ||
      article.excerpt_article?.toLowerCase().includes(searchLower) ||
      article.content_article?.toLowerCase().includes(searchLower) ||
      article.category_article?.toLowerCase().includes(searchLower) ||
      article.author_name?.toLowerCase().includes(searchLower) ||
      article.tags_article?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }) : [];

  // Filter authors based on search query (shown in dropdown on non-authors pages)
  const authorResults = !showAuthors && searchQuery.length > 0 ? authorProfiles.filter(profile => {
    const searchLower = searchQuery.toLowerCase();
    return (
      profile.display_name?.toLowerCase().includes(searchLower) ||
      profile.bio_text?.toLowerCase().includes(searchLower) ||
      profile.specialty_tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }) : [];

  // Clear author search and article dropdown when switching views
  useEffect(() => {
    if (!showAuthors) {
      setAuthorSearch('');
      setSearchQuery('');
      setShowSearchResults(false);
    }
  }, [showAuthors]);

  // Lazy-load author profiles on first search (so editor names appear in dropdown)
  useEffect(() => {
    if (searchQuery.length > 0 && authorProfiles.length === 0) {
      fetchAllProfiles();
    }
  }, [searchQuery]);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
      if (projectsDropdownRef.current && !projectsDropdownRef.current.contains(event.target)) {
        setShowProjectsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={`header ${showArticleDetail ? 'header-hidden' : ''}`}>
      <div
        className={`header-bar ${isHeaderActive ? 'active' : ''}`}
        onMouseEnter={() => setIsHeaderActive(true)}
        onMouseLeave={() => setIsHeaderActive(false)}
        onClick={() => setIsHeaderActive(true)}
      >
        {/* Logo and User Info in single container */}
        <div className="header-logo-user-container">
          <div className="header-logo" onClick={handleLogoClick}>
            <AnimatedLogo
              src={
                isHeaderActive
                  ? (resolveLogoUrl(metadata.logo_dark) || '/logoLaRabiaBlack.png')
                  : (resolveLogoUrl(metadata.logo_light) || '/LogoLaRabiaWhite.png')
              }
              alt={`${metadata.name || 'La Rabia'}${metadata.slogan ? ' — ' + metadata.slogan : ''}`}
              className="logo-image"
            />
          </div>

          <div className="header-user-section">
            {currentUser ? (
              <button className="user-info-btn" onClick={handleUserClick} title={currentUser.name_user}>
                {userImageUrl && !imageLoadError ? (
                  <img
                    src={userImageUrl}
                    alt={currentUser.name_user}
                    className="user-profile-image"
                    onError={() => setImageLoadError(true)}
                  />
                ) : (
                  <User size={20} />
                )}
              </button>
            ) : (
              <button className="login-btn-header" onClick={handleLoginClick} title={t('common.buttons.login')}>
                <User size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Article Actions - Only visible when viewing an article */}
        {showArticleDetail && canCreateContent && (
          <div className="header-article-actions">
            <button className="article-action-btn create-project-btn" onClick={handleCreateProject} title={t('header.user.createArticle')}>
              <FolderPlus size={20} />
            </button>
          </div>
        )}

        {/* Search Bar - Desktop */}
        <div className="header-search-container desktop-search" ref={searchRef}>
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder={t('header.search.placeholder')}
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length > 0 && setShowSearchResults(true)}
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={handleSearchClear}>
                <X size={16} />
              </button>
            )}
          </div>
          {showSearchResults && (
            <div className="search-results">
              {authorResults.length === 0 && searchResults.length === 0 ? (
                <p className="search-no-results">{t('header.search.noResults', { query: searchQuery })}</p>
              ) : (
                <>
                  {authorResults.length > 0 && (
                    <>
                      <div className="search-results-header">
                        <span className="search-results-count">{t('header.nav.authors')}</span>
                      </div>
                      <div className="search-results-list">
                        {authorResults.map((profile) => (
                          <button
                            key={profile.id_author_profile}
                            className="search-result-item search-result-author-item"
                            onClick={() => handleAuthorResultClick(profile)}
                          >
                            <AuthorResultAvatar profile={profile} />
                            <div className="search-result-content">
                              <h4 className="search-result-title">{profile.display_name}</h4>
                              {profile.specialty_tags?.length > 0 && (
                                <span className="search-result-category">{profile.specialty_tags.slice(0, 2).join(', ')}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {searchResults.length > 0 && (
                    <>
                      <div className="search-results-header">
                        <span className="search-results-count">
                          {authorResults.length > 0 ? t('header.nav.articles') : t('header.search.resultCount', { count: searchResults.length })}
                        </span>
                      </div>
                      <div className="search-results-list">
                        {searchResults.map((article) => (
                          <button
                            key={article.id_article}
                            className="search-result-item"
                            onClick={() => handleArticleResultClick(article)}
                          >
                            <div className="search-result-content">
                              <h4 className="search-result-title">{article.title_article}</h4>
                              {article.category_article && (
                                <span className="search-result-category">{article.category_article}</span>
                              )}
                              {article.excerpt_article && (
                                <p className="search-result-excerpt">
                                  {article.excerpt_article.substring(0, 100)}
                                  {article.excerpt_article.length > 100 ? '...' : ''}
                                </p>
                              )}
                              {article.author_name && (
                                <span className="search-result-author">Por {article.author_name}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Desktop Navigation */}
        <nav className="header-nav desktop-nav">
          {visibleNavItems.map((item) => {
            if (item.kind === 'projects') {
              return (
                <div className="projects-dropdown-wrapper" ref={projectsDropdownRef} key={item.id}>
                  <button className="nav-link" onClick={handleProyectosClick}>
                    <span>{navLabel(item, currentLanguage)}</span>
                    <ChevronDown size={14} className={`chevron-icon ${showProjectsDropdown ? 'rotated' : ''}`} />
                  </button>
                  {showProjectsDropdown && (
                    <div className="projects-dropdown-menu">
                      {projects.length > 0 ? (
                        projects.map(project => (
                          <button
                            key={project.id_project}
                            className="projects-dropdown-item"
                            onClick={() => handleProjectSelect(project)}
                          >
                            {project.title_project}
                          </button>
                        ))
                      ) : (
                        <span className="projects-dropdown-empty">{t('header.nav.noProjects')}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            if (item.kind === 'group') {
              return (
                <NavGroupDropdown
                  key={item.id}
                  item={item}
                  lang={currentLanguage}
                  roles={roleFlags}
                  onSelect={handleNavItemSelect}
                />
              );
            }
            return (
              <button key={item.id} className="nav-link" onClick={() => handleNavItemSelect(item)}>
                <span>{navLabel(item, currentLanguage)}</span>
              </button>
            );
          })}

          <LanguageSelector />

          {isSuperAdmin && (
            <button className="nav-link" onClick={handleAdminClick} title="Administración">
              <Shield size={16} />
              <span>Admin</span>
            </button>
          )}

          <div className="header-user">
            {currentUser && (
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={18} />
                <span>{t('common.buttons.logout')}</span>
              </button>
            )}
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="mobile-nav">
          <button
            className="burger-menu-btn"
            onClick={toggleMobileMenu}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className={`mobile-menu-overlay ${isHeaderActive ? 'active' : ''}`}>
          <nav className="mobile-menu-content">
            {/* Mobile Search */}
            <button className="mobile-nav-link" onClick={handleMobileSearchToggle}>
              <Search size={18} />
              <span>{showMobileSearch ? t('common.buttons.closeSearch') : t('common.buttons.search')}</span>
            </button>

            {showMobileSearch && (
              <div className="mobile-search-container" ref={mobileSearchRef}>
                <div className="mobile-search-input-wrapper">
                  <Search size={16} className="mobile-search-icon" />
                  <input
                    type="text"
                    className="mobile-search-input"
                    placeholder={t('header.search.placeholder')}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    autoFocus
                  />
                  {searchQuery && (
                    <button className="mobile-search-clear-btn" onClick={handleSearchClear}>
                      <X size={16} />
                    </button>
                  )}
                </div>

                {searchQuery.length > 0 && (
                  <div className="mobile-search-results">
                    {searchResults.length > 0 ? (
                      <>
                        <div className="mobile-search-results-header">
                          <span className="mobile-search-results-count">
                            {t('header.search.resultCount', { count: searchResults.length })}
                          </span>
                        </div>
                        <div className="mobile-search-results-list">
                          {searchResults.map((article) => (
                            <button
                              key={article.id_article}
                              className="mobile-search-result-item"
                              onClick={() => handleArticleResultClick(article)}
                            >
                              <h4 className="mobile-search-result-title">{article.title_article}</h4>
                              {article.category_article && (
                                <span className="mobile-search-result-category">{article.category_article}</span>
                              )}
                              {article.author_name && (
                                <span className="mobile-search-result-author">Por {article.author_name}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="mobile-search-no-results">{t('header.search.noResults', { query: searchQuery })}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mobile-menu-divider"></div>

            {visibleNavItems.map((item) => {
              if (item.kind === 'projects') {
                return (
                  <div className="mobile-projects-section" key={item.id}>
                    <button className="mobile-nav-link" onClick={handleMobileProyectosClick}>
                      <span>{navLabel(item, currentLanguage)}</span>
                      <ChevronDown size={14} className={`chevron-icon ${showMobileProjectsDropdown ? 'rotated' : ''}`} />
                    </button>
                    {showMobileProjectsDropdown && (
                      <div className="mobile-projects-list">
                        {projects.length > 0 ? (
                          projects.map(project => (
                            <button
                              key={project.id_project}
                              className="mobile-project-item"
                              onClick={() => handleProjectSelect(project)}
                            >
                              {project.title_project}
                            </button>
                          ))
                        ) : (
                          <span className="projects-dropdown-empty">{t('header.nav.noProjects')}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
              if (item.kind === 'group') {
                const groupChildren = (item.children || []).filter(
                  (c) => c.visible !== false && canSeeNavItem(c, roleFlags)
                );
                if (groupChildren.length === 0) return null;
                const open = expandedMobileGroup === item.id;
                return (
                  <div className="mobile-more-section" key={item.id}>
                    <button className="mobile-nav-link" onClick={() => setExpandedMobileGroup(open ? null : item.id)}>
                      <span>{navLabel(item, currentLanguage)}</span>
                      <ChevronDown size={14} className={`chevron-icon ${open ? 'rotated' : ''}`} />
                    </button>
                    {open && (
                      <div className="mobile-more-list">
                        {groupChildren.map((child) => (
                          <button
                            key={child.id}
                            className="mobile-project-item"
                            onClick={() => handleNavItemSelect(child)}
                          >
                            {navLabel(child, currentLanguage)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <button key={item.id} className="mobile-nav-link" onClick={() => handleNavItemSelect(item)}>
                  <span>{navLabel(item, currentLanguage)}</span>
                </button>
              );
            })}

            <div className="mobile-menu-divider"></div>

            {[
              { code: 'es', label: 'Español' },
              { code: 'en', label: 'English' },
              { code: 'eu', label: 'Euskara' }
            ].map(lang => (
              <button
                key={lang.code}
                className={`mobile-nav-link mobile-lang-btn ${currentLanguage === lang.code ? 'mobile-lang-active' : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                <Globe size={16} />
                <span>{lang.label}</span>
              </button>
            ))}

            <div className="mobile-menu-divider"></div>

            {currentUser ? (
              <>
                <button className="mobile-nav-link" onClick={handleUserClick}>
                  <span>{currentUser.name_user}</span>
                  {userImageUrl ? (
                    <img
                      src={userImageUrl}
                      alt={currentUser.name_user}
                      className="user-profile-image"
                    />
                  ) : (
                    <User size={18} />
                  )}
                </button>
                {isSuperAdmin && (
                  <button className="mobile-nav-link" onClick={handleAdminClick}>
                    <Shield size={18} />
                    <span>Admin</span>
                  </button>
                )}
                <button className="mobile-nav-link logout" onClick={handleLogout}>
                  <LogOut size={18} />
                  <span>{t('common.buttons.logout')}</span>
                </button>
              </>
            ) : (
              <button className="mobile-nav-link login" onClick={handleLoginClick}>
                <User size={18} />
                <span>{t('common.buttons.login')}</span>
              </button>
            )}
          </nav>
        </div>
      )}

      {/* User Profile Card */}
      {showUserCard && currentUser && (
        <UserInfoCard
          user={currentUser}
          onClose={() => setShowUserCard(false)}
          isOwner={true}
        />
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal onClose={closeContactModal} />
      )}

      {/* Newsletter Modal */}
      {showNewsletterModal && (
        <NewsletterModal onClose={closeNewsletterModal} />
      )}
    </header>
  );
}

export default Header;
