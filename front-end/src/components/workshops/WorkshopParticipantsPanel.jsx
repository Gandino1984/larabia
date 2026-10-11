// magazine-front/src/components/workshops/WorkshopParticipantsPanel.jsx
//
// The workshop's participants, for its managers only (super admins, or an
// admin who created or teaches it — the server sends the lists to nobody
// else): remove someone, include someone (search by name), block someone for
// this workshop (they lose their place and can't book it again) and unblock.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, UserMinus, Ban, LockOpen, Search } from 'lucide-react';
import { useAuth } from '../../app_context/AuthContext';
import { useWorkshop } from '../../app_context/WorkshopContext';
import SubscriberMark from '../common/SubscriberMark';
import { getAuthorImageUrl } from '../common/AuthorChip';

// Photo (or initial) + name.
function Person({ person, you }) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const url = getAuthorImageUrl(person);
  return (
    <span className="workshop-person">
      <SubscriberMark userId={person.id_user}>
        {url && !imgError
          ? <img src={url} alt="" className="workshop-person__avatar" onError={() => setImgError(true)} />
          : <span className="workshop-person__avatar workshop-person__avatar--fallback" aria-hidden="true">
              {(person.name_user || '?').charAt(0).toUpperCase()}
            </span>}
      </SubscriberMark>
      <span className="workshop-person__name">
        {person.name_user}
        {you && <span className="workshop-person__you"> {t('workshops.manage.you', '(tú)')}</span>}
      </span>
    </span>
  );
}

function WorkshopParticipantsPanel({ workshop }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { searchWorkshopUsers, manageWorkshopParticipant } = useWorkshop();
  const id = workshop.id_workshop;
  const participants = workshop.participants || [];
  const blocked = workshop.blocked_users || [];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const me = currentUser?.id_user;
  const term = query.trim();

  // Search as the manager types (a short pause first).
  useEffect(() => {
    if (term.length < 2) { setResults(null); setSearching(false); return undefined; }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const found = await searchWorkshopUsers(id, term);
      if (cancelled) return;
      setResults(found);
      setSearching(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [term, id, searchWorkshopUsers]);

  const run = async (action, person) => {
    if (action === 'remove' && !confirm(t('workshops.manage.confirmRemove', { name: person.name_user }))) return;
    if (action === 'block' && !confirm(t('workshops.manage.confirmBlock', { name: person.name_user }))) return;
    setBusyId(person.id_user);
    const res = await manageWorkshopParticipant(id, action, person.id_user);
    setBusyId(null);
    // Keep the search results' marks in step.
    if (res.success && results) {
      setResults(prev => prev?.map(u => (u.id_user !== person.id_user ? u : {
        ...u,
        is_participant: action === 'add' ? true : (action === 'remove' || action === 'block') ? false : u.is_participant,
        is_blocked: action === 'block' ? true : action === 'unblock' ? false : u.is_blocked
      })));
    }
  };

  const btn = (action, person, { icon: Icon, label, danger = false, disabled = false, title }) => (
    <button
      type="button"
      className={`workshop-people-btn${danger ? ' workshop-people-btn--danger' : ''}`}
      onClick={() => run(action, person)}
      disabled={disabled || busyId === person.id_user}
      title={title || label}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  );

  return (
    <section className="workshop-people" aria-labelledby="workshop-people-title">
      <header className="workshop-people__header">
        <h3 id="workshop-people-title">
          <Users size={18} /> {t('workshops.manage.title', 'Participantes')} ({participants.length})
        </h3>
        <p className="workshop-people__hint">{t('workshops.manage.subtitle', 'Solo lo ven quienes gestionan el taller.')}</p>
      </header>

      {participants.length === 0 ? (
        <p className="workshop-people__empty">{t('workshops.manage.empty', 'Todavía no se ha apuntado nadie.')}</p>
      ) : (
        <ul className="workshop-people__list">
          {participants.map(p => (
            <li key={p.id_user} className="workshop-people__row">
              <Person person={p} you={p.id_user === me} />
              <div className="workshop-people__actions">
                {btn('remove', p, { icon: UserMinus, label: t('workshops.manage.remove', 'Quitar') })}
                {p.id_user !== me && btn('block', p, { icon: Ban, label: t('workshops.manage.block', 'Bloquear'), danger: true })}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Include someone (or block them before they book). */}
      <div className="workshop-people__add">
        <label className="workshop-people__label" htmlFor="workshop-people-search">
          {t('workshops.manage.addTitle', 'Incluir a alguien')}
        </label>
        <div className="workshop-people__search">
          <Search size={16} aria-hidden="true" />
          <input
            id="workshop-people-search"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('workshops.manage.searchPlaceholder', 'Busca por nombre…')}
            autoComplete="off"
          />
        </div>
        {workshop.is_full && (
          <p className="workshop-people__note">{t('workshops.manage.full', 'Taller completo: amplía el aforo para incluir a más personas.')}</p>
        )}
        {term.length > 0 && term.length < 2 && (
          <p className="workshop-people__note">{t('workshops.manage.searchHint', 'Escribe al menos 2 letras.')}</p>
        )}
        {searching && <p className="workshop-people__note">…</p>}
        {!searching && results && results.length === 0 && (
          <p className="workshop-people__note">{t('workshops.manage.noResults', 'No hay nadie con ese nombre.')}</p>
        )}
        {!searching && results && results.length > 0 && (
          <ul className="workshop-people__list workshop-people__list--results">
            {results.map(u => (
              <li key={u.id_user} className="workshop-people__row">
                <Person person={u} you={u.id_user === me} />
                <div className="workshop-people__actions">
                  {u.is_blocked ? (
                    <>
                      <span className="workshop-people__tag workshop-people__tag--blocked">{t('workshops.manage.isBlocked', 'Bloqueada/o')}</span>
                      {btn('unblock', u, { icon: LockOpen, label: t('workshops.manage.unblock', 'Desbloquear') })}
                    </>
                  ) : u.is_participant ? (
                    <span className="workshop-people__tag">{t('workshops.manage.isParticipant', 'Ya participa')}</span>
                  ) : (
                    btn('add', u, {
                      icon: UserPlus,
                      label: t('workshops.manage.include', 'Incluir'),
                      disabled: workshop.is_full,
                      title: workshop.is_full ? t('workshops.manage.full', 'Taller completo: amplía el aforo para incluir a más personas.') : undefined
                    })
                  )}
                  {!u.is_blocked && u.id_user !== me && btn('block', u, { icon: Ban, label: t('workshops.manage.block', 'Bloquear'), danger: true })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {blocked.length > 0 && (
        <div className="workshop-people__blocked">
          <h4>
            <Ban size={16} /> {t('workshops.manage.blockedTitle', 'Bloqueadas/os')} ({blocked.length})
          </h4>
          <p className="workshop-people__hint">{t('workshops.manage.blockedHint', 'No pueden reservar plaza en este taller.')}</p>
          <ul className="workshop-people__list">
            {blocked.map(b => (
              <li key={b.id_user} className="workshop-people__row">
                <Person person={b} />
                <div className="workshop-people__actions">
                  {btn('unblock', b, { icon: LockOpen, label: t('workshops.manage.unblock', 'Desbloquear') })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default WorkshopParticipantsPanel;
