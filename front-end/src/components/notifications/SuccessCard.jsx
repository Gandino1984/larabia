import { useEffect, useState } from 'react';
import { useUI } from '../../app_context/UIContext.jsx';
import './SuccessCard.css';
import CardCloseButton from './CardCloseButton.jsx';

const SuccessCard = ({ onClose }) => {
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
        <div className="success-list">
          <div className="success-item">
            {latestSuccess}
          </div>
        </div>
        <CardCloseButton onClose={onClose} />
      </div>
    )
  );
};

export default SuccessCard;
