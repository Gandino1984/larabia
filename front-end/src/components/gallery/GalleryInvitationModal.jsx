// magazine-front/src/components/gallery/GalleryInvitationModal.jsx
//
// The invited person's answer to being invited to the Galería as a visual
// artist (GalleryContext): Aceptar → artist («Mi galería»); No, gracias → the
// invitation is declined; Decidir más tarde → the bell keeps it. Same look as
// the author invitation (AuthorInvitationModal.css). With invitation.gallery,
// a super admin has prepared a gallery for them: accepting makes it theirs
// (and public); declining deletes it.
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Palette } from 'lucide-react';
import { useGallery } from '../../app_context/GalleryContext';
import { useUI } from '../../app_context/UIContext';
import { useAuth } from '../../app_context/AuthContext';
import '../authors/AuthorInvitationModal.css';

function GalleryInvitationModal() {
  const { t } = useTranslation();
  const { invitation, inviteModalOpen, busy, later, respond } = useGallery();
  const { navigateToMyGallery } = useUI();
  const { currentUser } = useAuth();
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
  const gallery = invitation.gallery;

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
        <h2 id="artist-invite-title">
          {gallery ? t('gallery.invitation.preparedTitle', 'Te han preparado una galería') : t('gallery.invitation.title', 'Te invitan a exponer en la Galería')}
        </h2>
        <p className="author-invite-modal__lead">
          {gallery
            ? (inviter
              ? t('gallery.invitation.preparedLeadBy', { name: inviter, defaultValue: '{{name}} te ha preparado una galería en la revista, para que expongas tu obra como artista visual.' })
              : t('gallery.invitation.preparedLead', 'Te han preparado una galería en la revista, para que expongas tu obra como artista visual.'))
            : (inviter
              ? t('gallery.invitation.leadBy', { name: inviter, defaultValue: '{{name}} te invita a exponer tu obra en la Galería de la revista, como artista visual.' })
              : t('gallery.invitation.lead', 'Te invitan a exponer tu obra en la Galería de la revista, como artista visual.'))}
        </p>
        {gallery && (
          <p className="author-invite-modal__text">
            <strong>{gallery.title || currentUser?.name_user}</strong>
            {' · '}{t('gallery.worksCount', { count: gallery.works_count })}
          </p>
        )}
        <p className="author-invite-modal__text">
          {gallery
            ? t('gallery.invitation.preparedInfo', 'Si la aceptas, pasarás a gestionarla tú: podrás cambiar su título, su texto y sus obras (hasta quince), y responder a quien te escriba. No se verá en la web hasta que la aceptes; si la rechazas, se borrará.')
            : t('gallery.invitation.info', 'Si aceptas, podrás montar tu exposición: un título, un texto breve y hasta quince obras, que el equipo revisa antes de mostrarlas. Quien visite la galería podrá escribirte, y le responderás desde tu galería.')}
        </p>
        <div className="author-invite-modal__actions">
          <button type="button" className="author-invite-modal__btn author-invite-modal__btn--primary" onClick={accept} disabled={busy}>
            {gallery ? t('gallery.invitation.acceptGallery', 'Aceptar la galería') : t('authorInvitation.accept', 'Aceptar')}
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
