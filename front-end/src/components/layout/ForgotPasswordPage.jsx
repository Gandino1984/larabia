// magazine-front/src/components/layout/ForgotPasswordPage.jsx
import { useState } from 'react';
import { useUI } from '../../app_context/UIContext';
import axiosInstance from '../../utils/axiosConfig';
import './LoginPage.css';

function ForgotPasswordPage() {
  const { navigateToLogin, showSuccess, showError } = useUI();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      showError('Por favor, ingresa tu email');
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
        showSuccess(
          'Se ha enviado un email con instrucciones para restablecer tu contraseña. ' +
          'Por favor, revisa tu bandeja de entrada.'
        );
        // Navigate to login after 3 seconds
        setTimeout(() => {
          navigateToLogin();
        }, 3000);
      }
    } catch (err) {
      console.error('Password reset request error:', err);
      const errorMessage = err.response?.data?.error ||
                          err.response?.data?.details ||
                          'Error al solicitar restablecimiento de contraseña';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h2>¿Olvidaste tu contraseña?</h2>
          <p>Ingresa tu email y te enviaremos instrucciones</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar instrucciones'}
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
