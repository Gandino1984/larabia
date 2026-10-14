// magazine-front/src/components/common/LoadFailBoundary.jsx
//
// Error boundary for the parts of the page that load on demand (the paisaje
// sonoro editor and player). If the code can't be fetched — typically a page
// opened before a deploy asking for files of the previous version — or it
// crashes while rendering, only that part shows a notice with "Recargar
// página" instead of the whole page going blank. In the editor the rest keeps
// working, so the author can save before reloading (`hint`).
//
//   <LoadFailBoundary hint="…">  notice (title + explanation + hint + button)
//   <LoadFailBoundary compact>   just the reload button (inside a comic panel)
import { Component } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';
import './LoadFailBoundary.css';

const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|Loading (CSS )?chunk|Unable to preload CSS|error loading dynamically/i;

export const isChunkLoadError = (error) => CHUNK_ERROR.test(error?.message || String(error || ''));

function LoadFailNotice({ error, hint, compact, children }) {
  const { t } = useTranslation();
  const reload = () => window.location.reload();
  const button = (
    <button type="button" className="load-fail__btn" onClick={reload}>
      <RotateCw size={16} aria-hidden="true" />
      {t('loadFail.reload', 'Recargar página')}
    </button>
  );

  if (compact) {
    return (
      <div className="load-fail load-fail--compact" role="alert">
        {children}
        {button}
      </div>
    );
  }
  return (
    <div className="load-fail" role="alert">
      <p className="load-fail__title">{t('loadFail.title', 'No se pudo cargar esta parte')}</p>
      <p className="load-fail__text">
        {isChunkLoadError(error)
          ? t('loadFail.updated', 'La revista se ha actualizado mientras tenías la página abierta. Recárgala para continuar.')
          : t('loadFail.generic', 'Algo ha fallado al mostrarla. Recarga la página para intentarlo de nuevo.')}
      </p>
      {hint && <p className="load-fail__text">{hint}</p>}
      {button}
    </div>
  );
}

class LoadFailBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('LoadFailBoundary:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <LoadFailNotice error={error} hint={this.props.hint} compact={this.props.compact}>
        {this.props.fallback}
      </LoadFailNotice>
    );
  }
}

export default LoadFailBoundary;
