import { useEffect, useState } from 'react';
import { useUI } from '../../app_context/UIContext.jsx';
import './InfoCard.css';
import { Volume2, Link as LinkIcon } from 'lucide-react';
import CardCloseButton from './CardCloseButton.jsx';

const InfoCard = ({ onClose }) => {
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

  // Interactive panel notifications show what the panel does (audio / link).
  const typeIcon = infoIconType === 'audio' ? <Volume2 size={20} />
    : infoIconType === 'link' ? <LinkIcon size={20} />
    : null;

  return (
    latestInfo && (
      <div className="info-card-container">
        {typeIcon && (
          <div className="info-icon-display">
            {typeIcon}
          </div>
        )}
        <div className="info-list">
          <div className="info-item">
            {latestInfo}
          </div>
        </div>
        <CardCloseButton onClose={onClose} />
      </div>
    )
  );
};

export default InfoCard;
