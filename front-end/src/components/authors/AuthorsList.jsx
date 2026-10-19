// magazine-front/src/components/authors/AuthorsList.jsx
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthor } from '../../app_context/AuthorContext';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useMagazine } from '../../app_context/MagazineContext';
import AuthorCard from './AuthorCard';
import InviteAuthorModal from './InviteAuthorModal';
import { Plus, UserPlus, Search, X } from 'lucide-react';
import './AuthorsList.css';

// For searching and sorting: no case, no accents («maria» finds «María»).
const fold = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function AuthorsList() {
  const { t, i18n } = useTranslation();
  const {
    authorProfiles, allProfilesAdmin, editorUsers,
    loading, fetchAllProfiles, fetchAllProfilesAdmin, fetchEditorUsers, authorSearch, setAuthorSearch
  } = useAuthor();
  const {
    navigateToAuthorEditor, navigateToAuthorEditorForUser, navigateToAuthorEditorForProfile,
    showAuthors, showSuccess, showInfo
  } = useUI();
  const { canCreateContent, isSuperAdmin, currentUser } = useAuth();
  const { fetchEditors } = useMagazine();
  const [inviting, setInviting] = useState(false);

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
    if (!currentUser || !canCreateContent) return false;
    return authorProfiles.some(profile => profile.user_id === currentUser.id_user);
  }, [currentUser, canCreateContent, authorProfiles]);

  // For super admin: compute editors without any profile
  const editorsWithoutProfile = useMemo(() => {
    if (!isSuperAdmin) return [];
    const profileUserIds = new Set(allProfilesAdmin.map(p => p.user_id));
    return editorUsers.filter(u => !profileUserIds.has(u.id_user));
  }, [isSuperAdmin, allProfilesAdmin, editorUsers]);

  // Source profiles for rendering
  const sourceProfiles = isSuperAdmin ? allProfilesAdmin : authorProfiles;

  // Everyone in one list, in alphabetical order (profiles and, for super
  // admins, the editors still without one), filtered by the search — this
  // page's search bar or the header's (both set `authorSearch`). It looks in
  // the name and the specialty tags.
  const shownAuthors = useMemo(() => {
    const items = [
      ...sourceProfiles.map((profile) => ({ key: `p-${profile.id_author_profile}`, name: profile.display_name, tags: profile.specialty_tags, profile })),
      ...editorsWithoutProfile.map((editorUser) => ({ key: `no-profile-${editorUser.id_user}`, name: editorUser.name_user, tags: [], editorUser }))
    ];
    const q = fold(authorSearch).trim();
    const found = q
      ? items.filter((it) => fold(it.name).includes(q) || (it.tags || []).some((tag) => fold(tag).includes(q)))
      : items;
    const collator = new Intl.Collator(i18n.language || 'es', { sensitivity: 'base', numeric: true });
    return [...found].sort((a, b) => collator.compare(String(a.name || '').trim(), String(b.name || '').trim()));
  }, [sourceProfiles, editorsWithoutProfile, authorSearch, i18n.language]);

  const handleCreateProfile = () => {
    navigateToAuthorEditor();
  };

  // A super admin signed up a new author: write their profile next (or edit
  // the one they already have, e.g. someone invited again).
  const handleInvited = async (response, typedName) => {
    setInviting(false);
    const invited = response?.data;
    if (response?.emailSent === false) showInfo(response.success);
    else showSuccess(response?.success);
    if (!invited) return;
    fetchEditorUsers();
    fetchEditors(); // the creator's author list: they can be credited at once
    const res = await fetchAllProfilesAdmin();
    const profile = (res?.data || []).find((p) => p.user_id === invited.id_user);
    if (profile) navigateToAuthorEditorForProfile(profile);
    else navigateToAuthorEditorForUser({ ...invited, name_user: typedName || invited.name_user });
  };

  const isEmpty = sourceProfiles.length === 0 && editorsWithoutProfile.length === 0;

  return (
    <div className="authors-list-page">
      <header className="authors-header">
        <h1>{t('authors.title')}</h1>
        <p className="authors-subtitle">{t('authors.subtitle')}</p>

        {canCreateContent && !isSuperAdmin && !hasOwnProfile && (
          <button onClick={handleCreateProfile} className="create-profile-btn">
            <Plus size={20} />
            <span>{t('authors.createProfile')}</span>
          </button>
        )}

        {canCreateContent && !isSuperAdmin && hasOwnProfile && (
          <button onClick={handleCreateProfile} className="edit-profile-btn">
            <span>{t('authors.editProfile')}</span>
          </button>
        )}

        {isSuperAdmin && (
          <button type="button" onClick={() => setInviting(true)} className="create-profile-btn">
            <UserPlus size={20} />
            <span>{t('authors.invite.button', 'Nueva autora o autor')}</span>
          </button>
        )}

        {!isEmpty && (
          <div className="authors-search" role="search">
            <Search size={20} className="authors-search__icon" aria-hidden="true" />
            <input
              type="search"
              className="authors-search__input"
              value={authorSearch}
              onChange={(e) => setAuthorSearch(e.target.value)}
              placeholder={t('authors.search.placeholder', 'Busca por nombre…')}
              aria-label={t('authors.search.label', 'Buscar autoras y autores')}
              autoComplete="off"
              enterKeyHint="search"
            />
            {authorSearch && (
              <button
                type="button"
                className="authors-search__clear"
                onClick={() => setAuthorSearch('')}
                aria-label={t('authors.search.clear', 'Borrar la búsqueda')}
                title={t('authors.search.clear', 'Borrar la búsqueda')}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {!loading && !isEmpty && authorSearch.trim() && shownAuthors.length > 0 && (
          <p className="authors-search__count" aria-live="polite">
            {t('authors.search.results', { count: shownAuthors.length })}
          </p>
        )}
      </header>

      {inviting && (
        <InviteAuthorModal onClose={() => setInviting(false)} onInvited={handleInvited} />
      )}

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{t('authors.loadingProfiles')}</p>
        </div>
      )}

      {!loading && isEmpty && (
        <div className="empty-state">
          <p>{t('authors.emptyState')}</p>
          {canCreateContent && (
            <p className="empty-hint">{t('authors.emptyHint')}</p>
          )}
        </div>
      )}

      {!loading && !isEmpty && shownAuthors.length === 0 && (
        <div className="empty-state" role="status">
          <p>{t('authors.searchNoResults', { query: authorSearch.trim() })}</p>
        </div>
      )}

      {!loading && shownAuthors.length > 0 && (
        <div className="authors-grid">
          {shownAuthors.map((it) => (it.profile
            ? <AuthorCard key={it.key} profile={it.profile} />
            : <AuthorCard key={it.key} editorUser={it.editorUser} />
          ))}
        </div>
      )}
    </div>
  );
}

export default AuthorsList;
