// magazine-front/src/components/layout/FloatingEditorButton.jsx
import { useState, useEffect, useRef } from 'react';
import { Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import './FloatingEditorButton.css';

// Play the slide-in only once per session (after the header entrance); on later
// renders the button is simply there.
let slideInPlayed = false;

function FloatingEditorButton({ ready = true }) {
  const { t } = useTranslation();
  const { canCreateContent } = useAuth();
  const { navigateToEditor, showEditor, showArticleDetail } = useUI();
  // Slide the button in from the right, shortly after the header has appeared.
  const [isIn, setIsIn] = useState(slideInPlayed);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!ready || slideInPlayed) return;
    timerRef.current = setTimeout(() => {
      slideInPlayed = true;
      setIsIn(true);
    }, 850);
    return () => clearTimeout(timerRef.current);
  }, [ready]);

  // Don't render at all if the user can't create content (reader / premium reader)
  if (!canCreateContent) {
    return null;
  }

  // Apply hidden class if in editor or viewing an article
  const isHidden = showEditor || showArticleDetail;

  return (
    <button
      className={`floating-editor-btn ${isIn ? 'is-in' : ''} ${isHidden ? 'hidden' : ''}`}
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
