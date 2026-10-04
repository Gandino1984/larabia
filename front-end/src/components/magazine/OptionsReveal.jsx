// magazine-front/src/components/magazine/OptionsReveal.jsx
//
// A single "⋯" options button that, when clicked, reveals a row of actions
// sliding out one after another as if they had been stacked behind it. The
// actions collapse back 10s after opening (the countdown pauses while the
// pointer is over them and restarts after each use), on an outside click, or
// on Escape. Used by the article cards (ArticleEngagementBar) and the project
// header. `align="end"` anchors it on the right, revealing leftward.
//
// Styles (.engagement-options*, .engagement-btn) live in ArticleCard.css.
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';

const AUTO_CLOSE_MS = 10000;

// actions: [{ key, icon, label, title, onClick, className?, pressed? }]
function OptionsReveal({ actions, align = 'start', className = '' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const optionsRef = useRef(null);

  const closeTimer = useRef(null);
  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);
  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), AUTO_CLOSE_MS);
  }, [clearCloseTimer]);
  useEffect(() => {
    if (open) scheduleClose();
    else clearCloseTimer();
    return clearCloseTimer;
  }, [open, scheduleClose, clearCloseTimer]);

  // Collapse the options when clicking anywhere else or pressing Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const stop = (fn) => (e) => { e.stopPropagation(); fn(e); };

  if (!actions.length) return null;

  return (
    <div
      ref={optionsRef}
      className={`engagement-options ${align === 'end' ? 'engagement-options--end' : ''} ${open ? 'is-open' : ''} ${className}`}
      onMouseEnter={() => { if (open) clearCloseTimer(); }}
      onMouseLeave={() => { if (open) scheduleClose(); }}
    >
      <button
        type="button"
        className="engagement-btn engagement-options-toggle"
        onClick={stop(() => setOpen(true))}
        title={t('engagement.options', 'Opciones')}
        aria-label={t('engagement.options', 'Opciones')}
        aria-expanded={open}
        tabIndex={open ? -1 : 0}
      >
        <MoreHorizontal size={18} />
        {/* Hidden by default; contexts may reveal it on hover (article reader). */}
        <span className="engagement-btn-label">{t('engagement.options', 'Opciones')}</span>
      </button>
      <div className="engagement-options-items">
        {actions.map((a, i) => (
          <button
            key={a.key}
            type="button"
            className={`engagement-btn ${a.className || ''}`}
            style={{ '--i': i }}
            onClick={stop((e) => { a.onClick(e); if (open) scheduleClose(); })}
            title={a.title}
            aria-pressed={a.pressed}
            tabIndex={open ? 0 : -1}
          >
            {a.icon}
            <span className="engagement-btn-label">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default OptionsReveal;
