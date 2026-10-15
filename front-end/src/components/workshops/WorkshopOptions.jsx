// magazine-front/src/components/workshops/WorkshopOptions.jsx
//
// The ⋯ options of a workshop, like the articles': share for everyone (a
// ?workshop=<id> link, see App.jsx); edit and delete for its managers
// (canManageWorkshop). Used on the workshop cards and the workshop page.
// Clicks never reach what's around it (the card opens the workshop).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import { useWorkshop } from '../../app_context/WorkshopContext';
import { canManageWorkshop } from '../../app_context/useWorkshopAccess';
import OptionsReveal from '../magazine/OptionsReveal';
import CreateWorkshopModal from './CreateWorkshopModal';

function WorkshopOptions({ workshop, align = 'start', className = '', onSaved, onDeleted }) {
  const { t } = useTranslation();
  const { currentUser, isSuperAdmin, isAdmin } = useAuth();
  const { showSuccess } = useUI();
  const { deleteWorkshop } = useWorkshop();
  const [editing, setEditing] = useState(false);

  const canManage = canManageWorkshop(workshop, currentUser, { isSuperAdmin, isAdmin });

  const handleShare = async () => {
    const url = `${window.location.origin}/?workshop=${workshop.id_workshop}`;
    try {
      await navigator.clipboard.writeText(url);
      showSuccess(t('hero.linkCopied', '¡Enlace copiado!'));
    } catch {
      // No clipboard access (old browser, permissions): let them copy it.
      window.prompt(t('workshops.shareCopy', 'Copia el enlace del taller:'), url);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('workshops.confirmDelete', '¿Eliminar este taller? Se borrarán también sus reservas. Esta acción no se puede deshacer.'))) return;
    const res = await deleteWorkshop(workshop.id_workshop);
    if (!res?.error) onDeleted?.();
  };

  const actions = [
    {
      key: 'share',
      onClick: handleShare,
      title: t('workshops.share', 'Compartir el taller'),
      label: t('engagement.label.share', 'Compartir'),
      icon: <Share2 size={18} />,
    },
  ];
  if (canManage) {
    actions.push(
      {
        key: 'edit',
        onClick: () => setEditing(true),
        title: t('workshops.edit', 'Editar taller'),
        label: t('engagement.label.edit', 'Editar'),
        icon: <Edit size={18} />,
      },
      {
        key: 'delete',
        className: 'engagement-btn--danger',
        onClick: handleDelete,
        title: t('workshops.delete', 'Eliminar taller'),
        label: t('engagement.label.delete', 'Eliminar'),
        icon: <Trash2 size={18} />,
      },
    );
  }

  return (
    <div className="workshop-options" onClick={(e) => e.stopPropagation()}>
      <OptionsReveal actions={actions} align={align} className={className} />
      {editing && (
        <CreateWorkshopModal
          workshop={workshop}
          onClose={() => setEditing(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

export default WorkshopOptions;
