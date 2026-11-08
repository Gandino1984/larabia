// magazine-front/src/components/workshops/ContestInfo.jsx
//
// A contest's days (sign-ups, the jury's decision) and its awards, on its
// card and its page. The awards list the prize of each place and, once the
// jury has decided (or for its managers, who fill them in), who won it — the
// server sends the winners to nobody else before that day.
import { useTranslation } from 'react-i18next';
import { CalendarDays, Gavel, Trophy, Medal } from 'lucide-react';
import { formatDay, signupRange, awardList, awardLabel, contestPhase } from '../../utils/contests';

export function ContestDates({ workshop, as: Tag = 'p' }) {
  const { t } = useTranslation();
  const { from, to } = signupRange(workshop.registration_start_workshop, workshop.registration_end_workshop);
  const jury = formatDay(workshop.resolution_date_workshop);
  return (
    <>
      {(from || to) && (
        <Tag className="workshop-meta">
          <CalendarDays size={15} aria-hidden="true" />
          {t('contests.signups', { from, to, defaultValue: 'Inscripciones: del {{from}} al {{to}}' })}
        </Tag>
      )}
      {jury && (
        <Tag className="workshop-meta">
          <Gavel size={15} aria-hidden="true" />
          {t('contests.juryOn', { day: jury, defaultValue: 'Fallo del jurado: {{day}}' })}
        </Tag>
      )}
    </>
  );
}

// `showWinners`: list who won (from the jury's day on; or the managers).
// Without winners to show, the prizes — if there are any.
export function ContestAwards({ workshop, showWinners = contestPhase(workshop) === 'resolved', title = true }) {
  const { t } = useTranslation();
  const list = awardList(workshop);
  const winners = showWinners ? list.filter((a) => a.winner) : [];
  const shown = winners.length > 0 ? winners : list.filter((a) => a.prize);
  if (shown.length === 0) return null;
  const withWinners = winners.length > 0;
  return (
    <div className={`contest-awards ${withWinners ? 'contest-awards--winners' : ''}`}>
      {title && (
        <span className="contest-awards__title">
          {withWinners ? t('contests.winners', 'Ganadoras y ganadores') : t('contests.prizes', 'Premios')}
        </span>
      )}
      <ul>
        {shown.map(({ place, prize, winner }) => (
          <li key={place}>
            {place === 'mention' ? <Medal size={15} aria-hidden="true" /> : <Trophy size={15} aria-hidden="true" />}
            <strong>{awardLabel(place, t)}</strong>
            <span>
              {withWinners ? winner : prize}
              {/* With the winner, the prize under it. */}
              {withWinners && prize ? <span className="contest-awards__prize">{prize}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
