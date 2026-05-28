import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../app_context/ThemeContext';
import { useUI } from '../../../app_context/UIContext';
import {
  THEME_PRESETS,
  COLOR_PICKER_TOKENS,
  TOKEN_LABELS,
  resolveTokens,
  resolveLandingColor
} from '../../../app_context/themePresets';
import './AdminAppearanceTab.css';

const SPEED_OPTIONS = [
  { value: 'slow', label: 'Lenta' },
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Rápida' }
];

function AdminAppearanceTab() {
  const { theme, loaded, updateTheme, applyTheme } = useTheme();
  const { showSuccess, showError } = useUI();

  const [preset, setPreset] = useState('default');
  const [colors, setColors] = useState(THEME_PRESETS.default.tokens);
  const [landingColor, setLandingColor] = useState(THEME_PRESETS.default.landing_bg);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState('normal');
  const [respectReducedMotion, setRespectReducedMotion] = useState(true);
  const [saving, setSaving] = useState(false);

  // Keep the persisted theme so we can restore it if the admin leaves without saving.
  const savedThemeRef = useRef(theme);

  // Seed the form when the theme loads / refreshes.
  useEffect(() => {
    if (!loaded) return;
    savedThemeRef.current = theme;
    setPreset(theme.preset || 'default');
    setColors(resolveTokens(theme));
    setLandingColor(resolveLandingColor(theme));
    setAnimationsEnabled(theme.animations_enabled !== false && theme.animations_enabled !== 0);
    setAnimationSpeed(theme.animation_speed || 'normal');
    setRespectReducedMotion(theme.respect_reduced_motion !== false && theme.respect_reduced_motion !== 0);
  }, [loaded, theme]);

  // Build the draft theme object the rest of the app understands.
  const draft = {
    preset,
    tokens: colors,
    landing_bg_type: 'color',
    landing_bg_value: landingColor,
    animations_enabled: animationsEnabled,
    animation_speed: animationSpeed,
    respect_reduced_motion: respectReducedMotion
  };

  // Live preview: apply the draft to the whole app as the admin edits.
  useEffect(() => {
    applyTheme(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, colors, landingColor, animationsEnabled, animationSpeed, respectReducedMotion]);

  // On unmount, restore the last *saved* theme so an unsaved preview doesn't stick.
  useEffect(() => {
    return () => applyTheme(savedThemeRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreset = (key) => {
    setPreset(key);
    setColors(THEME_PRESETS[key].tokens);
    setLandingColor(THEME_PRESETS[key].landing_bg);
  };

  const handleColor = (token, value) => {
    setColors((prev) => ({ ...prev, [token]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await updateTheme(draft);
    setSaving(false);
    if (result.error) showError(result.error);
    else showSuccess(result.success);
  };

  const handleResetDefault = () => handlePreset('default');

  return (
    <section className="admin-appearance">
      <p className="admin-appearance__hint">
        Cambia el aspecto de la revista para todo el mundo. Los cambios se previsualizan
        en vivo; pulsa <strong>Guardar</strong> para aplicarlos de forma permanente.
        «Por defecto» restaura el diseño original.
      </p>

      {/* Preset selector */}
      <div className="admin-appearance__section">
        <h3>Tema</h3>
        <div className="admin-appearance__presets">
          {Object.entries(THEME_PRESETS).map(([key, p]) => (
            <button
              key={key}
              type="button"
              className={`admin-appearance__preset ${preset === key ? 'is-active' : ''}`}
              onClick={() => handlePreset(key)}
            >
              <span className="admin-appearance__preset-swatches">
                <span style={{ background: p.tokens['--color-bg'] }} />
                <span style={{ background: p.tokens['--color-surface'] }} />
                <span style={{ background: p.tokens['--color-accent'] }} />
                <span style={{ background: p.tokens['--color-text'] }} />
              </span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color pickers */}
      <div className="admin-appearance__section">
        <h3>Colores</h3>
        <div className="admin-appearance__colors">
          {COLOR_PICKER_TOKENS.map((token) => (
            <label key={token} className="admin-appearance__color">
              <input
                type="color"
                value={colors[token] || '#000000'}
                onChange={(e) => handleColor(token, e.target.value)}
              />
              <span>{TOKEN_LABELS[token] || token}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Landing background */}
      <div className="admin-appearance__section">
        <h3>Fondo de portada</h3>
        <label className="admin-appearance__color">
          <input
            type="color"
            value={landingColor || '#252525'}
            onChange={(e) => setLandingColor(e.target.value)}
          />
          <span>Color de fondo de la portada</span>
        </label>
      </div>

      {/* Animation controls */}
      <div className="admin-appearance__section">
        <h3>Animaciones</h3>
        <label className="admin-appearance__toggle">
          <input
            type="checkbox"
            checked={animationsEnabled}
            onChange={(e) => setAnimationsEnabled(e.target.checked)}
          />
          <span>Activar animaciones</span>
        </label>
        <label className="admin-appearance__field">
          <span>Velocidad</span>
          <select
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(e.target.value)}
            disabled={!animationsEnabled}
          >
            {SPEED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="admin-appearance__toggle">
          <input
            type="checkbox"
            checked={respectReducedMotion}
            onChange={(e) => setRespectReducedMotion(e.target.checked)}
          />
          <span>Respetar «reducir movimiento» del sistema del visitante</span>
        </label>
      </div>

      <div className="admin-appearance__actions">
        <button type="button" className="admin-appearance__reset" onClick={handleResetDefault}>
          Restaurar por defecto
        </button>
        <button type="button" className="admin-appearance__save" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </section>
  );
}

export default AdminAppearanceTab;
