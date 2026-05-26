// magazine-front/src/components/authors/AuthorCard.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import { Globe, Twitter, Instagram, ChevronDown, ChevronUp, BookOpen, Edit, UserPlus } from 'lucide-react';
import './AuthorCard.css';

// editorUser prop: when set, renders a "no profile yet" card for that editor (super admin view)
function AuthorCard({ profile, editorUser }) {
  const { t } = useTranslation();
  const { navigateToAuthorProfile, navigateToAuthorPublications, navigateToAuthorEditorForProfile, navigateToAuthorEditorForUser } = useUI();
  const { isSuperAdmin } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

  // "No profile" card for an editor without an author profile (super admin view)
  if (editorUser) {
    const editorImageUrl = editorUser.image_user
      ? `${apiUrl}/user/image/${encodeURIComponent(editorUser.image_user)}`
      : null;
    return (
      <article className="author-card no-profile-card">
        <div className="no-profile-badge"><span>Sin perfil</span></div>
        <div className="author-card-image">
          {editorImageUrl && !imageError ? (
            <img src={editorImageUrl} alt={editorUser.name_user} onError={() => setImageError(true)} />
          ) : (
            <div className="image-placeholder">
              {editorUser.name_user?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>
        <div className="author-card-content">
          <h3 className="author-name">{editorUser.name_user}</h3>
          <p className="bio-preview no-profile-text">Este/a editor/a aún no tiene perfil de autor/a.</p>
          <button
            className="btn-create-profile-admin"
            onClick={() => navigateToAuthorEditorForUser(editorUser)}
            title="Crear perfil para este editor/a"
          >
            <UserPlus size={16} />
            <span>Crear perfil</span>
          </button>
        </div>
      </article>
    );
  }

  // Construct profile image URL: prefer custom uploaded image, fall back to Google account image
  const profileImageUrl = profile.profile_image
    ? `${apiUrl}/uploads/author-profiles/${encodeURIComponent(profile.profile_image)}`
    : profile.user?.image_user
      ? `${apiUrl}/user/image/${encodeURIComponent(profile.user.image_user)}`
      : '/default-avatar.png';

  // Truncate bio for preview
  const bioPreview = profile.bio_text?.length > 150
    ? profile.bio_text.substring(0, 150) + '...'
    : profile.bio_text;

  const shouldShowReadMore = profile.bio_text?.length > 150;

  const handleCardClick = (e) => {
    // Don't navigate if clicking on interactive elements
    if (
      e.target.closest('button') ||
      e.target.closest('a') ||
      e.target.tagName === 'BUTTON' ||
      e.target.tagName === 'A'
    ) {
      return;
    }
    navigateToAuthorProfile(profile);
  };

  const handleViewPublications = (e) => {
    e.stopPropagation();
    navigateToAuthorPublications(profile.user_id);
  };

  return (
    <article
      className={`author-card ${isExpanded ? 'expanded' : ''}`}
      onClick={handleCardClick}
    >
      {profile.featured_profile && (
        <div className="featured-badge">
          <span>{t('authors.featured')}</span>
        </div>
      )}

      {isSuperAdmin && profile.status_profile === 'draft' && (
        <div className="draft-badge"><span>Borrador</span></div>
      )}

      <div className="author-card-image">
        {!imageError ? (
          <img
            src={profileImageUrl}
            alt={profile.display_name}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="image-placeholder">
            {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
      </div>

      <div className="author-card-content">
        <div className="author-name-row">
          <h3 className="author-name">{profile.display_name}</h3>
          {isSuperAdmin && (
            <button
              className="btn-edit-card-admin"
              onClick={(e) => { e.stopPropagation(); navigateToAuthorEditorForProfile(profile); }}
              title="Editar perfil"
            >
              <Edit size={15} />
            </button>
          )}
        </div>

        <p className="bio-preview">
          {isExpanded ? profile.bio_text : bioPreview}
        </p>

        {shouldShowReadMore && (
          <button
            className="btn-read-more"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? t('authors.readLess') : t('authors.readMore')}
          >
            {isExpanded ? (
              <>
                {t('authors.readLess')}
                <ChevronUp size={16} />
              </>
            ) : (
              <>
                {t('authors.readMore')}
                <ChevronDown size={16} />
              </>
            )}
          </button>
        )}

        {profile.specialty_tags && profile.specialty_tags.length > 0 && (
          <div className="tags">
            {profile.specialty_tags.map((tag, idx) => (
              <span key={idx} className="tag">{tag}</span>
            ))}
          </div>
        )}

        {(profile.website_url || profile.twitter_handle || profile.instagram_handle) && (
          <div className="social-links">
            {profile.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                title={t('authors.website')}
              >
                <Globe size={18} />
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
                <Twitter size={18} />
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
                <Instagram size={18} />
              </a>
            )}
          </div>
        )}

        <button
          className="btn-view-publications-card"
          onClick={handleViewPublications}
          title={t('authors.viewPublications')}
        >
          <BookOpen size={16} />
          <span>{t('authors.viewPublications')}</span>
        </button>
      </div>
    </article>
  );
}

export default AuthorCard;
