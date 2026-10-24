// magazine-front/src/components/layout/FloatingLanguage.jsx
//
// The site's language picker: a small pill outside the header bar, top left,
// so it's always at hand — also where the bar is hidden (an article: then it
// moves up to the top-left corner). Computers and tablets only: on phones it
// stays in the burger menu (Header). Just below the bar's left end, beside the
// bar on wide screens; the red «Hazte socio/a» button goes under it.
import LanguageSelector from './LanguageSelector';
import './FloatingLanguage.css';

function FloatingLanguage({ ready = true, cornered = false }) {
  return (
    <div className={`floating-lang ${ready ? 'is-in' : ''} ${cornered ? 'floating-lang--corner' : ''}`}>
      <LanguageSelector />
    </div>
  );
}

export default FloatingLanguage;
