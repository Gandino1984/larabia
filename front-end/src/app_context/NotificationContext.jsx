// magazine-front/src/app_context/NotificationContext.jsx
//
// Foundation for the magazine's in-app notification/reminder system.
//
// Notifications are computed from existing app state (no back-end yet). Each
// notification is a plain object { id, type, title, message, onClick } so new
// types (e.g. "new content published") can be added later without changing the
// consumers (the header bell + dropdown just render whatever is in the list).
//
// First implemented reminder: authors (anyone who can create content) who have
// not created their author profile yet.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { useAuthor } from './AuthorContext';
import { useUI } from './UIContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { t } = useTranslation();
  const { currentUser, canCreateContent } = useAuth();
  const { authorProfiles, fetchAllProfiles } = useAuthor();
  const { navigateToAuthorEditor } = useUI();
  // Guard against the "profiles not loaded yet" false positive.
  const [profilesReady, setProfilesReady] = useState(false);

  // Make sure the public author profiles are loaded so we can tell whether the
  // current user already has one.
  useEffect(() => {
    let active = true;
    if (currentUser && canCreateContent) {
      setProfilesReady(false);
      Promise.resolve(fetchAllProfiles()).finally(() => { if (active) setProfilesReady(true); });
    } else {
      setProfilesReady(false);
    }
    return () => { active = false; };
  }, [currentUser?.id_user, canCreateContent, fetchAllProfiles]);

  const notifications = useMemo(() => {
    const list = [];

    // Reminder: complete your author profile.
    if (profilesReady && currentUser && canCreateContent) {
      const hasProfile = authorProfiles.some(p => p.user_id === currentUser.id_user);
      if (!hasProfile) {
        list.push({
          id: 'complete-author-profile',
          type: 'profile',
          title: t('notifications.completeProfile.title'),
          message: t('notifications.completeProfile.message'),
          onClick: () => navigateToAuthorEditor()
        });
      }
    }

    return list;
  }, [profilesReady, currentUser, canCreateContent, authorProfiles, navigateToAuthorEditor, t]);

  const value = {
    notifications,
    count: notifications.length
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
};

export default NotificationContext;
