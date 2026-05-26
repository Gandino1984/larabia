// magazine-front/src/components/google-auth/TypeSelectionModal.jsx
import { useState, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig.js';
import { X, User, AlertCircle } from 'lucide-react';
import './GoogleLinkingModal.css';

export const TypeSelectionModal = ({
  googleUser,
  existingTypes = [],
  onSuccess,
  onCancel
}) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Magazine only supports 'user' type
  const selectedType = 'user';

  // Check if account already exists
  useEffect(() => {
    if (existingTypes && existingTypes.length > 0) {
      console.log('⚠️ Account already exists with types:', existingTypes);
      setError('Este email ya tiene una cuenta registrada. Por favor, usa la opción de inicio de sesión.');

      // Auto-close after 3 seconds and redirect to login
      setTimeout(() => {
        onCancel();
      }, 3000);
    }
  }, [existingTypes, onCancel]);

  const handleCompleteRegistration = async () => {
    // Don't allow registration if account already exists
    if (existingTypes && existingTypes.length > 0) {
      setError('No se puede crear una cuenta nueva. Este email ya está registrado.');
      return;
    }

    console.log('=== COMPLETE GOOGLE REGISTRATION START ===');

    setIsLoading(true);
    setError('');

    console.log('Completing registration with type:', selectedType);
    console.log('Google user:', googleUser);

    try {
      const result = await axiosInstance.post('/user/complete-google-registration', {
        googleId: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        typeUser: selectedType
      });

      console.log('Registration result:', result.data);

      if (result.data.error) {
        setError(result.data.error);
      } else if (result.data.data) {
        console.log('✅ Google registration completed successfully');
        onSuccess(result.data.data, result.data.message);
      } else {
        setError('Respuesta inesperada del servidor');
      }
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.error ||
                          err.response?.data?.details ||
                          'Error al completar el registro con Google';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // If account already exists, show error message only
  if (existingTypes && existingTypes.length > 0) {
    return (
      <div className="modal-overlay" onClick={onCancel}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="close-button" onClick={onCancel}>
            <X size={24} />
          </button>

          <h2>Cuenta ya existe</h2>

          <div className="modal-info">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <AlertCircle size={48} style={{ color: '#f57c00' }} />
            </div>
            <p>
              El email <strong>{googleUser.email}</strong> ya tiene una cuenta registrada.
            </p>
            <p style={{ marginTop: '1rem' }}>
              Por favor, usa el botón de <strong>"Iniciar Sesión con Google"</strong> en lugar de registrarte.
            </p>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="modal-actions">
            <button
              className="link-button"
              onClick={onCancel}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  // New user - show registration form
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onCancel}>
          <X size={24} />
        </button>

        <h2>Bienvenido a La Rabia</h2>

        <div className="modal-info">
          <p>
            Hola <strong>{googleUser.name}</strong>
          </p>
          <p>Estás a punto de crear tu cuenta de lector en La Rabia.</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            Como lector, podrás acceder a todos los artículos de la revista digital del barrio de Uribarri.
          </p>
        </div>

        <div className="accounts-list">
          <div className="account-item selected">
            <div className="account-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <User size={24} style={{ color: 'var(--magazine-primary, #d32f2f)' }} />
                <div>
                  <div className="account-name">Lector</div>
                  <div className="account-type">Acceso completo a todos los artículos</div>
                </div>
              </div>
            </div>
            <span className="checkmark">✓</span>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="modal-actions">
          <button
            className="link-button"
            onClick={handleCompleteRegistration}
            disabled={isLoading}
          >
            {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
          <button
            className="cancel-button"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TypeSelectionModal;
