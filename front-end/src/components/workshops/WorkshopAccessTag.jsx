// magazine-front/src/components/workshops/WorkshopAccessTag.jsx
//
// Who can book a workshop: «Gratuito» (anyone signed in) or «Para socios/as»
// (`free_workshop`, set in the workshop editor). On the cards, the workshop
// page, «Mis talleres» and Admin › Talleres.
import { useTranslation } from 'react-i18next';
import { Gift, Lock } from 'lucide-react';
import './WorkshopAccessTag.css';

export const isFreeWorkshop = (w) => w?.free_workshop === true || w?.free_workshop === 1;

function WorkshopAccessTag({ workshop }) {
  const { t } = useTranslation();
  const free = isFreeWorkshop(workshop);
  return (
    <span className={`workshop-access workshop-access--${free ? 'free' : 'members'}`}>
      {free ? <Gift size={13} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}
      {free ? t('workshops.access.free', 'Gratuito') : t('workshops.access.members', 'Para socios/as')}
    </span>
  );
}

export default WorkshopAccessTag;
