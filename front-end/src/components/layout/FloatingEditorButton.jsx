// magazine-front/src/components/layout/FloatingEditorButton.jsx
import { Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import './FloatingEditorButton.css';

function FloatingEditorButton() {
  const { t } = useTranslation();
  const { isEditor } = useAuth();
  const { navigateToEditor, showEditor, showArticleDetail } = useUI();

  // Don't render at all if user is not an editor
  if (!isEditor) {
    return null;
  }

  // Apply hidden class if in editor or viewing an article
  const isHidden = showEditor || showArticleDetail;

  return (
    <button
      className={`floating-editor-btn ${isHidden ? 'hidden' : ''}`}
      onClick={navigateToEditor}
      title={t('header.user.createArticle')}
      aria-label={t('header.user.createArticle')}
    >
      <Edit size={24} />
      <span className="floating-btn-text">{t('common.buttons.publish')}</span>
    </button>
  );
}

export default FloatingEditorButton;
