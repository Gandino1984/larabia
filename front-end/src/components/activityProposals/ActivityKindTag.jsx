// magazine-front/src/components/activityProposals/ActivityKindTag.jsx
// What a proposed activity is: «Taller» or «Convocatoria o concurso».
import { useTranslation } from 'react-i18next';
import { Users, Megaphone } from 'lucide-react';

/** «Taller» / «Convocatoria o concurso», as a small tag. */
function ActivityKindTag({ kind }) {
  const { t } = useTranslation();
  return (
    <span className={`activity-kind activity-kind--${kind}`}>
      {kind === 'call' ? <Megaphone size={13} aria-hidden="true" /> : <Users size={13} aria-hidden="true" />}
      {kind === 'call' ? t('activityProposals.kind.call', 'Convocatoria o concurso') : t('activityProposals.kind.workshop', 'Taller')}
    </span>
  );
}

export default ActivityKindTag;
