// magazine-front/src/components/authors/AuthorInvitationBox.jsx
//
// In the profile editor, for super admins: where the invitation of an author
// they signed up stands (InviteAuthorModal). Pending: when its email went out
// (or that it isn't recorded as sent), resend it, or correct the address
// while the person hasn't signed in. Declined: their
// profile can't be published and their publications are signed by the
// magazine; invite them again.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { useMetadata } from '../../app_context/MetadataContext';
import { localDate, serverDate } from '../../utils/locale';
import './AuthorInvitationBox.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthorInvitationBox({ userId }) {
  const { t, i18n } = useTranslation();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useUI();
  const brand = useMetadata()?.metadata?.name || 'La Rabia';
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(null);

  const auth = useCallback(() => ({ headers: { 'x-user-id': currentUser?.id_user } }), [currentUser?.id_user]);

  useEffect(() => {
    let active = true;
    setInvite(null);
    axiosInstance.get(`/user/invite-author/${userId}`, auth())
      .then((res) => { if (active) setInvite(res.data?.data || null); })
      .catch(() => { /* not invited: nothing to show */ });
    return () => { active = false; };
  }, [userId, auth]);

  if (!invite || (invite.author_invite_status !== 'pending' && invite.author_invite_status !== 'declined')) return null;

  // When the email went out — not when the invitation was made: the box said
  // «Enviada» even when the email had failed.
  const sentAt = serverDate(invite.author_invite_email_sent_at);
  const sentWhen = sentAt ? localDate(sentAt, { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const resend = async (newEmail) => {
    setBusy(true);
    setEmailError(null);
    try {
      const res = await axiosInstance.post(
        `/user/invite-author/${userId}/resend`,
        newEmail ? { email: newEmail } : {},
        auth()
      );
      setInvite((prev) => ({ ...prev, ...res.data?.data }));
      setEditingEmail(false);
      showSuccess(res.data?.success || t('authors.invitation.resent', 'Invitación enviada'));
    } catch (err) {
      const msg = err.response?.data?.error || t('authors.invitation.resendError', 'No se pudo reenviar la invitación');
      if (newEmail) setEmailError(msg);
      else showError(msg);
    } finally {
      setBusy(false);
    }
  };

  const inviteAgain = async () => {
    setBusy(true);
    try {
      const res = await axiosInstance.post(
        '/user/invite-author',
        { name: invite.name_user, email: invite.email_user },
        auth()
      );
      setInvite((prev) => ({ ...prev, ...res.data?.data }));
      showSuccess(res.data?.success || t('authors.invitation.resent', 'Invitación enviada'));
    } catch (err) {
      showError(err.response?.data?.error || t('authors.invitation.resendError', 'No se pudo reenviar la invitación'));
    } finally {
      setBusy(false);
    }
  };

  const saveEmail = (e) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!emailRegex.test(clean)) {
      setEmailError(t('authors.invite.emailInvalid', 'Escribe un email válido.'));
      return;
    }
    resend(clean);
  };

  if (invite.author_invite_status === 'declined') {
    return (
      <section className="author-invitation-box is-declined" aria-live="polite">
        <h2 className="author-invitation-box__title">{t('authors.invitation.declinedTitle', 'Rechazó la invitación')}</h2>
        <p className="author-invitation-box__text">
          {t('authors.invitation.declinedText', { brand, defaultValue: 'Su perfil no se muestra en Autoras/es y no se puede publicar. Las publicaciones que firmaba pasaron a firmarse como «{{brand}}».' })}
        </p>
        <div className="author-invitation-box__actions">
          <button type="button" className="author-invitation-box__btn" onClick={inviteAgain} disabled={busy}>
            {t('authors.invitation.inviteAgain', 'Volver a invitar')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="author-invitation-box" aria-live="polite">
      <h2 className="author-invitation-box__title">{t('authors.invitation.pendingTitle', 'Invitación pendiente')}</h2>
      {sentWhen ? (
        <p className="author-invitation-box__text">
          {t('authors.invitation.pendingText', { email: invite.email_user, date: sentWhen, defaultValue: 'Enviada a {{email}} el {{date}}. Aún no ha respondido: verá la invitación cuando inicie sesión con ese email.' })}
        </p>
      ) : (
        <p className="author-invitation-box__text author-invitation-box__text--unsent" role="status">
          {t('authors.invitation.notSent', { email: invite.email_user, defaultValue: 'El email de invitación a {{email}} no consta como enviado. Pulsa «Enviar email» para enviarlo.' })}
        </p>
      )}

      {editingEmail ? (
        <form className="author-invitation-box__email" onSubmit={saveEmail} noValidate>
          <label htmlFor="author-invitation-email">{t('authors.invitation.newEmail', 'Email correcto')}</label>
          <input
            id="author-invitation-email"
            type="email"
            inputMode="email"
            value={email}
            maxLength={255}
            autoComplete="off"
            aria-invalid={emailError ? 'true' : 'false'}
            onChange={(e) => setEmail(e.target.value)}
          />
          {emailError && <p className="author-invitation-box__error" role="alert">{emailError}</p>}
          <div className="author-invitation-box__actions">
            <button type="submit" className="author-invitation-box__btn author-invitation-box__btn--primary" disabled={busy}>
              {t('authors.invitation.saveAndSend', 'Guardar y enviar')}
            </button>
            <button type="button" className="author-invitation-box__btn" onClick={() => { setEditingEmail(false); setEmailError(null); }} disabled={busy}>
              {t('common.buttons.cancel', 'Cancelar')}
            </button>
          </div>
        </form>
      ) : (
        <div className="author-invitation-box__actions">
          <button type="button" className="author-invitation-box__btn" onClick={() => resend(null)} disabled={busy}>
            {sentWhen ? t('authors.invitation.resend', 'Reenviar email') : t('authors.invitation.send', 'Enviar email')}
          </button>
          {!invite.has_signed_in && (
            <button
              type="button"
              className="author-invitation-box__btn"
              onClick={() => { setEmail(invite.email_user || ''); setEditingEmail(true); }}
              disabled={busy}
            >
              {t('authors.invitation.fixEmail', 'Corregir email')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default AuthorInvitationBox;
