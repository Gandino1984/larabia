// magazine-front/src/components/workshops/CallVoting.jsx
//
// The public vote on a convocatoria's published works (back-end:
// /magazine-workshop/calls/:id/…, call_vote_api_controller.js):
//   - anyone with an account: one vote per call — it can be withdrawn or
//     moved to another work while voting is open (until the resolution day);
//   - super admins: up to three works per call, counted apart;
//   - nobody votes for their own work.
// The results — the public's and the super admins', each in its own list —
// are in a modal: the super admins see them at any time, everyone else from
// the resolution day on.
//
//   useCallVoting(callId)  the call's voting state + vote / withdraw (one per
//                          page: the article's two buttons share it)
//   CallVoteButton         a work's button (next to its title, at its end,
//                          on the call's page)
//   CallVoteEnd            the box at the end of a work: its call, the
//                          button and the results
//   CallWorks              the call's page: its published works to vote
//   CallResultsModal       the results
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Vote, Check, X, BarChart3, Users, ShieldCheck } from 'lucide-react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { useMagazine } from '../../app_context/MagazineContext';
import { useWorkshop } from '../../app_context/WorkshopContext';
import { formatDay } from '../../utils/contests';
import { resolveCover } from './workshopForm';
import '../openmic/OpenSpaceProposalModal.css';
import './CallVoting.css';

/** The call's voting state ({ works, me, open, closes_on, results_visible, call }) and its actions. */
export function useCallVoting(callId) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useUI();
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const userId = currentUser?.id_user;
  const headers = userId ? { 'x-user-id': userId } : {};

  const reload = useCallback(async () => {
    if (!callId) { setState(null); return; }
    try {
      const res = await axiosInstance.get(`/magazine-workshop/calls/${callId}/voting`, { headers: userId ? { 'x-user-id': userId } : {} });
      setState(res.data.data || null);
    } catch {
      setState(null);
    }
  }, [callId, userId]);
  useEffect(() => { reload(); }, [reload]);

  const send = async (request) => {
    setBusy(true);
    try {
      const res = await request();
      setState(res.data.data);
      if (res.data.success) showSuccess(res.data.success);
    } catch (err) {
      showError(err.response?.data?.error || t('calls.vote.error', 'No se pudo registrar el voto'));
      reload();
    } finally {
      setBusy(false);
    }
  };

  /** Votes for the work — or withdraws the vote if it already had it. */
  const toggle = async (articleId) => {
    if (!state || busy) return;
    const me = state.me;
    if (!me.signed_in) {
      showError(t('calls.vote.loginNeeded', 'Inicia sesión para votar: hace falta una cuenta en la revista'));
      return;
    }
    const url = `/magazine-workshop/calls/${callId}/votes`;
    const had = me.jury ? me.jury_votes.includes(articleId) : me.public_vote === articleId;
    if (had) {
      if (!window.confirm(t('calls.vote.confirmWithdraw', '¿Retirar tu voto a esta obra?'))) return;
      await send(() => axiosInstance.delete(`${url}/${articleId}`, { headers }));
      return;
    }
    let move = false;
    if (!me.jury && me.public_vote) {
      const other = state.works.find((w) => w.id_article === me.public_vote);
      if (!window.confirm(t('calls.vote.confirmMove', {
        title: other?.title_article || '…',
        defaultValue: 'Ya votaste por «{{title}}». Solo hay un voto por convocatoria: ¿pasarlo a esta obra?'
      }))) return;
      move = true;
    }
    await send(() => axiosInstance.post(url, { article_id: articleId, move }, { headers }));
  };

  return { state, busy, toggle, reload };
}

/** A work's vote button. `voting`: useCallVoting(). Nothing while loading or if the work isn't in the call. */
export function CallVoteButton({ voting, articleId, className = '' }) {
  const { t } = useTranslation();
  const { state, busy, toggle } = voting;
  const work = state?.works.find((w) => w.id_article === articleId);
  if (!state || !work) return null;
  const me = state.me;
  let label;
  let hint = null;
  let pressed = false;
  let disabled = false;
  if (!state.open) {
    label = t('calls.vote.closed', 'Votación cerrada');
    disabled = true;
  } else if (work.mine) {
    label = t('calls.vote.yours', 'Tu obra');
    hint = t('calls.vote.yoursHint', 'No puedes votar tu propia obra');
    disabled = true;
  } else if (me.jury) {
    const left = me.jury_max - me.jury_votes.length;
    pressed = me.jury_votes.includes(articleId);
    if (pressed) {
      label = t('calls.vote.juryVoted', 'Votada');
      hint = t('calls.vote.withdrawHint', 'Pulsa para retirar tu voto');
    } else if (left <= 0) {
      label = t('calls.vote.juryFull', { max: me.jury_max, defaultValue: 'Ya diste tus {{max}} votos' });
      hint = t('calls.vote.juryFullHint', 'Retira uno de tus votos para votar esta obra');
      disabled = true;
    } else {
      label = t('calls.vote.juryVote', { left, defaultValue: 'Votar · te quedan {{left}}' });
      hint = t('calls.vote.juryHint', { max: me.jury_max, defaultValue: 'Los super admins votan hasta {{max}} obras por convocatoria (aparte del voto del público)' });
    }
  } else {
    pressed = me.public_vote === articleId;
    label = pressed ? t('calls.vote.voted', 'Has votado') : t('calls.vote.vote', 'Votar');
    hint = pressed
      ? t('calls.vote.withdrawHint', 'Pulsa para retirar tu voto')
      : t('calls.vote.voteHint', 'Un voto por persona y convocatoria: puedes cambiarlo hasta que se cierre la votación');
  }
  return (
    <button
      type="button"
      className={`call-vote-btn ${pressed ? 'is-voted' : ''} ${className}`}
      aria-pressed={pressed}
      disabled={disabled || busy}
      title={hint || undefined}
      onClick={() => toggle(articleId)}
    >
      {pressed ? <Check size={16} aria-hidden="true" /> : <Vote size={16} aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
}

/** One line on how the vote works / until when. */
export function CallVoteNote({ state }) {
  const { t } = useTranslation();
  if (!state) return null;
  const day = formatDay(state.closes_on);
  return (
    <p className="call-vote-note">
      {state.open
        ? (state.me.jury
          ? t('calls.vote.noteJury', { day, max: state.me.jury_max, defaultValue: 'Votación abierta hasta el {{day}}. Como super admin puedes votar hasta {{max}} obras; tus votos se cuentan aparte.' })
          : t('calls.vote.noteOpen', { day, defaultValue: 'Votación abierta hasta el {{day}}: cada persona con cuenta vota una obra y puede cambiar su voto hasta entonces.' }))
        : t('calls.vote.noteClosed', { day, defaultValue: 'La votación se cerró el {{day}}.' })}
    </p>
  );
}

/** «Ver resultados» + its modal. */
export function CallResultsButton({ callId, className = '' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`call-results-btn ${className}`} onClick={() => setOpen(true)}>
        <BarChart3 size={16} aria-hidden="true" />
        <span>{t('calls.results.open', 'Resultados de la votación')}</span>
      </button>
      {open && <CallResultsModal callId={callId} onClose={() => setOpen(false)} />}
    </>
  );
}

/** At the end of a work: which call it's in (a link to it), its vote and the results. */
export function CallVoteEnd({ voting, articleId }) {
  const { t } = useTranslation();
  const { fetchWorkshopById } = useWorkshop();
  const { navigateToWorkshopDetail, showError } = useUI();
  const state = voting.state;
  if (!state || !state.works.some((w) => w.id_article === articleId)) return null;

  const openCall = async () => {
    const r = await fetchWorkshopById(state.call.id_workshop);
    if (r?.success) navigateToWorkshopDetail();
    else if (r?.code === 'login_required') showError(t('calls.article.loginToOpen', 'Inicia sesión para ver la convocatoria'));
  };

  return (
    <aside className="call-vote-end" aria-label={t('calls.article.endLabel', 'Votación de la convocatoria')}>
      <p className="call-vote-end__lead">
        {t('calls.article.inCall', 'Esta obra participa en la convocatoria')}{' '}
        <button type="button" className="call-vote-end__link" onClick={openCall}>«{state.call.title_workshop}»</button>
      </p>
      <div className="call-vote-end__actions">
        <CallVoteButton voting={voting} articleId={articleId} />
        <CallResultsButton callId={state.call.id_workshop} />
      </div>
      <CallVoteNote state={state} />
    </aside>
  );
}

/** The call's page: its published works, each with its vote button. */
export function CallWorks({ call }) {
  const { t } = useTranslation();
  const voting = useCallVoting(call.id_workshop);
  const { fetchArticleById } = useMagazine();
  const { navigateToArticle } = useUI();
  const state = voting.state;
  if (!state) return null;

  const openWork = async (id) => {
    const r = await fetchArticleById(id);
    if (r?.success) navigateToArticle();
  };

  return (
    <section className="call-works" aria-labelledby="call-works-title">
      <header className="call-works__header">
        <h3 id="call-works-title"><Vote size={18} aria-hidden="true" /> {t('calls.works.title', { count: state.works.length, defaultValue: 'Obras publicadas ({{count}})' })}</h3>
        <CallResultsButton callId={call.id_workshop} />
      </header>
      <CallVoteNote state={state} />
      {state.works.length === 0 ? (
        <p className="call-works__empty">{t('calls.works.empty', 'Cuando se publiquen las obras aceptadas, aparecerán aquí para votarlas.')}</p>
      ) : (
        <ul className="call-works__list">
          {state.works.map((w) => (
            <li key={w.id_article} className="call-work">
              <button type="button" className="call-work__open" onClick={() => openWork(w.id_article)}>
                {w.cover_image_article
                  ? <img src={resolveCover(w.cover_image_article)} alt="" className="call-work__cover" loading="lazy" />
                  : <span className="call-work__cover call-work__cover--empty" aria-hidden="true"><Vote size={22} /></span>}
                <span className="call-work__text">
                  <strong className="call-work__title">{w.title_article}</strong>
                  {w.authors.length > 0 && <span className="call-work__authors">{w.authors.map((a) => a.name_user).join(', ')}</span>}
                </span>
              </button>
              <CallVoteButton voting={voting} articleId={w.id_article} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The results: the public's vote and the super admins', each in its own tab. */
export function CallResultsModal({ callId, onClose }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState('public');

  useEffect(() => {
    let alive = true;
    axiosInstance.get(`/magazine-workshop/calls/${callId}/results`, { headers: currentUser?.id_user ? { 'x-user-id': currentUser.id_user } : {} })
      .then((res) => { if (alive) setData(res.data.data); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [callId, currentUser?.id_user]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const list = data?.visible ? (tab === 'public' ? data.public : data.jury) : [];
  const top = Math.max(1, ...list.map((w) => w.votes));
  const voters = tab === 'public' ? data?.public_voters : data?.jury_voters;

  return createPortal(
    <div className="proposal-overlay" onClick={onClose}>
      <div className="proposal-modal call-results" role="dialog" aria-modal="true" aria-labelledby="call-results-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="proposal-modal__close" onClick={onClose} title={t('common.buttons.close', 'Cerrar')} aria-label={t('common.buttons.close', 'Cerrar')}>
          <X size={22} />
        </button>
        <h2 id="call-results-title">{t('calls.results.title', 'Resultados de la votación')}</h2>
        {data?.call && <p className="proposal-modal__lead">«{data.call.title_workshop}»</p>}

        {failed && <p className="call-results__empty">{t('calls.results.error', 'No se pudieron cargar los resultados')}</p>}
        {!data && !failed && <p className="call-results__empty">{t('common.states.loading', 'Cargando…')}</p>}

        {data && !data.visible && (
          <p className="call-results__hidden">
            {t('calls.results.hidden', { day: formatDay(data.results_on), defaultValue: 'Los resultados se publicarán el {{day}}, cuando se cierre la votación.' })}
          </p>
        )}

        {data?.visible && (
          <>
            {!data.resolved && (
              <p className="call-results__early">
                {t('calls.results.early', { day: formatDay(data.results_on), defaultValue: 'Votación en curso: solo los super admins ven estos resultados hasta el {{day}}.' })}
              </p>
            )}
            <div className="call-results__tabs" role="tablist" aria-label={t('calls.results.tabs', 'Votaciones')}>
              <button type="button" role="tab" aria-selected={tab === 'public'} className={tab === 'public' ? 'is-active' : ''} onClick={() => setTab('public')}>
                <Users size={16} aria-hidden="true" /> {t('calls.results.public', 'Votación del público')}
              </button>
              <button type="button" role="tab" aria-selected={tab === 'jury'} className={tab === 'jury' ? 'is-active' : ''} onClick={() => setTab('jury')}>
                <ShieldCheck size={16} aria-hidden="true" /> {t('calls.results.jury', 'Votos de los super admins')}
              </button>
            </div>
            <p className="call-results__voters">
              {tab === 'public'
                ? t('calls.results.publicVoters', { count: voters || 0, defaultValue: '{{count}} personas han votado (un voto cada una).' })
                : t('calls.results.juryVoters', { count: voters || 0, max: data.jury_max, defaultValue: '{{count}} super admins han votado (hasta {{max}} obras cada uno).' })}
            </p>
            {list.length === 0 ? (
              <p className="call-results__empty">{t('calls.results.noWorks', 'Todavía no hay obras publicadas.')}</p>
            ) : (
              <ol className="call-results__list" role="tabpanel">
                {list.map((w, i) => (
                  <li key={w.id_article} className="call-result">
                    <span className="call-result__rank">{i + 1}</span>
                    <span className="call-result__body">
                      <span className="call-result__head">
                        <strong>{w.title_article}</strong>
                        <span className="call-result__votes">{t('calls.results.votes', { count: w.votes, defaultValue: '{{count}} votos' })}</span>
                      </span>
                      {w.authors.length > 0 && <span className="call-result__authors">{w.authors.join(', ')}</span>}
                      <span className="call-result__bar" aria-hidden="true"><span style={{ width: `${(w.votes / top) * 100}%` }} /></span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
        <div className="proposal-modal__actions">
          <button type="button" className="proposal-modal__btn" onClick={onClose}>{t('common.buttons.close', 'Cerrar')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
