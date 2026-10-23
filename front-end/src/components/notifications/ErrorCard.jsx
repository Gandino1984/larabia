import { useEffect, useState } from 'react';
import { useUI } from '../../app_context/UIContext.jsx';
import './ErrorCard.css';
import CardCloseButton from './CardCloseButton.jsx';

// content: this card's own message (CardDisplay); otherwise the shared state.
const ErrorCard = ({ onClose, content }) => {
  const [latestError, setLatestError] = useState('');

  const { error: shared } = useUI();
  const error = content || shared;

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
        <div className="error-list">
          <div className="error-item">
            {latestError}
          </div>
        </div>
        <CardCloseButton onClose={onClose} />
      </div>
    )
  );
};

export default ErrorCard;
