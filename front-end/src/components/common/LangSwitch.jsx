// magazine-front/src/components/common/LangSwitch.jsx
//
// ES · EN · EU segmented switch (utils/contentLang.js). The creator uses it to
// choose the language being written (`filled` marks the ones with text); the
// article reader, to choose the language it's read in (`available`: the others
// are disabled).
import { useTranslation } from 'react-i18next';
import { CONTENT_LANGS, LANG_NAMES } from '../../utils/contentLang';
import './LangSwitch.css';

function LangSwitch({ value, onChange, label, available = CONTENT_LANGS, filled = [], className = '' }) {
  const { t } = useTranslation();
  return (
    <div className={`lang-switch ${className}`} role="group" aria-label={label}>
      {CONTENT_LANGS.map((lang) => {
        const enabled = available.includes(lang);
        return (
          <button
            key={lang}
            type="button"
            className={`lang-switch__btn ${value === lang ? 'is-active' : ''}`}
            aria-pressed={value === lang}
            disabled={!enabled}
            onClick={() => onChange(lang)}
            title={enabled
              ? LANG_NAMES[lang]
              : t('contentLang.unavailable', { lang: LANG_NAMES[lang], defaultValue: 'Sin versión en {{lang}}' })}
            lang={lang}
          >
            {lang.toUpperCase()}
            {filled.includes(lang) && <span className="lang-switch__dot" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

export default LangSwitch;
