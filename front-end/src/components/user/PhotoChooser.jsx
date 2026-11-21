// magazine-front/src/components/user/PhotoChooser.jsx
//
// «Tu foto»: which photo is yours on the whole site (back-end
// utils/userPhoto.js) — your Google picture, your author profile's photo
// (authors and artists) or one you uploaded — or a new one. A new upload
// becomes your author profile's photo if you have a profile, else your
// account's; either way it's the one used. Opened from the profile card
// (UserInfoCard) and the author profile editor.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Check, Upload, Loader } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import { useAuthor } from '../../app_context/AuthorContext';
import { useUI } from '../../app_context/UIContext';
import { userPhotoUrl } from '../../utils/userPhoto';
import { uploadProfileImage as uploadAccountImage } from '../../utils/imageUploadService';
import '../openmic/OpenSpaceProposalModal.css';
import './PhotoChooser.css';

const ORDER = ['google', 'magazine', 'own'];
const ACCEPT = 'image/jpeg,image/png,image/webp';

function PhotoChooser({ onClose }) {
  const { t } = useTranslation();
  const { currentUser, setCurrentUser } = useAuth();
  const { uploadProfileImage, fetchAllProfiles } = useAuthor();
  const { showSuccess, showError } = useUI();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stamp, setStamp] = useState(() => Date.now());
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/user/photo', { headers: { 'x-user-id': currentUser?.id_user } });
      setData(res.data.data);
    } catch (err) {
      showError(err.response?.data?.error || t('photo.loadError', 'No se pudieron cargar tus fotos'));
      onClose();
    }
  }, [showError, t, onClose, currentUser?.id_user]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  // The session and the author lists show the new photo at once.
  const applied = (imageUser, choice) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, image_user: imageUser, photo_choice_user: choice };
      try { localStorage.setItem('currentUser', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setStamp(Date.now());
    fetchAllProfiles?.();
  };

  const choose = async (choice) => {
    if (busy || data?.options?.[choice] === data?.image_user) return;
    setBusy(true);
    try {
      const res = await axiosInstance.put('/user/photo', { choice }, { headers: { 'x-user-id': currentUser?.id_user } });
      setData(res.data.data);
      applied(res.data.data.image_user, choice);
      showSuccess(res.data.success || t('photo.saved', 'Foto actualizada'));
    } catch (err) {
      showError(err.response?.data?.error || t('photo.saveError', 'No se pudo cambiar tu foto'));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) {
      showError(t('photo.badType', 'Usa una imagen JPG, PNG o WebP'));
      return;
    }
    setBusy(true);
    try {
      if (data?.options?.has_profile) {
        // Authors and artists: their author profile's photo.
        const r = await uploadProfileImage(currentUser.id_user, file);
        if (r?.error) return;
        applied(r.data?.image_user ?? null, 'magazine');
      } else {
        const imageUser = await uploadAccountImage({ file, userName: currentUser.name_user });
        if (!imageUser) return;
        applied(imageUser, 'own');
        showSuccess(t('photo.saved', 'Foto actualizada'));
      }
      await load();
    } catch (err) {
      showError(err?.message || t('photo.saveError', 'No se pudo cambiar tu foto'));
    } finally {
      setBusy(false);
    }
  };

  const LABELS = {
    google: t('photo.google', 'Tu foto de Google'),
    magazine: t('photo.magazine', 'Tu foto de perfil en la revista'),
    own: t('photo.own', 'La foto que subiste')
  };
  const options = data ? ORDER.filter((k) => data.options[k]) : [];

  return createPortal(
    <div className="proposal-overlay photo-chooser-overlay" onClick={() => !busy && onClose()}>
      <div className="proposal-modal photo-chooser" role="dialog" aria-modal="true" aria-labelledby="photo-chooser-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="proposal-modal__close" onClick={onClose} disabled={busy} title={t('common.buttons.close', 'Cerrar')} aria-label={t('common.buttons.close', 'Cerrar')}>
          <X size={22} />
        </button>
        <h2 id="photo-chooser-title">{t('photo.title', 'Tu foto')}</h2>
        <p className="proposal-modal__lead">
          {t('photo.lead', 'Es la que sale en toda la revista: en tu perfil, junto a tu nombre en lo que publicas, en los comentarios y en la cabecera. Elige cuál usar o sube una nueva.')}
        </p>

        {!data ? (
          <p className="photo-chooser__empty"><Loader size={18} className="photo-chooser__spin" aria-hidden="true" /> {t('common.states.loading', 'Cargando…')}</p>
        ) : (
          <>
            {options.length === 0 && <p className="photo-chooser__empty">{t('photo.none', 'Todavía no tienes ninguna foto: sube una.')}</p>}
            <ul className="photo-chooser__list" role="radiogroup" aria-label={t('photo.title', 'Tu foto')}>
              {options.map((k) => {
                const inUse = data.options[k] === data.image_user;
                return (
                  <li key={k}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={inUse}
                      className={`photo-chooser__option ${inUse ? 'is-in-use' : ''}`}
                      onClick={() => choose(k)}
                      disabled={busy}
                    >
                      <img src={userPhotoUrl(data.options[k], k === 'google' ? null : stamp)} alt="" className="photo-chooser__img" />
                      <span className="photo-chooser__label">{LABELS[k]}</span>
                      <span className="photo-chooser__state">
                        {inUse ? <><Check size={14} aria-hidden="true" /> {t('photo.inUse', 'En uso')}</> : t('photo.use', 'Usar esta')}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {!data.options.google && (
              <p className="photo-chooser__note">{t('photo.noGoogle', 'Tu foto de Google aparecerá aquí la próxima vez que entres con Google.')}</p>
            )}
          </>
        )}

        <input ref={fileRef} type="file" accept={ACCEPT} onChange={upload} hidden />
        <div className="proposal-modal__actions">
          <button type="button" className="proposal-modal__btn proposal-modal__btn--primary" onClick={() => fileRef.current?.click()} disabled={busy || !data}>
            <Upload size={16} aria-hidden="true" /> {t('photo.upload', 'Subir una nueva')}
          </button>
          <button type="button" className="proposal-modal__btn" onClick={onClose} disabled={busy}>{t('common.buttons.close', 'Cerrar')}</button>
        </div>
        {data?.options?.has_profile && (
          <p className="photo-chooser__note">{t('photo.uploadNote', 'La nueva será también la foto de tu perfil de autor/a.')}</p>
        )}
      </div>
    </div>,
    document.body
  );
}

export default PhotoChooser;
