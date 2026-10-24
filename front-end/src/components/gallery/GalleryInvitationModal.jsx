// magazine-front/src/components/gallery/GalleryInvitationModal.jsx
//
// The invited person's answer to being invited to the Galería as a visual
// artist (GalleryContext): Aceptar → artist («Mi galería»); No, gracias → the
// invitation is declined; Decidir más tarde → the bell keeps it. Same look as
// the author invitation (AuthorInvitationModal.css).
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Palette } from 'lucide-react';
import { useGallery } from '../../app_context/GalleryContext';
import { useUI } from '../../app_context/UIContext';
import '../authors/AuthorInvitationModal.css';

function GalleryInvitationModal() {
  const { t } = useTranslation();
  const { invitation, inviteModalOpen, busy, later, respond } = useGallery();
  const { navigateToMyGallery } = useUI();
  const open = !!invitation && inviteModalOpen;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') later(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, later]);

  if (!open) return null;
  const inviter = invitation.inviter?.name_user;

  const accept = async () => {
    const res = await respond('accept');
    if (res?.success) navigateToMyGallery();
  };

  return createPortal(
    <div className="author-invite-overlay" onClick={later}>
      <div className="author-invite-modal" role="dialog" aria-modal="true" aria-labelledby="artist-invite-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="author-invite-modal__close" onClick={later} title={t('common.buttons.close', 'Cerrar')} aria-label={t('common.buttons.close', 'Cerrar')}>
          <X size={22} />
        </button>
        <span className="author-invite-modal__icon" aria-hidden="true"><Palette size={26} /></span>
        <h2 id="artist-invite-title">{t('gallery.invitation.title', 'Te invitan a exponer en la Galería')}</h2>
        <p className="author-invite-modal__lead">
          {inviter
            ? t('gallery.invitation.leadBy', { name: inviter, defaultValue: '{{name}} te invita a exponer tu obra en la Galería de la revista, como artista visual.' })
            : t('gallery.invitation.lead', 'Te invitan a exponer tu obra en la Galería de la revista, como artista visual.')}
        </p>
        <p className="author-invite-modal__text">
          {t('gallery.invitation.info', 'Si aceptas, podrás montar tu exposición: un título, un texto breve y hasta siete obras, que el equipo revisa antes de mostrarlas. Quien visite la galería podrá escribirte, y le responderás desde tu galería.')}
        </p>
        <div className="author-invite-modal__actions">
          <button type="button" className="author-invite-modal__btn author-invite-modal__btn--primary" onClick={accept} disabled={busy}>
            {t('authorInvitation.accept', 'Aceptar')}
          </button>
          <button type="button" className="author-invite-modal__btn" onClick={() => respond('decline')} disabled={busy}>
            {t('authorInvitation.decline', 'No, gracias')}
          </button>
        </div>
        <button type="button" className="author-invite-modal__later" onClick={later}>
          {t('authorInvitation.later', 'Decidir más tarde')}
        </button>
      </div>
    </div>,
    document.body
  );
}

export default GalleryInvitationModal;
