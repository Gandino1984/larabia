import { useEffect, useState } from 'react';
import { useUI } from '../../app_context/UIContext.jsx';
import './SuccessCard.css';
import { Pause, Play } from 'lucide-react';

const SuccessCard = ({ isPaused = false, onTogglePause }) => {
  const [latestSuccess, setLatestSuccess] = useState('');

  const { success } = useUI();

  useEffect(() => {
    const successEntries = Object.entries(success).filter(([, value]) => value !== '');
    const hasSuccess = successEntries.length > 0;

    if (!hasSuccess) {
      setLatestSuccess('');
    } else {
      const mostRecentSuccess = successEntries[successEntries.length - 1][1];
      setLatestSuccess(mostRecentSuccess);
    }
  }, [success]);

  return (
    latestSuccess && (
      <div className="success-card-container">
        <button
          className={`success-pause-button ${isPaused ? 'paused' : ''}`}
          onClick={onTogglePause}
          onPointerDown={(e) => e.stopPropagation()}
          title={isPaused ? 'Reanudar y cerrar' : 'Pausar'}
          type="button"
        >
          {isPaused ? <Play size={28} /> : <Pause size={28} />}
        </button>
        <div className="success-list">
          <div className="success-item">
            {latestSuccess}
          </div>
        </div>
      </div>
    )
  );
};

export default SuccessCard;
