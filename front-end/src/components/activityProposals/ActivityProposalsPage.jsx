// magazine-front/src/components/activityProposals/ActivityProposalsPage.jsx
//
// «Propón una actividad» (Barrio › Propón una actividad): a public page where
// anyone proposes a workshop or an open call / contest. Sending one needs a
// Google sign-in, right here (if they have no account yet, signing in makes
// it). Two in progress at most per person (sent or being considered); they
// see theirs and withdraw one while nobody has decided. Admins and super
// admins also find here the proposals received (ActivityProposalsReview):
// approving one emails its person that we've received it and are considering
// it. Back-end: /activity-proposals (activity_proposal_api_controller.js).
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, Users, Megaphone, Send, Undo2, CheckCircle2, Hourglass, XCircle, LogIn } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { useMetadata } from '../../app_context/MetadataContext';
import { usePendingReview } from '../../app_context/PendingReviewContext';
import { GoogleSignIn } from '../google-auth/GoogleSignIn';
import { localDate, serverDate } from '../../utils/locale';
import ActivityProposalsReview from './ActivityProposalsReview';
import ActivityKindTag from './ActivityKindTag';
import '../openmic/OpenSpaceProposalModal.css';
import './ActivityProposals.css';

export const LIMITS = { title: 150, description: 3000, details: 1500 };
const EMPTY = { kind: 'workshop', title: '', description: '', details: '' };

function ActivityProposalsPage() {
  const { t } = useTranslation();
  const { currentUser, setUser, isAdmin, isSuperAdmin } = useAuth();
  const { showSuccess, showError, navigateToLogin } = useUI();
  const brand = useMetadata()?.metadata?.name || 'La Rabia';
  const { refreshActivityProposals } = usePendingReview();
  const [mine, setMine] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const userId = currentUser?.id_user;
  const reviewer = isAdmin || isSuperAdmin;

  const loadMine = useCallback(async () => {
    if (!userId) { setMine(null); return; }
    try {
      const res = await axiosInstance.get('/activity-proposals/mine', { headers: { 'x-user-id': userId } });
      setMine(res.data.data);
    } catch {
      setMine({ items: [], active: 0, max: 2 });
    }
  }, [userId]);
  useEffect(() => { loadMine(); }, [loadMine]);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined, form: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const problems = {};
    if (!form.title.trim()) problems.title = t('activityProposals.form.needTitle', 'Escribe el título de tu propuesta');
    if (!form.description.trim()) problems.description = t('activityProposals.form.needDescription', 'Cuéntanos en qué consiste tu propuesta');
    if (Object.keys(problems).length) { setErrors(problems); return; }
    setBusy(true);
    try {
      const res = await axiosInstance.post('/activity-proposals', {
        kind: form.kind, title: form.title.trim(), description: form.description.trim(), details: form.details.trim()
      }, { headers: { 'x-user-id': userId } });
      setSent(res.data.data);
      setForm(EMPTY);
      showSuccess(res.data.success);
      loadMine();
      refreshActivityProposals?.();
    } catch (err) {
      setErrors({ form: err.response?.data?.error || t('activityProposals.form.error', 'No se pudo enviar la propuesta') });
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (p) => {
    if (!window.confirm(t('activityProposals.mine.confirmWithdraw', { title: p.title_proposal, defaultValue: '¿Retirar «{{title}}»? Dejaremos de tenerla en cuenta.' }))) return;
    try {
      const res = await axiosInstance.delete(`/activity-proposals/${p.id_activity_proposal}`, { headers: { 'x-user-id': userId } });
      showSuccess(res.data.success);
      loadMine();
      refreshActivityProposals?.();
    } catch (err) {
      showError(err.response?.data?.error || t('activityProposals.mine.withdrawError', 'No se pudo retirar la propuesta'));
    }
  };

  // Signed in right here: the page stays (the proposal is the point).
  const onSignedIn = (userData, message, code) => {
    setUser(userData);
    showSuccess(code === 'account_created'
      ? t('messages.success.accountCreatedNewsletter', { name: userData.name_user })
      : t('messages.success.accountWelcomeBack', { name: userData.name_user }));
  };

  const full = !!mine && mine.active >= mine.max;
  const STATUS = {
    new: { Icon: Hourglass, label: t('activityProposals.status.new', 'Enviada: la leeremos pronto') },
    considering: { Icon: CheckCircle2, label: t('activityProposals.status.considering', 'La estamos considerando') },
    declined: { Icon: XCircle, label: t('activityProposals.status.declined', 'Esta vez no ha salido adelante') }
  };

  return (
    <div className="activity-page">
      <div className="activity-container">
        <header className="activity-header">
          <h1><Lightbulb size={30} aria-hidden="true" /> {t('activityProposals.title', 'Propón una actividad')}</h1>
          <p className="activity-subtitle">
            {t('activityProposals.subtitle', { brand, defaultValue: '¿Se te ocurre un taller, un concurso o una convocatoria para el barrio? Cuéntanoslo: el equipo de {{brand}} lee todas las propuestas.' })}
          </p>
        </header>

        <section className="activity-how" aria-labelledby="activity-how-title">
          <h2 id="activity-how-title">{t('activityProposals.how.title', 'Cómo funciona')}</h2>
          <ol>
            <li>{t('activityProposals.how.signIn', 'Entra con tu cuenta de Google. Si aún no tienes cuenta en la revista, se crea al entrar.')}</li>
            <li>{t('activityProposals.how.tell', 'Cuéntanos tu idea: un taller, o una convocatoria o un concurso. Puedes tener hasta 2 propuestas en curso.')}</li>
            <li>{t('activityProposals.how.review', 'El equipo la lee y, si sale adelante, te escribimos a tu correo para decirte que la estamos considerando.')}</li>
          </ol>
        </section>

        {!currentUser ? (
          <section className="activity-signin" aria-labelledby="activity-signin-title">
            <h2 id="activity-signin-title"><LogIn size={20} aria-hidden="true" /> {t('activityProposals.signIn.title', 'Entra para proponer')}</h2>
            <p>{t('activityProposals.signIn.text', 'Solo necesitas una cuenta de Google: así sabremos a quién escribir.')}</p>
            <div className="activity-signin__button">
              <GoogleSignIn
                onSuccess={onSignedIn}
                onError={(m) => showError(m)}
                onNeedsLinking={() => navigateToLogin()}
                onNeedsSelection={() => navigateToLogin()}
                onNeedsTypeSelection={() => navigateToLogin()}
                isRegisterMode={false}
              />
            </div>
            <p className="activity-note">
              {t('auth.login.newsletterNote', 'Si aún no tienes cuenta, al crearla te apuntamos a las recomendaciones de la revista por correo. Puedes darte de baja cuando quieras, con un clic desde cualquier correo.')}
            </p>
          </section>
        ) : sent ? (
          <section className="activity-sent" role="status">
            <CheckCircle2 size={40} aria-hidden="true" />
            <h2>{t('activityProposals.sent.title', '¡Gracias!')}</h2>
            <p>{t('activityProposals.sent.text', { title: sent.title_proposal, email: currentUser.email_user, defaultValue: 'Hemos recibido «{{title}}». Si sale adelante, te escribiremos a {{email}}.' })}</p>
            <button type="button" className="activity-btn" onClick={() => setSent(null)}>{t('activityProposals.sent.again', 'Volver')}</button>
          </section>
        ) : full ? (
          <p className="activity-full" role="note">
            {t('activityProposals.full', { max: mine.max, defaultValue: 'Ya tienes {{max}} propuestas en curso. Cuando las revisemos —o si retiras una— podrás enviar otra.' })}
          </p>
        ) : (
          <form className="activity-form proposal-form" onSubmit={submit} noValidate aria-labelledby="activity-form-title">
            <h2 id="activity-form-title">{t('activityProposals.form.title', 'Tu propuesta')}</h2>
            <fieldset className="activity-form__kinds">
              <legend>{t('activityProposals.form.kind', '¿Qué propones?')}</legend>
              {[
                { key: 'workshop', Icon: Users, title: t('activityProposals.kind.workshop', 'Taller'), desc: t('activityProposals.kind.workshopDesc', 'Algo que enseñar o aprender juntas y juntos: una técnica, un oficio, una forma de contar.') },
                { key: 'call', Icon: Megaphone, title: t('activityProposals.kind.call', 'Convocatoria o concurso'), desc: t('activityProposals.kind.callDesc', 'Una llamada a que la gente envíe sus obras sobre un tema; puede tener premios.') }
              ].map(({ key, Icon, title, desc }) => (
                <button
                  key={key}
                  type="button"
                  className={`activity-kind-choice ${form.kind === key ? 'is-selected' : ''}`}
                  aria-pressed={form.kind === key}
                  onClick={() => set('kind', key)}
                >
                  <Icon size={24} aria-hidden="true" />
                  <span className="activity-kind-choice__title">{title}</span>
                  <span className="activity-kind-choice__desc">{desc}</span>
                </button>
              ))}
            </fieldset>

            <div className="proposal-form__field">
              <label htmlFor="ap-title">{t('activityProposals.form.titleLabel', 'Título *')}</label>
              <input
                id="ap-title"
                type="text"
                value={form.title}
                maxLength={LIMITS.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder={form.kind === 'call'
                  ? t('activityProposals.form.titlePlaceholderCall', 'Ej. Concurso de fotos de los balcones del barrio')
                  : t('activityProposals.form.titlePlaceholderWorkshop', 'Ej. Taller de serigrafía para estampar camisetas')}
                aria-invalid={!!errors.title}
              />
              {errors.title && <p className="proposal-form__error" role="alert">{errors.title}</p>}
            </div>
            <div className="proposal-form__field">
              <label htmlFor="ap-description">{t('activityProposals.form.descriptionLabel', '¿En qué consiste? *')}</label>
              <textarea
                id="ap-description"
                rows={6}
                value={form.description}
                maxLength={LIMITS.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder={form.kind === 'call'
                  ? t('activityProposals.form.descriptionPlaceholderCall', '¿Sobre qué tema? ¿Quién puede participar y qué tendría que enviar?')
                  : t('activityProposals.form.descriptionPlaceholderWorkshop', '¿Qué se haría? ¿Para quién es? ¿Lo impartirías tú?')}
                aria-invalid={!!errors.description}
              />
              <p className="proposal-form__hint">{form.description.length}/{LIMITS.description}</p>
              {errors.description && <p className="proposal-form__error" role="alert">{errors.description}</p>}
            </div>
            <div className="proposal-form__field">
              <label htmlFor="ap-details">{t('activityProposals.form.detailsLabel', 'Detalles (opcional)')}</label>
              <textarea
                id="ap-details"
                rows={3}
                value={form.details}
                maxLength={LIMITS.details}
                onChange={(e) => set('details', e.target.value)}
                placeholder={t('activityProposals.form.detailsPlaceholder', 'Fechas, duración, lugar, materiales, cuántas personas…')}
              />
            </div>
            <p className="proposal-form__note">
              {t('activityProposals.form.note', { email: currentUser.email_user, defaultValue: 'Si sale adelante, te escribiremos a {{email}}.' })}
              {mine && ` ${t('activityProposals.form.left', { count: mine.max - mine.active, defaultValue: 'Te quedan {{count}} propuestas.' })}`}
            </p>
            {errors.form && <p className="proposal-form__error proposal-form__error--box" role="alert">{errors.form}</p>}
            <div className="activity-form__actions">
              <button type="submit" className="activity-btn activity-btn--primary" disabled={busy}>
                <Send size={16} aria-hidden="true" /> {busy ? t('activityProposals.form.sending', 'Enviando…') : t('activityProposals.form.send', 'Enviar propuesta')}
              </button>
            </div>
          </form>
        )}

        {mine?.items?.length > 0 && (
          <section className="activity-mine" aria-labelledby="activity-mine-title">
            <h2 id="activity-mine-title">{t('activityProposals.mine.title', 'Tus propuestas')}</h2>
            <ul>
              {mine.items.map((p) => {
                const st = STATUS[p.status_proposal] || STATUS.new;
                const at = serverDate(p.created_at);
                return (
                  <li key={p.id_activity_proposal} className={`activity-mine__item is-${p.status_proposal}`}>
                    <div className="activity-mine__head">
                      <ActivityKindTag kind={p.kind_proposal} />
                      <strong>{p.title_proposal}</strong>
                    </div>
                    <p className="activity-mine__status"><st.Icon size={15} aria-hidden="true" /> {st.label}</p>
                    {at && <p className="activity-mine__date">{localDate(at, { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                    {p.status_proposal === 'new' && (
                      <button type="button" className="activity-mine__withdraw" onClick={() => withdraw(p)}>
                        <Undo2 size={15} aria-hidden="true" /> {t('activityProposals.mine.withdraw', 'Retirar')}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* The team: what has come in. */}
        {reviewer && <ActivityProposalsReview />}
      </div>
    </div>
  );
}

export default ActivityProposalsPage;
