import { useEffect, useState } from 'react';
import { useUI } from '../../app_context/UIContext.jsx';
import './ErrorCard.css';
import { Pause, Play } from 'lucide-react';

const ErrorCard = ({ isPaused = false, onTogglePause }) => {
  const [latestError, setLatestError] = useState('');

  const { error } = useUI();

  useEffect(() => {
    const errorEntries = Object.entries(error).filter(([, value]) => value !== '');
    const hasErrors = errorEntries.length > 0;

    if (!hasErrors) {
      setLatestError('');
    } else {
      const errorPriority = [
        'userError',
        'articleError',
        'imageError',
        'databaseResponseError',
      ];

      let selectedError = '';
      for (const errorKey of errorPriority) {
        const foundError = errorEntries.find(([key]) => key === errorKey);
        if (foundError && foundError[1]) {
          selectedError = foundError[1];
          break;
        }
      }

      if (!selectedError && errorEntries.length > 0) {
        selectedError = errorEntries[errorEntries.length - 1][1];
      }

      setLatestError(selectedError);
    }
  }, [error]);

  return (
    latestError && (
      <div className="error-card-container">
        <button
          className={`error-pause-button ${isPaused ? 'paused' : ''}`}
          onClick={onTogglePause}
          onPointerDown={(e) => e.stopPropagation()}
          title={isPaused ? 'Reanudar y cerrar' : 'Pausar'}
          type="button"
        >
          {isPaused ? <Play size={28} /> : <Pause size={28} />}
        </button>
        <div className="error-list">
          <div className="error-item">
            {latestError}
          </div>
        </div>
      </div>
    )
  );
};

export default ErrorCard;
