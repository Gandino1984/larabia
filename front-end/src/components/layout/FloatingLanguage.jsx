// magazine-front/src/components/layout/FloatingLanguage.jsx
//
// The site's language picker: a small pill outside the header bar, top left,
// so it's always at hand — also where the bar is hidden (an article: then it
// moves up to the top-left corner). Computers and tablets only: on phones it
// stays in the burger menu (Header). Just below the bar's left end, beside the
// bar on wide screens. Under it, for anyone signed in, «Reportar un error»: a
// pale red circle with the bug icon whose name unfolds on hover — to the left
// on wide screens (beside the bar: not over it) when it fits there, to the
// right otherwise (also in the menu, under «Sobre La Rabia»); the red
// «Hazte socio/a» button goes under them (<html data-report-pill>).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import './FloatingLanguage.css';

function FloatingLanguage({ ready = true, cornered = false }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { openReportModal } = useUI();
  const report = !!currentUser;
  useEffect(() => {
    const root = document.documentElement;
    if (report) root.setAttribute('data-report-pill', 'true');
    else root.removeAttribute('data-report-pill');
    return () => root.removeAttribute('data-report-pill');
  }, [report]);
  const label = t('report.title', 'Reportar un error');
  // Which way its name unfolds, decided as the pointer (or focus) arrives.
  const [unfold, setUnfold] = useState('right');
  const pickSide = (e) => {
    const button = e.currentTarget;
    const text = button.querySelector('.floating-report-btn__text');
    const besideBar = !cornered && window.matchMedia('(min-width: 1410px)').matches;
    const room = button.getBoundingClientRect().left;
    setUnfold(besideBar && room >= (text?.scrollWidth || 0) + 20 ? 'left' : 'right');
  };
  return (
    <div className={`floating-lang ${ready ? 'is-in' : ''} ${cornered ? 'floating-lang--corner' : ''}`}>
      <LanguageSelector />
      {report && (
        <button
          type="button"
          className="floating-report-btn"
          data-unfold={unfold}
          onClick={openReportModal}
          onMouseEnter={pickSide}
          onFocus={pickSide}
          title={label}
          aria-label={label}
        >
          <Bug size={17} aria-hidden="true" />
          <span className="floating-report-btn__text" aria-hidden="true">{label}</span>
        </button>
      )}
    </div>
  );
}

export default FloatingLanguage;
