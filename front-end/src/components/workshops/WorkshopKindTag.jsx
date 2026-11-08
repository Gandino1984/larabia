// magazine-front/src/components/workshops/WorkshopKindTag.jsx
//
// What it is — «Taller», «Taller infantil» or «Concurso» — on the cards, the
// page, «Mis talleres y concursos» and Admin › Talleres; and, for a contest
// its managers see before it's published, its review: «En revisión» or
// «Devuelto». Same pill as WorkshopAccessTag (labels, they keep their case).
import { useTranslation } from 'react-i18next';
import { Users, Baby, Trophy, Hourglass, Undo2 } from 'lucide-react';
import { isContest, reviewStateOf } from '../../utils/contests';
import './WorkshopAccessTag.css';

function WorkshopKindTag({ workshop }) {
  const { t } = useTranslation();
  if (isContest(workshop)) {
    return (
      <span className="workshop-access workshop-kind--contest">
        <Trophy size={13} aria-hidden="true" />
        {t('contests.kind', 'Concurso')}
      </span>
    );
  }
  const kids = workshop?.audience_workshop === 'infantil';
  return (
    <span className="workshop-access workshop-kind--workshop">
      {kids ? <Baby size={13} aria-hidden="true" /> : <Users size={13} aria-hidden="true" />}
      {kids ? t('workshops.form.audienceKids', 'Taller infantil') : t('workshops.form.audienceGeneral', 'Taller')}
    </span>
  );
}

export function WorkshopReviewTag({ workshop }) {
  const { t } = useTranslation();
  const state = reviewStateOf(workshop);
  if (state === 'approved') return null;
  return (
    <span className={`workshop-access workshop-review--${state}`}>
      {state === 'rejected' ? <Undo2 size={13} aria-hidden="true" /> : <Hourglass size={13} aria-hidden="true" />}
      {state === 'rejected' ? t('contests.review.rejected', 'Devuelto') : t('contests.review.pending', 'En revisión')}
    </span>
  );
}

export default WorkshopKindTag;
