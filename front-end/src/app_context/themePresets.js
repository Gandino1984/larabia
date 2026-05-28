// magazine-front/src/app_context/themePresets.js
//
// Built-in theme presets. Each preset is a full set of color tokens (the same
// keys defined in index.css :root) plus a landing background color.
//
// "default" MUST exactly match the :root defaults in index.css so selecting it
// reproduces the original design. A super admin's custom color picks are stored
// separately as overrides and merged on top of the active preset.

export const TOKEN_KEYS = [
  '--color-bg',
  '--color-surface',
  '--color-surface-alt',
  '--color-surface-3',
  '--color-text',
  '--color-text-muted',
  '--color-accent',
  '--color-accent-2',
  '--color-danger',
  '--color-border',
  '--surface-light',
  '--surface-light-2',
  '--light-border',
  '--on-light',
  '--on-light-muted',
  '--color-header-bg',
  '--color-header-text',
  '--color-header-bg-active',
  '--color-header-text-active'
];

// Human labels for the admin color pickers (Spanish UI).
export const TOKEN_LABELS = {
  '--color-bg': 'Fondo general',
  '--color-surface': 'Tarjetas / paneles',
  '--color-surface-alt': 'Superficie oscura',
  '--color-surface-3': 'Bordes / campos',
  '--color-text': 'Texto principal',
  '--color-text-muted': 'Texto secundario',
  '--color-accent': 'Color de acento',
  '--color-accent-2': 'Acento secundario',
  '--color-danger': 'Acciones destructivas',
  '--color-border': 'Borde sutil',
  '--surface-light': 'Páginas claras: fondo',
  '--surface-light-2': 'Páginas claras: superficie',
  '--light-border': 'Páginas claras: borde',
  '--on-light': 'Páginas claras: texto',
  '--on-light-muted': 'Páginas claras: texto tenue',
  '--color-header-bg': 'Barra: fondo',
  '--color-header-text': 'Barra: texto',
  '--color-header-bg-active': 'Barra (hover): fondo',
  '--color-header-text-active': 'Barra (hover): texto'
};

export const THEME_PRESETS = {
  default: {
    label: 'Por defecto',
    tokens: {
      '--color-bg': '#252525',
      '--color-surface': '#2a2a2a',
      '--color-surface-alt': '#1a1a1a',
      '--color-surface-3': '#3a3a3a',
      '--color-text': '#e0e0e0',
      '--color-text-muted': '#999999',
      '--color-accent': '#667eea',
      '--color-accent-2': '#764ba2',
      '--color-danger': '#dc2626',
      '--color-border': 'rgba(255,255,255,0.12)',
      '--surface-light': '#ffffff',
      '--surface-light-2': '#f5f5f5',
      '--light-border': '#e0e0e0',
      '--on-light': '#1a1a1a',
      '--on-light-muted': '#666666',
      '--color-header-bg': '#000000',
      '--color-header-text': '#ffffff',
      '--color-header-bg-active': '#ffffff',
      '--color-header-text-active': '#000000'
    },
    landing_bg: '#252525'
  },
  light: {
    label: 'Claro',
    tokens: {
      '--color-bg': '#f4f4f5',
      '--color-surface': '#ffffff',
      '--color-surface-alt': '#e8e8ea',
      '--color-surface-3': '#d6d6d9',
      '--color-text': '#1a1a1a',
      '--color-text-muted': '#555555',
      '--color-accent': '#4a5568',
      '--color-accent-2': '#667eea',
      '--color-danger': '#dc2626',
      '--color-border': 'rgba(0,0,0,0.12)',
      '--surface-light': '#ffffff',
      '--surface-light-2': '#f0f0f2',
      '--light-border': '#d6d6d9',
      '--on-light': '#1a1a1a',
      '--on-light-muted': '#555555',
      '--color-header-bg': '#000000',
      '--color-header-text': '#ffffff',
      '--color-header-bg-active': '#ffffff',
      '--color-header-text-active': '#000000'
    },
    landing_bg: '#ececee'
  },
  'high-contrast': {
    label: 'Alto contraste',
    tokens: {
      '--color-bg': '#000000',
      '--color-surface': '#0b0b0b',
      '--color-surface-alt': '#000000',
      '--color-surface-3': '#2a2a2a',
      '--color-text': '#ffffff',
      '--color-text-muted': '#d0d0d0',
      '--color-accent': '#ffd400',
      '--color-accent-2': '#00e5ff',
      '--color-danger': '#ff453a',
      '--color-border': 'rgba(255,255,255,0.5)',
      '--surface-light': '#ffffff',
      '--surface-light-2': '#ededed',
      '--light-border': '#000000',
      '--on-light': '#000000',
      '--on-light-muted': '#333333',
      '--color-header-bg': '#000000',
      '--color-header-text': '#ffffff',
      '--color-header-bg-active': '#ffffff',
      '--color-header-text-active': '#000000'
    },
    landing_bg: '#000000'
  }
};

export const ANIMATION_SPEED_SCALE = {
  slow: 1.6,
  normal: 1,
  fast: 0.6
};

// Tokens that are plain hex and therefore safe to show in an <input type=color>.
// --color-border is rgba (has alpha) so it's preset-managed only.
export const COLOR_PICKER_TOKENS = TOKEN_KEYS.filter((k) => k !== '--color-border');

/**
 * Resolve the effective token map for a stored theme: start from the preset's
 * tokens, then apply any custom overrides on top.
 */
export function resolveTokens(theme) {
  const preset = THEME_PRESETS[theme?.preset] || THEME_PRESETS.default;
  const overrides = (theme && typeof theme.tokens === 'object' && theme.tokens) || {};
  return { ...preset.tokens, ...overrides };
}

/** Resolve the landing background color (custom value > preset default). */
export function resolveLandingColor(theme) {
  if (theme?.landing_bg_type === 'color' && theme.landing_bg_value) {
    return theme.landing_bg_value;
  }
  const preset = THEME_PRESETS[theme?.preset] || THEME_PRESETS.default;
  return preset.landing_bg;
}
