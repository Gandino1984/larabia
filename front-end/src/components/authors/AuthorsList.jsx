// magazine-front/src/components/authors/AuthorsList.jsx
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthor } from '../../app_context/AuthorContext';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import AuthorCard from './AuthorCard';
import { Plus } from 'lucide-react';
import './AuthorsList.css';

function AuthorsList() {
  const { t } = useTranslation();
  const {
    authorProfiles, allProfilesAdmin, editorUsers,
    loading, fetchAllProfiles, fetchAllProfilesAdmin, fetchEditorUsers, authorSearch
  } = useAuthor();
  const { navigateToAuthorEditor, showAuthors } = useUI();
  const { isEditor, isSuperAdmin, currentUser } = useAuth();

  // Re-fetch whenever the authors list becomes visible (e.g. after editing a profile)
  useEffect(() => {
    if (!showAuthors) return;
    if (isSuperAdmin) {
      fetchAllProfilesAdmin();
      fetchEditorUsers();
    } else {
      fetchAllProfiles();
    }
  }, [showAuthors, isSuperAdmin, fetchAllProfiles, fetchAllProfilesAdmin, fetchEditorUsers]);

  // Check if current user already has a profile
  const hasOwnProfile = useMemo(() => {
    if (!currentUser || !isEditor) return false;
    return authorProfiles.some(profile => profile.user_id === currentUser.id_user);
  }, [currentUser, isEditor, authorProfiles]);

  // For super admin: compute editors without any profile
  const editorsWithoutProfile = useMemo(() => {
    if (!isSuperAdmin) return [];
    const profileUserIds = new Set(allProfilesAdmin.map(p => p.user_id));
    return editorUsers.filter(u => !profileUserIds.has(u.id_user));
  }, [isSuperAdmin, allProfilesAdmin, editorUsers]);

  // Source profiles for rendering
  const sourceProfiles = isSuperAdmin ? allProfilesAdmin : authorProfiles;

  // Filter profiles by search query from header search bar
  const filteredProfiles = useMemo(() => {
    if (!authorSearch) return sourceProfiles;
    const q = authorSearch.toLowerCase();
    return sourceProfiles.filter(profile =>
      profile.display_name?.toLowerCase().includes(q) ||
      profile.bio_text?.toLowerCase().includes(q) ||
      profile.specialty_tags?.some(tag => tag.toLowerCase().includes(q))
    );
  }, [sourceProfiles, authorSearch]);

  // Filter editors without profile by search
  const filteredEditorsWithoutProfile = useMemo(() => {
    if (!authorSearch) return editorsWithoutProfile;
    const q = authorSearch.toLowerCase();
    return editorsWithoutProfile.filter(u => u.name_user?.toLowerCase().includes(q));
  }, [editorsWithoutProfile, authorSearch]);

  const handleCreateProfile = () => {
    navigateToAuthorEditor();
  };

  const isEmpty = sourceProfiles.length === 0 && editorsWithoutProfile.length === 0;

  return (
    <div className="authors-list-page">
      <header className="authors-header">
        <h1>{t('authors.title')}</h1>
        <p className="authors-subtitle">{t('authors.subtitle')}</p>

        {isEditor && !isSuperAdmin && !hasOwnProfile && (
          <button onClick={handleCreateProfile} className="create-profile-btn">
            <Plus size={20} />
            <span>{t('authors.createProfile')}</span>
          </button>
        )}

        {isEditor && !isSuperAdmin && hasOwnProfile && (
          <button onClick={handleCreateProfile} className="edit-profile-btn">
            <span>{t('authors.editProfile')}</span>
          </button>
        )}
      </header>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{t('authors.loadingProfiles')}</p>
        </div>
      )}

      {!loading && isEmpty && (
        <div className="empty-state">
          <p>{t('authors.emptyState')}</p>
          {isEditor && (
            <p className="empty-hint">{t('authors.emptyHint')}</p>
          )}
        </div>
      )}

      {!loading && !isEmpty && filteredProfiles.length === 0 && filteredEditorsWithoutProfile.length === 0 && (
        <div className="empty-state">
          <p>{t('authors.searchNoResults', { query: authorSearch })}</p>
        </div>
      )}

      {!loading && (filteredProfiles.length > 0 || filteredEditorsWithoutProfile.length > 0) && (
        <div className="authors-grid">
          {filteredProfiles.map(profile => (
            <AuthorCard key={profile.id_author_profile} profile={profile} />
          ))}
          {filteredEditorsWithoutProfile.map(user => (
            <AuthorCard key={`no-profile-${user.id_user}`} editorUser={user} />
          ))}
        </div>
      )}
    </div>
  );
}

export default AuthorsList;
