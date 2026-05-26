// magazine-front/src/components/layout/LoginPage.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../app_context/AuthContext';
import { useUI } from '../../app_context/UIContext';
import GoogleSignIn from '../google-auth/GoogleSignIn';
import GoogleLinkingModal from '../google-auth/GoogleLinkingModal';
import AccountSelectionModal from '../google-auth/AccountSelectionModal';
import axiosInstance from '../../utils/axiosConfig';
import './LoginPage.css';

function LoginPage() {
  const { t } = useTranslation();
  const { setUser } = useAuth();
  const { navigateToHome, showSuccess, showError } = useUI();

  // Google OAuth states
  const [showLinkingModal, setShowLinkingModal] = useState(false);
  const [linkingData, setLinkingData] = useState(null);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectionData, setSelectionData] = useState(null);

  const handleGoogleSuccess = async (userData, message) => {
    setUser(userData);

    if (message && message.includes('creada exitosamente')) {
      showSuccess(t('messages.success.accountCreated', { name: userData.name_user }));
    } else if (message && message.includes('vinculada')) {
      showSuccess(t('messages.success.accountLinked'));
    } else {
      showSuccess(t('messages.success.accountWelcomeBack', { name: userData.name_user }));
    }

    navigateToHome();
  };

  const handleGoogleError = (error) => {
    showError(error);
  };

  const handleNeedsLinking = (data) => {
    setLinkingData(data);
    setShowLinkingModal(true);
  };

  const handleNeedsSelection = (data) => {
    setSelectionData(data);
    setShowSelectionModal(true);
  };

  const handleNeedsTypeSelection = async (data) => {
    if (data.existingTypes && data.existingTypes.length > 0) {
      showError(t('auth.login.accountExists', { types: data.existingTypes.join(', ') }));
      return;
    }

    try {
      const result = await axiosInstance.post('/user/complete-google-registration', {
        googleId: data.googleUser.sub,
        email: data.googleUser.email,
        name: data.googleUser.name,
        picture: data.googleUser.picture,
        typeUser: 'user'
      });

      if (result.data.error) {
        showError(result.data.error);
      } else if (result.data.data) {
        handleGoogleSuccess(result.data.data, result.data.message);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error ||
                          err.response?.data?.details ||
                          t('auth.login.createAccountError');
      showError(errorMessage);
    }
  };

  const handleLinkingSuccess = async (userData, message) => {
    setShowLinkingModal(false);
    setLinkingData(null);
    await handleGoogleSuccess(userData, message);
  };

  const handleLinkingCancel = () => {
    setShowLinkingModal(false);
    setLinkingData(null);
  };

  const handleSelectionSuccess = async (userData, message) => {
    setShowSelectionModal(false);
    setSelectionData(null);
    await handleGoogleSuccess(userData, message);
  };

  const handleSelectionCancel = () => {
    setShowSelectionModal(false);
    setSelectionData(null);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h2>{t('auth.login.accessTitle')}</h2>
          <p>{t('auth.login.subtitle')}</p>
        </div>

        <div className="google-auth-section">
          <GoogleSignIn
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            onNeedsLinking={handleNeedsLinking}
            onNeedsSelection={handleNeedsSelection}
            onNeedsTypeSelection={handleNeedsTypeSelection}
            isRegisterMode={false}
          />
        </div>

        <div className="login-footer">
          <button className="back-link" onClick={navigateToHome}>
            {t('common.buttons.backToHome')}
          </button>
        </div>
      </div>

      {showLinkingModal && linkingData && (
        <GoogleLinkingModal
          googleUser={linkingData.googleUser}
          existingAccounts={linkingData.existingAccounts}
          onSuccess={handleLinkingSuccess}
          onCancel={handleLinkingCancel}
        />
      )}

      {showSelectionModal && selectionData && (
        <AccountSelectionModal
          googleUser={selectionData.googleUser}
          accounts={selectionData.accounts}
          linkedAccounts={selectionData.linkedAccounts}
          onSuccess={handleSelectionSuccess}
          onCancel={handleSelectionCancel}
        />
      )}
    </div>
  );
}

export default LoginPage;
