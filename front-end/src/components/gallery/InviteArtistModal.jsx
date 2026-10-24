// magazine-front/src/components/gallery/InviteArtistModal.jsx
//
// Super admins invite a visual artist to the Galería: a name and the email
// they'll sign in with (Google). Someone with an account keeps it (they also
// become an artist when they accept); someone without one gets an account for
// that email. The server emails the invitation (Spanish and English) and the
// person answers when they sign in (GalleryInvitationModal). Same look as the
// author invitation (AuthorInvitationModal.css).
// withGallery: «Crear una galería» — the same invitation, plus a gallery the
// super admin prepares on their behalf (the caller opens it); someone already
// invited just gets the gallery.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Palette } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import '../authors/AuthorInvitationModal.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD_OF = { invalid_name: 'name', name_taken: 'name', invalid_email: 'email', already_artist: 'email', already_invited: 'email' };

// onInvited(response): the server's { data, emailSent, success }.
function InviteArtistModal({ onClose, onInvited, withGallery = false }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, ' ');
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2) { setError({ field: 'name', message: t('authors.invite.nameRequired', 'Escribe su nombre (al menos 2 letras).') }); return; }
    if (!emailRegex.test(cleanEmail)) { setError({ field: 'email', message: t('authors.invite.emailInvalid', 'Escribe un email válido.') }); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await axiosInstance.post('/gallery/invite', { name: cleanName, email: cleanEmail, gallery: withGallery }, { headers: { 'x-user-id': currentUser?.id_user } });
      onInvited(res.data);
    } catch (err) {
      const data = err.response?.data;
      setError({ field: FIELD_OF[data?.code] || null, message: data?.error || t('gallery.invite.error', 'No se pudo enviar la invitación. Inténtalo de nuevo.') });
    } finally {
      setBusy(false);
    }
  };

  const errorFor = (field) => (error && error.field === field ? error.message : null);

  return createPortal(
    <div className="author-invite-overlay" onClick={onClose}>
      <div className="author-invite-modal" role="dialog" aria-modal="true" aria-labelledby="invite-artist-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="author-invite-modal__close" onClick={onClose} title={t('common.buttons.close', 'Cerrar')} aria-label={t('common.buttons.close', 'Cerrar')}>
          <X size={22} />
        </button>
        <span className="author-invite-modal__icon" aria-hidden="true"><Palette size={26} /></span>
        <h2 id="invite-artist-title">{withGallery ? t('gallery.create.title', 'Crear una galería') : t('gallery.invite.title', 'Invitar artista')}</h2>
        <p className="author-invite-modal__text">
          {withGallery
            ? t('gallery.create.lead', 'Prepara la galería de una o un artista en su nombre. Le enviaremos un email (en castellano e inglés) para que la acepte al iniciar sesión con ese email; entonces pasará a gestionarla. Hasta que la acepte, no se ve en la web.')
            : t('gallery.invite.lead', 'Le enviaremos un email (en castellano e inglés). Cuando inicie sesión con ese email, podrá aceptar y montar su exposición en la galería: un título, un texto breve y hasta quince obras.')}
        </p>
        <form className="author-invite-form" onSubmit={submit} noValidate>
          <div className="author-invite-form__field">
            <label htmlFor="invite-artist-name">{t('authors.invite.name', 'Nombre')}</label>
            <input ref={nameRef} id="invite-artist-name" type="text" value={name} maxLength={100} autoComplete="off"
              aria-invalid={errorFor('name') ? 'true' : 'false'} onChange={(e) => setName(e.target.value)} />
            {errorFor('name') && <p className="author-invite-form__error" role="alert">{errorFor('name')}</p>}
          </div>
          <div className="author-invite-form__field">
            <label htmlFor="invite-artist-email">{t('authors.invite.email', 'Email')}</label>
            <input id="invite-artist-email" type="email" inputMode="email" value={email} maxLength={255} autoComplete="off"
              aria-invalid={errorFor('email') ? 'true' : 'false'} aria-describedby="invite-artist-email-hint" onChange={(e) => setEmail(e.target.value)} />
            <p id="invite-artist-email-hint" className="author-invite-form__hint">
              {t('authors.invite.emailHint', 'El de su cuenta de Google: en la revista se entra con Google.')}
            </p>
            {errorFor('email') && <p className="author-invite-form__error" role="alert">{errorFor('email')}</p>}
          </div>
          {error && !error.field && <p className="author-invite-form__error" role="alert">{error.message}</p>}
          <p className="author-invite-form__note">
            {t('gallery.invite.note', 'Si ya tiene cuenta en la revista, la conserva: ser artista se suma a lo que ya es.')}
          </p>
          <div className="author-invite-modal__actions">
            <button type="submit" className="author-invite-modal__btn author-invite-modal__btn--primary" disabled={busy}>
              {busy
                ? t('authors.invite.sending', 'Enviando…')
                : withGallery ? t('gallery.create.submit', 'Crear y enviar la invitación') : t('gallery.invite.submit', 'Enviar la invitación')}
            </button>
            <button type="button" className="author-invite-modal__btn" onClick={onClose} disabled={busy}>
              {t('common.buttons.cancel', 'Cancelar')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default InviteArtistModal;
