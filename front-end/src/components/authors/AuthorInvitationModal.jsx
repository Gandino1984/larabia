// magazine-front/src/components/authors/AuthorInvitationModal.jsx
//
// The invited person's answer to being signed up as an author
// (AuthorInvitationContext): Aceptar → editora; No, gracias → stays a reader
// and their author profile is hidden (the publications keep their name);
// Decidir más tarde → the bell keeps the invitation.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, PenLine } from 'lucide-react';
import { useAuthorInvitation } from '../../app_context/AuthorInvitationContext';
import './AuthorInvitationModal.css';

function AuthorInvitationModal() {
  const { t } = useTranslation();
  const { invitation, modalOpen, busy, later, respond } = useAuthorInvitation();
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const open = !!invitation && modalOpen;

  useEffect(() => {
    if (!open) { setConfirmingDecline(false); return undefined; }
    const onKey = (e) => { if (e.key === 'Escape') later(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, later]);

  if (!open) return null;
  const inviter = invitation.inviter?.name_user;

  return createPortal(
    <div className="author-invite-overlay" onClick={later}>
      <div
        className="author-invite-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="author-invite-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="author-invite-modal__close"
          onClick={later}
          title={t('common.buttons.close', 'Cerrar')}
          aria-label={t('common.buttons.close', 'Cerrar')}
        >
          <X size={22} />
        </button>

        <span className="author-invite-modal__icon" aria-hidden="true"><PenLine size={26} /></span>
        <h2 id="author-invite-title">{t('authorInvitation.title', 'Te han dado de alta como autora o autor')}</h2>

        {!confirmingDecline ? (
          <>
            <p className="author-invite-modal__lead">
              {inviter
                ? t('authorInvitation.leadBy', { name: inviter, defaultValue: '{{name}} te ha dado de alta en Autoras/es de la revista.' })
                : t('authorInvitation.lead', 'Te han dado de alta en Autoras/es de la revista.')}
            </p>
            <p className="author-invite-modal__text">
              {t('authorInvitation.acceptInfo', 'Si aceptas, podrás editar tu perfil de autora o autor y publicar artículos y proyectos. Lo que publiques pasa por la revisión de la revista antes de salir.')}
            </p>
            <div className="author-invite-modal__actions">
              <button
                type="button"
                className="author-invite-modal__btn author-invite-modal__btn--primary"
                onClick={() => respond('accept')}
                disabled={busy}
              >
                {t('authorInvitation.accept', 'Aceptar')}
              </button>
              <button
                type="button"
                className="author-invite-modal__btn"
                onClick={() => setConfirmingDecline(true)}
                disabled={busy}
              >
                {t('authorInvitation.decline', 'No, gracias')}
              </button>
            </div>
            <button type="button" className="author-invite-modal__later" onClick={later}>
              {t('authorInvitation.later', 'Decidir más tarde')}
            </button>
          </>
        ) : (
          <>
            <p className="author-invite-modal__lead">
              {t('authorInvitation.confirmDecline', '¿Seguro que no quieres formar parte de Autoras/es?')}
            </p>
            <p className="author-invite-modal__text">
              {t('authorInvitation.declineInfo', 'Tu perfil de autora o autor dejará de mostrarse. Las publicaciones en las que apareces conservarán tu nombre, y seguirás teniendo tu cuenta en la revista.')}
            </p>
            <div className="author-invite-modal__actions">
              <button
                type="button"
                className="author-invite-modal__btn author-invite-modal__btn--danger"
                onClick={() => respond('decline')}
                disabled={busy}
              >
                {t('authorInvitation.declineConfirm', 'Sí, rechazar')}
              </button>
              <button
                type="button"
                className="author-invite-modal__btn"
                onClick={() => setConfirmingDecline(false)}
                disabled={busy}
              >
                {t('authorInvitation.back', 'Volver')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default AuthorInvitationModal;
