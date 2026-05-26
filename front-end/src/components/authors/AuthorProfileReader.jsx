// magazine-front/src/components/authors/AuthorProfileReader.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { Globe, Twitter, Instagram, ArrowLeft, BookOpen, Edit } from 'lucide-react';
import './AuthorProfileReader.css';

function AuthorProfileReader() {
  const { t } = useTranslation();
  const { selectedAuthorProfile, navigateBack, navigateToAuthorPublications, navigateToAuthorEditorForProfile } = useUI();
  const { isSuperAdmin } = useAuth();
  const [imageError, setImageError] = useState(false);

  if (!selectedAuthorProfile) {
    return (
      <div className="author-profile-reader">
        <div className="profile-error">
          <p>{t('authors.profileNotFound')}</p>
          <button onClick={navigateBack} className="btn-back-nav">
            <ArrowLeft size={20} />{t('common.buttons.back')}
          </button>
        </div>
      </div>
    );
  }

  const profile = selectedAuthorProfile;
  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

  // Construct profile image URL: prefer custom uploaded image, fall back to Google account image
  const profileImageUrl = profile.profile_image
    ? `${apiUrl}/uploads/author-profiles/${encodeURIComponent(profile.profile_image)}`
    : profile.user?.image_user
      ? `${apiUrl}/user/image/${encodeURIComponent(profile.user.image_user)}`
      : '/default-avatar.png';

  const handleViewPublications = () => {
    navigateToAuthorPublications(profile.user_id);
  };

  return (
    <div className="author-profile-reader">
      <div className="profile-container">
        <header className="profile-header">
          <button onClick={navigateBack} className="btn-back-nav" title={t('common.buttons.back')}>
            <ArrowLeft size={24} />
          </button>
          <h1>{t('authors.authorProfile')}</h1>
          {isSuperAdmin && (
            <button
              onClick={() => navigateToAuthorEditorForProfile(profile)}
              className="btn-edit-profile-admin"
              title="Editar perfil (super admin)"
            >
              <Edit size={18} />
              Editar
            </button>
          )}
        </header>

        <div className="profile-content">
          {profile.featured_profile && (
            <div className="featured-badge-large">
              <span>{t('authors.featured')}</span>
            </div>
          )}

          <div className="profile-main">
            <div className="profile-image-section">
              {!imageError ? (
                <img
                  src={profileImageUrl}
                  alt={profile.display_name}
                  className="profile-image"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="profile-image-placeholder">
                  {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
            </div>

            <div className="profile-info-section">
              <div className="profile-name-row">
                <h2 className="profile-name">{profile.display_name}</h2>
                {profile.specialty_tags && profile.specialty_tags.length > 0 && (
                  <div className="profile-tags">
                    {profile.specialty_tags.map((tag, idx) => (
                      <span key={idx} className="profile-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {(profile.website_url || profile.twitter_handle || profile.instagram_handle) && (
                <div className="profile-social-links">
                  {profile.website_url && (
                    <a
                      href={profile.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                      title={t('authors.website')}
                    >
                      <Globe size={20} />
                      <span>{t('authors.website')}</span>
                    </a>
                  )}
                  {profile.twitter_handle && (
                    <a
                      href={`https://twitter.com/${profile.twitter_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                      title="Twitter"
                    >
                      <Twitter size={20} />
                      <span>@{profile.twitter_handle}</span>
                    </a>
                  )}
                  {profile.instagram_handle && (
                    <a
                      href={`https://instagram.com/${profile.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                      title="Instagram"
                    >
                      <Instagram size={20} />
                      <span>@{profile.instagram_handle}</span>
                    </a>
                  )}
                </div>
              )}

              <button
                onClick={handleViewPublications}
                className="btn-view-publications"
              >
                <BookOpen size={20} />
                <span>{t('authors.viewPublications')}</span>
              </button>
            </div>
          </div>

          <div className="profile-bio-section">
            <h3>{t('authors.biography')}</h3>
            <div className="profile-bio-text">
              {profile.bio_text}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthorProfileReader;
