// magazine-front/src/components/admin/MicroPerfilEditor.jsx
//
// Dedicated creation UI for the "micro-perfil" article format: a single image,
// a caption (max 700 chars) and an optional audio clip. It edits one image
// block (block_type='image'); the optional audio is stored on that same block
// via the interaction_* fields, exactly like comic-panel audio.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Music } from 'lucide-react';
import './MicroPerfilEditor.css';

const CAPTION_MAX = 700;
const apiUrl = import.meta.env.VITE_API_URL || 'https://api.uribarri.online';
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/x-aac', 'audio/aacp', 'audio/vnd.dlna.adts', 'audio/mp4', 'audio/x-m4a', 'video/mp4'];

const resolveUrl = (u) => {
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  return `${apiUrl}${u.startsWith('/') ? u : '/' + u}`;
};

function MicroPerfilEditor({ block, onChange, onUploadImage, onUploadAudio }) {
  const { t } = useTranslation();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  const b = block || {};
  const imagePreview = resolveUrl(b.image_url);
  const hasAudio = b.interaction_type === 'audio' && !!b.interaction_data;
  const caption = b.image_caption || '';

  const update = (patch) => onChange({ ...b, block_type: 'image', block_order: 0, ...patch });

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert(t('editor.coverImage.mustBeImage'));
      e.target.value = '';
      return;
    }
    setUploadingImage(true);
    try {
      const url = await onUploadImage(file);
      if (url) update({ image_url: url });
    } catch (err) {
      console.error('micro-perfil image upload failed', err);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAudio = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!AUDIO_TYPES.includes(file.type)) {
      alert(`${t('editor.microperfil.audioInvalid')} (${file.type || 'desconocido'})`);
      e.target.value = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert(t('editor.microperfil.audioTooLarge'));
      e.target.value = '';
      return;
    }
    setUploadingAudio(true);
    setAudioProgress(0);
    try {
      const url = await onUploadAudio(file, (p) => setAudioProgress(p));
      if (url) update({ is_interactive: true, interaction_type: 'audio', interaction_data: url, audio_mode: 'once' });
    } catch (err) {
      console.error('micro-perfil audio upload failed', err);
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const removeAudio = () => update({ is_interactive: false, interaction_type: null, interaction_data: null });

  return (
    <div className="microperfil-editor">
      <label className="content-label">{t('editor.microperfil.heading')}</label>
      <p className="microperfil-hint">{t('editor.microperfil.hint')}</p>

      {/* Image */}
      <div className="mp-field">
        <span className="mp-field-label">{t('editor.microperfil.imageLabel')}</span>
        <div className="cover-image-upload">
          {imagePreview ? (
            <div className="cover-image-preview">
              <img src={imagePreview} alt={t('editor.microperfil.imageLabel')} />
              <button type="button" className="btn-remove-preview" onClick={() => update({ image_url: '' })}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <input type="file" id="mp-image" accept="image/*" onChange={handleImage} className="cover-image-input" />
              <label htmlFor="mp-image" className="cover-image-label">
                <Plus size={24} />
                <span>{uploadingImage ? t('editor.uploadingImage') : t('editor.microperfil.selectImage')}</span>
              </label>
            </>
          )}
        </div>
      </div>

      {/* Caption */}
      <div className="mp-field">
        <span className="mp-field-label">{t('editor.microperfil.captionLabel')}</span>
        <textarea
          className="mp-caption"
          rows="5"
          maxLength={CAPTION_MAX}
          value={caption}
          placeholder={t('editor.microperfil.captionPlaceholder')}
          onChange={(e) => update({ image_caption: e.target.value })}
        />
        <span className={`mp-counter ${caption.length >= CAPTION_MAX ? 'mp-counter--max' : ''}`}>
          {caption.length}/{CAPTION_MAX}
        </span>
      </div>

      {/* Audio (optional) */}
      <div className="mp-field">
        <span className="mp-field-label">{t('editor.microperfil.audioLabel')}</span>
        {hasAudio ? (
          <div className="mp-audio-has">
            <Music size={18} />
            <audio controls src={resolveUrl(b.interaction_data)} />
            <button type="button" className="btn-remove-preview mp-audio-remove" onClick={removeAudio}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <input
              type="file"
              id="mp-audio"
              accept=".mp3,.aac,.m4a,.ogg,.mp4,audio/mpeg,audio/aac,audio/aacp,audio/vnd.dlna.adts,audio/mp4,audio/x-m4a,audio/ogg,video/mp4"
              onChange={handleAudio}
              className="cover-image-input"
            />
            <label htmlFor="mp-audio" className="cover-image-label mp-audio-label">
              <Music size={20} />
              <span>{uploadingAudio ? `${t('common.states.uploading')}… ${audioProgress}%` : t('editor.microperfil.addAudio')}</span>
            </label>
            {uploadingAudio && (
              <div className="mp-audio-progress">
                <div className="mp-audio-progress__bar" style={{ width: `${audioProgress}%` }} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MicroPerfilEditor;
