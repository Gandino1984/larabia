// magazine-front/src/components/layout/FloatingLanguage.jsx
//
// The site's language picker, outside the header bar so it's always at hand —
// also where the bar is hidden (an article: then it moves up to the top-right
// corner). Computers and tablets only: on phones it stays in the burger menu
// (Header). It takes the place the «Publica» button had (now inside the bar):
// just below the bar's right end, and beside the bar on wide screens.
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
