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

  // code (from the server): what happened — the message comes translated.
  const handleGoogleSuccess = async (userData, message, code) => {
    setUser(userData);

    if (code === 'account_created') {
      // New accounts get the recommendations (the newsletter) — say so.
      showSuccess(t('messages.success.accountCreatedNewsletter', { name: userData.name_user }));
    } else if (code === 'account_linked' || code === 'already_linked') {
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
        handleGoogleSuccess(result.data.data, result.data.message, result.data.code);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error ||
                          err.response?.data?.details ||
                          t('auth.login.createAccountError');
      showError(errorMessage);
    }
  };

  const handleLinkingSuccess = async (userData, message, code) => {
    setShowLinkingModal(false);
    setLinkingData(null);
    await handleGoogleSuccess(userData, message, code);
  };

  const handleLinkingCancel = () => {
    setShowLinkingModal(false);
    setLinkingData(null);
  };

  const handleSelectionSuccess = async (userData, message, code) => {
    setShowSelectionModal(false);
    setSelectionData(null);
    await handleGoogleSuccess(userData, message, code);
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
          {/* New accounts get the recommendations by email (the server); one
              click in any of them, or «Recomendaciones», stops them. */}
          <p className="login-newsletter-note">
            {t('auth.login.newsletterNote', 'Si aún no tienes cuenta, al crearla te apuntamos a las recomendaciones de la revista por correo. Puedes darte de baja cuando quieras, con un clic desde cualquier correo.')}
          </p>
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
