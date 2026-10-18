// magazine-front/src/components/authors/InviteAuthorModal.jsx
//
// Super admins sign up an author who has no account yet (or is only a
// reader): a name and the email they will sign in with. The server emails
// the invitation and the person answers when they sign in
// (AuthorInvitationModal). Meanwhile the super admin can write their profile
// and credit them on publications.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, UserPlus } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import './AuthorInvitationModal.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Which field a server error belongs to.
const FIELD_OF = { invalid_name: 'name', name_taken: 'name', invalid_email: 'email', already_team: 'email', already_invited: 'email' };

// onInvited(response, typedName): the server's { data, emailSent, success }.
function InviteAuthorModal({ onClose, onInvited }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null); // { field: 'name' | 'email' | null, message }
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, ' ');
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2) {
      setError({ field: 'name', message: t('authors.invite.nameRequired', 'Escribe su nombre (al menos 2 letras).') });
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setError({ field: 'email', message: t('authors.invite.emailInvalid', 'Escribe un email válido.') });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await axiosInstance.post(
        '/user/invite-author',
        { name: cleanName, email: cleanEmail },
        { headers: { 'x-user-id': currentUser?.id_user } }
      );
      onInvited(res.data, cleanName);
    } catch (err) {
      const data = err.response?.data;
      setError({
        field: FIELD_OF[data?.code] || null,
        message: data?.error || t('authors.invite.error', 'No se pudo dar de alta. Inténtalo de nuevo.')
      });
    } finally {
      setBusy(false);
    }
  };

  const errorFor = (field) => (error && error.field === field ? error.message : null);

  return createPortal(
    <div className="author-invite-overlay" onClick={onClose}>
      <div
        className="author-invite-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-author-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="author-invite-modal__close"
          onClick={onClose}
          title={t('common.buttons.close', 'Cerrar')}
          aria-label={t('common.buttons.close', 'Cerrar')}
        >
          <X size={22} />
        </button>

        <span className="author-invite-modal__icon" aria-hidden="true"><UserPlus size={26} /></span>
        <h2 id="invite-author-title">{t('authors.invite.title', 'Nueva autora o autor')}</h2>
        <p className="author-invite-modal__text">
          {t('authors.invite.lead', 'Para alguien que aún no tiene cuenta en la revista. Le enviaremos un email; cuando inicie sesión con ese email, podrá aceptar su alta como autora o autor.')}
        </p>

        <form className="author-invite-form" onSubmit={submit} noValidate>
          <div className="author-invite-form__field">
            <label htmlFor="invite-author-name">{t('authors.invite.name', 'Nombre')}</label>
            <input
              ref={nameRef}
              id="invite-author-name"
              type="text"
              value={name}
              maxLength={100}
              autoComplete="off"
              aria-invalid={errorFor('name') ? 'true' : 'false'}
              aria-describedby="invite-author-name-hint"
              onChange={(e) => setName(e.target.value)}
            />
            <p id="invite-author-name-hint" className="author-invite-form__hint">
              {t('authors.invite.nameHint', 'Como aparecerá en sus publicaciones.')}
            </p>
            {errorFor('name') && <p className="author-invite-form__error" role="alert">{errorFor('name')}</p>}
          </div>

          <div className="author-invite-form__field">
            <label htmlFor="invite-author-email">{t('authors.invite.email', 'Email')}</label>
            <input
              id="invite-author-email"
              type="email"
              inputMode="email"
              value={email}
              maxLength={255}
              autoComplete="off"
              aria-invalid={errorFor('email') ? 'true' : 'false'}
              aria-describedby="invite-author-email-hint"
              onChange={(e) => setEmail(e.target.value)}
            />
            <p id="invite-author-email-hint" className="author-invite-form__hint">
              {t('authors.invite.emailHint', 'El de su cuenta de Google: en la revista se entra con Google.')}
            </p>
            {errorFor('email') && <p className="author-invite-form__error" role="alert">{errorFor('email')}</p>}
          </div>

          {error && !error.field && <p className="author-invite-form__error" role="alert">{error.message}</p>}

          <p className="author-invite-form__note">
            {t('authors.invite.note', 'Mientras no responda, ya puedes crear su perfil e incluir su nombre en tus publicaciones. Si rechaza, su perfil deja de mostrarse y las publicaciones conservan su nombre.')}
          </p>

          <div className="author-invite-modal__actions">
            <button type="submit" className="author-invite-modal__btn author-invite-modal__btn--primary" disabled={busy}>
              {busy ? t('authors.invite.sending', 'Enviando…') : t('authors.invite.submit', 'Dar de alta')}
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

export default InviteAuthorModal;
