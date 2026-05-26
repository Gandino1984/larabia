import { useEffect, useState } from 'react';
import { useUI } from '../../app_context/UIContext.jsx';
import './InfoCard.css';
import { Pause, Play, Volume2, Link as LinkIcon } from 'lucide-react';

const InfoCard = ({ isPaused = false, onTogglePause }) => {
  const [latestInfo, setLatestInfo] = useState('');

  const { info, infoIconType } = useUI();

  useEffect(() => {
    const infoEntries = Object.entries(info).filter(([, value]) => value !== '');
    const hasInfo = infoEntries.length > 0;

    if (!hasInfo) {
      setLatestInfo('');
    } else {
      const mostRecentInfo = infoEntries[infoEntries.length - 1][1];
      setLatestInfo(mostRecentInfo);
    }
  }, [info]);

  // Determine which icon to display
  const renderIcon = () => {
    if (infoIconType === 'audio') {
      return <Volume2 size={20} />;
    } else if (infoIconType === 'link') {
      return <LinkIcon size={20} />;
    } else {
      // Default to pause/play for non-interactive notifications
      return isPaused ? <Play size={28} /> : <Pause size={28} />;
    }
  };

  // For interactive panel notifications, show static icon; otherwise show pause/play button
  const isInteractiveNotification = infoIconType === 'audio' || infoIconType === 'link';

  return (
    latestInfo && (
      <div className="info-card-container">
        {isInteractiveNotification ? (
          <div className="info-icon-display">
            {renderIcon()}
          </div>
        ) : (
          <button
            className={`info-pause-button ${isPaused ? 'paused' : ''}`}
            onClick={onTogglePause}
            onPointerDown={(e) => e.stopPropagation()}
            title={isPaused ? 'Reanudar y cerrar' : 'Pausar'}
            type="button"
          >
            {renderIcon()}
          </button>
        )}
        <div className="info-list">
          <div className="info-item">
            {latestInfo}
          </div>
        </div>
      </div>
    )
  );
};

export default InfoCard;
