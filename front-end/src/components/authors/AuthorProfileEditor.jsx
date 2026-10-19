// magazine-front/src/components/authors/AuthorProfileEditor.jsx
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { useAuthor } from '../../app_context/AuthorContext';
import { ArrowLeft, Upload } from 'lucide-react';
import AuthorInvitationBox from './AuthorInvitationBox';
import './AuthorProfileEditor.css';

const isCreator = (u) => [u?.is_editor, u?.is_admin, u?.is_super_admin].some((v) => v === true || v === 1);

function AuthorProfileEditor() {
  const { t } = useTranslation();
  const { currentUser, canCreateContent, isSuperAdmin } = useAuth();
  const { navigateBack, showSuccess, showError, superAdminEditingProfile, setSuperAdminEditingProfile } = useUI();
  const { myProfile, fetchMyProfile, createProfile, updateProfile, uploadProfileImage, fetchAllProfilesAdmin } = useAuthor();

  // When super admin edits another author's profile, use that profile instead of myProfile
  // _noProfile=true means super admin is creating a new profile for an editor who has none
  const isCreatingForUser = isSuperAdmin && superAdminEditingProfile?._noProfile;
  const targetProfile = isCreatingForUser ? null : (isSuperAdmin && superAdminEditingProfile) ? superAdminEditingProfile : myProfile;
  const targetUser = (isSuperAdmin && superAdminEditingProfile) ? superAdminEditingProfile.user : currentUser;
  // An author a super admin signed up (InviteAuthorModal) who hasn't accepted.
  const inviteStatus = isSuperAdmin && superAdminEditingProfile && !isCreator(targetUser)
    ? targetUser?.author_invite_status
    : null;
  const declined = inviteStatus === 'declined';
  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';

  const [formData, setFormData] = useState({
    display_name: targetUser?.name_user || '',
    bio_text: '',
    specialty_tags: [],
    website_url: '',
    twitter_handle: '',
    instagram_handle: '',
    status_profile: 'draft'
  });

  // Raw text of the specialties field. The list (formData.specialty_tags) is
  // derived from it, but the field shows exactly what was typed — rebuilding
  // it from the list on every keystroke used to swallow commas and spaces
  // (typing "audio, " collapsed back to "audio"), merging all the tags.
  const [tagsInput, setTagsInput] = useState('');
  const [imageError, setImageError] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!canCreateContent) {
      showError(t('authors.editor.onlyEditors', 'Solo los editores pueden crear perfiles de autor'));
      navigateBack();
      return;
    }

    if (isSuperAdmin && superAdminEditingProfile) {
      // Super admin editing another author's profile — data already loaded in superAdminEditingProfile
      return;
    }

    // Load own profile
    if (currentUser?.id_user) {
      fetchMyProfile(currentUser.id_user);
    }
  }, [currentUser, canCreateContent, isSuperAdmin, superAdminEditingProfile, fetchMyProfile, showError, navigateBack]);

  useEffect(() => {
    if (targetProfile) {
      setFormData({
        display_name: targetProfile.display_name || '',
        bio_text: targetProfile.bio_text || '',
        specialty_tags: targetProfile.specialty_tags || [],
        website_url: targetProfile.website_url || '',
        twitter_handle: targetProfile.twitter_handle || '',
        instagram_handle: targetProfile.instagram_handle || '',
        status_profile: targetProfile.status_profile || 'draft'
      });
      setTagsInput((targetProfile.specialty_tags || []).join(', '));
    }
  }, [targetProfile]);

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setImageError(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.bio_text.trim()) {
      showError(t('authors.editor.bioRequired', 'La biografía es obligatoria'));
      return;
    }

    if (formData.bio_text.length < 50) {
      showError(t('authors.editor.bioMin', 'La biografía debe tener al menos 50 caracteres'));
      return;
    }

    const profileData = {
      ...formData,
      user_id: targetUser?.id_user
    };

    // When super admin edits another user's profile, don't overwrite myProfile state
    const isEditingAnotherUser = isSuperAdmin && superAdminEditingProfile &&
      !superAdminEditingProfile._noProfile &&
      superAdminEditingProfile.user_id !== currentUser?.id_user;

    let result;
    if (targetProfile) {
      result = await updateProfile(targetProfile.id_author_profile, profileData, {
        updateMyProfile: !isEditingAnotherUser
      });
    } else {
      result = await createProfile(profileData);
    }

    if (!result.error) {
      // Refresh the admin profiles list so the updated data is immediately visible
      if (isSuperAdmin) {
        await fetchAllProfilesAdmin();
      }
      // Upload custom profile image if one was selected
      if (selectedImageFile && targetUser?.id_user) {
        setUploadingImage(true);
        await uploadProfileImage(targetUser.id_user, selectedImageFile);
        setUploadingImage(false);
      }
      setSuperAdminEditingProfile(null);
      navigateBack();
    }
  };

  const handleTagsChange = (e) => {
    const tagsString = e.target.value;
    setTagsInput(tagsString);
    const tagsArray = tagsString
      .split(/[,;]/)
      .map(t => t.trim())
      .filter(t => t);
    setFormData({ ...formData, specialty_tags: tagsArray });
  };

  // Display priority: new local preview > existing custom profile_image > Google account image
  const existingCustomImageUrl = targetProfile?.profile_image
    ? `${apiUrl}/uploads/author-profiles/${encodeURIComponent(targetProfile.profile_image)}`
    : null;

  const googleImageUrl = targetUser?.image_user
    ? `${apiUrl}/user/image/${encodeURIComponent(targetUser.image_user)}`
    : null;

  const profileImageUrl = imagePreviewUrl || existingCustomImageUrl || googleImageUrl;

  return (
    <div className="author-profile-editor">
      <div className="editor-container">
        <header className="editor-header">
          <button onClick={navigateBack} className="btn-back-nav" title={t('common.buttons.back', 'Volver')}>
            <ArrowLeft size={24} />
          </button>
          <div className="editor-header-content">
            <h1>
              {isSuperAdmin && superAdminEditingProfile
                ? t('authors.editor.titleFor', { name: targetUser?.name_user || t('authors.editor.someone', 'autor/a'), defaultValue: 'Editar perfil de {{name}}' })
                : targetProfile ? t('authors.editor.titleEdit', 'Editar perfil de autor/a') : t('authors.editor.titleCreate', 'Crear perfil de autor/a')}
            </h1>
          </div>
        </header>

        {(inviteStatus === 'pending' || declined) && targetUser?.id_user && (
          <AuthorInvitationBox userId={targetUser.id_user} />
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          {/* Profile image preview + upload */}
          <div className="form-group profile-image-preview">
            <label>{t('authors.editor.image', 'Imagen de perfil')}</label>
            <div className="image-preview-container">
              {profileImageUrl && !imageError ? (
                <img
                  src={profileImageUrl}
                  alt={targetUser?.name_user}
                  className="profile-img-preview"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="profile-img-placeholder">
                  {targetUser?.name_user?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div className="image-upload-controls">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleImageFileChange}
                />
                <button
                  type="button"
                  className="btn-upload-image"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  <span>{selectedImageFile ? t('authors.editor.changeImage', 'Cambiar imagen') : t('authors.editor.uploadOwnImage', 'Subir imagen propia')}</span>
                </button>
                {selectedImageFile && (
                  <span className="selected-file-name">{selectedImageFile.name}</span>
                )}
                {!selectedImageFile && !existingCustomImageUrl && (
                  <p className="image-info-text">
                    {t('authors.editor.usingGoogleImage', 'Usando la imagen de la cuenta de Google. Puedes subir una imagen personalizada.')}
                  </p>
                )}
                {existingCustomImageUrl && !selectedImageFile && (
                  <p className="image-info-text">{t('authors.editor.customImage', 'Imagen personalizada activa.')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div className="form-group">
            <label htmlFor="display_name">{t('authors.editor.displayName', 'Nombre público')} *</label>
            <input
              type="text"
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              required
              maxLength={100}
              placeholder={t('authors.editor.displayNamePlaceholder', 'Tu nombre como autor/a')}
            />
          </div>

          {/* Bio Text */}
          <div className="form-group">
            <label htmlFor="bio_text">{t('authors.editor.bio', 'Biografía / Presentación')} *</label>
            <textarea
              id="bio_text"
              value={formData.bio_text}
              onChange={(e) => setFormData({ ...formData, bio_text: e.target.value })}
              required
              rows={10}
              placeholder={t('authors.editor.bioPlaceholder', 'Escribe tu biografía, presentación o descripción como autor/a...')}
            />
            <span className="char-count">
              {t('authors.editor.charCount', { count: formData.bio_text.length, defaultValue: '{{count}} caracteres (mínimo 50)' })}
            </span>
          </div>

          {/* Specialty Tags */}
          <div className="form-group">
            <label htmlFor="specialty_tags">{t('authors.editor.specialties', 'Especialidades / Géneros')}</label>
            <input
              type="text"
              id="specialty_tags"
              placeholder={t('authors.editor.specialtiesPlaceholder', 'Ej.: cómic, ilustración, narrativa (separados por comas)')}
              value={tagsInput}
              onChange={handleTagsChange}
            />
            <span className="field-hint">
              {t('authors.editor.specialtiesHint', 'Separa las especialidades con comas')}
            </span>
          </div>

          {/* Website */}
          <div className="form-group">
            <label htmlFor="website_url">{t('authors.editor.website', 'Sitio web')}</label>
            <input
              type="url"
              id="website_url"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              placeholder={t('authors.editor.websitePlaceholder', 'https://tu-sitio-web.com')}
            />
          </div>

          {/* Social Media */}
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="twitter_handle">Twitter</label>
              <div className="input-with-prefix">
                <span className="input-prefix">@</span>
                <input
                  type="text"
                  id="twitter_handle"
                  value={formData.twitter_handle}
                  onChange={(e) => setFormData({ ...formData, twitter_handle: e.target.value.replace('@', '') })}
                  placeholder={t('authors.editor.handlePlaceholder', 'usuario')}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="instagram_handle">Instagram</label>
              <div className="input-with-prefix">
                <span className="input-prefix">@</span>
                <input
                  type="text"
                  id="instagram_handle"
                  value={formData.instagram_handle}
                  onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value.replace('@', '') })}
                  placeholder={t('authors.editor.handlePlaceholder', 'usuario')}
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="form-group">
            <label htmlFor="status_profile">{t('authors.editor.status', 'Estado del perfil')}</label>
            <select
              id="status_profile"
              value={formData.status_profile}
              onChange={(e) => setFormData({ ...formData, status_profile: e.target.value })}
            >
              <option value="draft">{t('authors.editor.statusDraft', 'Borrador (no visible públicamente)')}</option>
              <option value="published" disabled={declined}>{t('authors.editor.statusPublished', 'Publicado (visible para todos)')}</option>
            </select>
            <span className="field-hint">
              {declined
                ? t('authors.editor.declinedHint', 'Rechazó la invitación: su perfil no se puede publicar')
                : formData.status_profile === 'draft'
                  ? t('authors.editor.draftHint', 'El perfil no será visible hasta que lo publiques')
                  : t('authors.editor.publishedHint', 'El perfil es visible en la página de Autoras/es')}
            </span>
          </div>

          {/* Submit Buttons */}
          <div className="form-actions">
            <button type="submit" className="btn-save" disabled={uploadingImage}>
              {uploadingImage ? t('authors.editor.uploadingImage', 'Subiendo imagen...') : (targetProfile ? t('authors.editor.save', 'Guardar cambios') : t('authors.card.createProfile', 'Crear perfil'))}
            </button>
            <button type="button" onClick={navigateBack} className="btn-cancel">
              {t('common.buttons.cancel', 'Cancelar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AuthorProfileEditor;
