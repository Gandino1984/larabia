// magazine-front/src/components/newsletter/NewsletterModal.jsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Bell, BellOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import axiosInstance from '../../utils/axiosConfig';
import './NewsletterModal.css';

const NewsletterModal = ({ onClose }) => {
  const { t } = useTranslation();
  const { currentUser, setCurrentUser } = useAuth();
  const { navigateToLogin } = useUI();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');

  const isSubscribed = !!currentUser?.receives_newsletter;

  const handleToggle = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setStatus(null);

    try {
      const response = await axiosInstance.post('/user/toggle-newsletter', {
        id_user: currentUser.id_user
      });

      if (!response.data.error) {
        const newValue = response.data.data.receives_newsletter;
        const updatedUser = { ...currentUser, receives_newsletter: newValue };
        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setStatus('success');
        setStatusMessage(
          newValue ? t('newsletter.successSubscribe') : t('newsletter.successUnsubscribe')
        );
      } else {
        setStatus('error');
        setStatusMessage(t('newsletter.error'));
      }
    } catch {
      setStatus('error');
      setStatusMessage(t('newsletter.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginClick = () => {
    onClose();
    navigateToLogin();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="newsletter-modal-overlay" onClick={handleOverlayClick}>
      <div className="newsletter-modal-container">
        <div className="newsletter-modal-header">
          <h2 className="newsletter-modal-title">{t('newsletter.title')}</h2>
          <button
            className="newsletter-close-button"
            onClick={onClose}
            aria-label={t('common.buttons.close')}
            type="button"
          >
            <X size={22} />
          </button>
        </div>

        <div className="newsletter-modal-body">
          <p className="newsletter-description">{t('newsletter.description')}</p>

          {!currentUser ? (
            <div className="newsletter-login-prompt">
              <Bell size={36} className="newsletter-bell-icon" />
              <p>{t('newsletter.loginRequired')}</p>
              <button className="newsletter-login-btn" onClick={handleLoginClick}>
                {t('newsletter.loginBtn')}
              </button>
            </div>
          ) : (
            <div className="newsletter-subscription">
              <div className={`newsletter-status-indicator ${isSubscribed ? 'subscribed' : 'unsubscribed'}`}>
                {isSubscribed
                  ? <Bell size={28} />
                  : <BellOff size={28} />
                }
                <span>
                  {isSubscribed
                    ? t('newsletter.subscribedStatus')
                    : t('newsletter.unsubscribedStatus')
                  }
                </span>
              </div>

              {status === 'success' && (
                <div className="newsletter-feedback success">
                  <CheckCircle size={18} />
                  <span>{statusMessage}</span>
                </div>
              )}
              {status === 'error' && (
                <div className="newsletter-feedback error">
                  <AlertCircle size={18} />
                  <span>{statusMessage}</span>
                </div>
              )}

              <button
                className={`newsletter-toggle-btn ${isSubscribed ? 'unsubscribe' : 'subscribe'}`}
                onClick={handleToggle}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="newsletter-spinner" />
                ) : isSubscribed ? (
                  t('newsletter.unsubscribeBtn')
                ) : (
                  t('newsletter.subscribeBtn')
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NewsletterModal;
