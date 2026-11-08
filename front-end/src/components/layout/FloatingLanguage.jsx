// magazine-front/src/components/layout/FloatingLanguage.jsx
//
// The site's language picker: a small pill outside the header bar, top left,
// so it's always at hand — also where the bar is hidden (an article: then it
// moves up to the top-left corner). Computers and tablets only: on phones it
// stays in the burger menu (Header). Just below the bar's left end, beside the
// bar on wide screens. Under it, for anyone signed in, the same pill for
// «Reportar un error» (also in the menu, under «Sobre La Rabia»); the red
// «Hazte socio/a» button goes under them (<html data-report-pill>).
import { useEffect } from 'react';
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
  return (
    <div className={`floating-lang ${ready ? 'is-in' : ''} ${cornered ? 'floating-lang--corner' : ''}`}>
      <LanguageSelector />
      {report && (
        <button type="button" className="floating-report-btn" onClick={openReportModal} title={label} aria-label={label}>
          <Bug size={15} aria-hidden="true" />
          <span className="floating-report-btn__text">{label}</span>
        </button>
      )}
    </div>
  );
}

export default FloatingLanguage;
