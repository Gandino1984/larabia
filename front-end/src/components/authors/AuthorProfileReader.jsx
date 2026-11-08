// magazine-front/src/components/authors/AuthorProfileReader.jsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { useAuthor } from '../../app_context/AuthorContext';
import { Globe, Twitter, Instagram, BookOpen, Edit, Images } from 'lucide-react';
import ChatButton from '../chat/ChatButton';
import './AuthorProfileReader.css';

const flag = (v) => v === true || v === 1;
const isCreator = (u) => [u?.is_editor, u?.is_admin, u?.is_super_admin].some(flag);

function AuthorProfileReader() {
  const { t } = useTranslation();
  const { selectedAuthorProfile, navigateToAuthorPublications, navigateToAuthorEditorForProfile, navigateToExhibition } = useUI();
  const { isSuperAdmin } = useAuth();
  const { exhibitionOf, loadArtistExhibitions } = useAuthor();
  const [imageError, setImageError] = useState(false);

  // A Galería artist off the team signs no articles: their exhibition instead of «Ver publicaciones».
  const artist = flag(selectedAuthorProfile?.user?.is_artist);
  useEffect(() => { if (artist) loadArtistExhibitions(); }, [artist, loadArtistExhibitions]);

  if (!selectedAuthorProfile) {
    return (
      <div className="author-profile-reader">
        <div className="profile-error">
          <p>{t('authors.profileNotFound')}</p>
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
          <h1>{t('authors.authorProfile')}</h1>
          {isSuperAdmin && (
            <button
              onClick={() => navigateToAuthorEditorForProfile(profile)}
              className="btn-edit-profile-admin"
              title={t('authors.card.editAsAdmin', 'Editar perfil (super admin)')}
            >
              <Edit size={18} />
              {t('common.buttons.edit', 'Editar')}
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
                {artist && (
                  <span className="profile-role-chip">{t('authors.card.artist', 'Artista visual')}</span>
                )}
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

              {(!artist || isCreator(profile.user)) && (
                <button
                  onClick={handleViewPublications}
                  className="btn-view-publications"
                >
                  <BookOpen size={20} />
                  <span>{t('authors.viewPublications')}</span>
                </button>
              )}
              {artist && exhibitionOf(profile.user_id) && (
                <button
                  onClick={() => navigateToExhibition(exhibitionOf(profile.user_id))}
                  className="btn-view-publications"
                >
                  <Images size={20} />
                  <span>{t('authors.viewExhibition', 'Ver su exposición')}</span>
                </button>
              )}
              {profile.status_profile !== 'draft' && (
                <ChatButton host={{ id_user: profile.user_id, name_user: profile.display_name }} origin="authors" className="btn-chat-profile" iconSize={20} />
              )}
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
