// magazine-front/src/components/layout/ForgotPasswordPage.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUI } from '../../app_context/UIContext';
import axiosInstance from '../../utils/axiosConfig';
import './LoginPage.css';

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { navigateToLogin, showSuccess, showError } = useUI();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      showError(t('auth.forgot.emailRequired', 'Por favor, ingresa tu email'));
      return;
    }

    setLoading(true);

    try {
      const result = await axiosInstance.post('/user/request-password-reset', {
        email
      });

      if (result.data.error) {
        showError(result.data.error);
      } else {
        showSuccess(t('auth.forgot.sent', 'Se ha enviado un email con instrucciones para restablecer tu contraseña. Por favor, revisa tu bandeja de entrada.'));
        // Navigate to login after 3 seconds
        setTimeout(() => {
          navigateToLogin();
        }, 3000);
      }
    } catch (err) {
      console.error('Password reset request error:', err);
      const errorMessage = err.response?.data?.error ||
                          err.response?.data?.details ||
                          t('auth.forgot.error', 'Error al solicitar restablecimiento de contraseña');
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h2>{t('auth.forgot.title', '¿Olvidaste tu contraseña?')}</h2>
          <p>{t('auth.forgot.subtitle', 'Ingresa tu email y te enviaremos instrucciones')}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">{t('common.labels.email', 'Email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.forgot.emailPlaceholder', 'tu@email.com')}
              disabled={loading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? t('admin.newsletter.sending', 'Enviando...') : t('auth.forgot.send', 'Enviar instrucciones')}
          </button>
        </form>

        <div className="login-footer">
          <button
            className="back-link"
            onClick={navigateToLogin}
            disabled={loading}
          >
            ← Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
