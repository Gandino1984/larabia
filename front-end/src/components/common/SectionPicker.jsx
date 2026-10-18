// magazine-front/src/components/common/SectionPicker.jsx
//
// Pick the magazine sections (header buttons) a publication also appears in:
// one toggle per section of the catalogue (utils/sections.js). Sections the
// value holds that are no longer in the menu are still shown, so they can be
// taken out.
import { Check } from 'lucide-react';
import { sameKey } from '../../utils/sections';
import './SectionPicker.css';

function SectionPicker({ catalog, value = [], onChange, disabled = false, idPrefix = 'section' }) {
  const extra = value
    .filter((key) => !catalog.some((s) => sameKey(s.key, key)))
    .map((key) => ({ key, label: key, path: [] }));
  const options = [...catalog, ...extra];

  const toggle = (key) => {
    const on = value.some((k) => sameKey(k, key));
    onChange(on ? value.filter((k) => !sameKey(k, key)) : [...value, key]);
  };

  return (
    <div className="section-picker" role="group">
      {options.map(({ key, label, path }) => {
        const on = value.some((k) => sameKey(k, key));
        return (
          <button
            key={key}
            id={`${idPrefix}-${key}`}
            type="button"
            className={`section-chip${on ? ' is-on' : ''}`}
            aria-pressed={on}
            disabled={disabled}
            onClick={() => toggle(key)}
            title={path.length ? [...path, label].join(' › ') : label}
          >
            {on && <Check size={14} aria-hidden="true" />}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SectionPicker;
