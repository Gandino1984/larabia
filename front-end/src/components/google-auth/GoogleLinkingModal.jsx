// magazine-front/src/components/google-auth/GoogleLinkingModal.jsx
import { useState } from 'react';
import axiosInstance from '../../utils/axiosConfig.js';
import { X } from 'lucide-react';
import './GoogleLinkingModal.css';

export const GoogleLinkingModal = ({
  googleUser,
  existingAccounts,
  onSuccess,
  onCancel
}) => {
  const [password, setPassword] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLink = async () => {
    console.log('=== HANDLE LINK START ===');

    if (!selectedAccount) {
      setError('Por favor selecciona una cuenta');
      return;
    }

    if (!password) {
      setError('Por favor ingresa tu contraseña');
      return;
    }

    if (password.length !== 4 || !/^\d+$/.test(password)) {
      setError('La contraseña debe tener exactamente 4 dígitos');
      return;
    }

    setIsLoading(true);
    setError('');

    console.log('Linking account:', {
      userId: selectedAccount.id_user,
      accountName: selectedAccount.name_user,
      googleId: googleUser.sub
    });

    try {
      const result = await axiosInstance.post('/user/link-google', {
        userId: selectedAccount.id_user,
        googleId: googleUser.sub,
        password: password
      });

      console.log('Link result:', result.data);

      if (result.data.error) {
        setError(result.data.error);
      } else if (result.data.data) {
        console.log('✅ Account linked successfully');
        onSuccess(result.data.data, result.data.message);
      } else {
        setError('Respuesta inesperada del servidor');
      }
    } catch (err) {
      console.error('Link error:', err);
      const errorMessage = err.response?.data?.error ||
                          err.response?.data?.details ||
                          'Error al vincular cuenta';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    // Only allow digits and max 4 characters
    if (/^\d{0,4}$/.test(value)) {
      setPassword(value);
      setError('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && password.length === 4 && selectedAccount) {
      handleLink();
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onCancel}>
          <X size={24} />
        </button>

        <h2>🔗 Vincular cuenta de Google</h2>

        <div className="modal-info">
          <p>
            El email <strong>{googleUser.email}</strong> ya está registrado en el sistema.
          </p>
          <p>
            Al vincular tu cuenta de Google, podrás iniciar sesión de dos formas:
          </p>
          <ul className="benefits-list">
            <li>✅ Con Google (sin contraseña)</li>
            <li>✅ Con tu usuario y contraseña de 4 dígitos</li>
          </ul>
          <p><strong>Selecciona la cuenta que deseas vincular:</strong></p>
        </div>

        <div className="accounts-list">
          {existingAccounts.map(account => (
            <div
              key={account.id_user}
              className={`account-item ${
                selectedAccount?.id_user === account.id_user ? 'selected' : ''
              }`}
              onClick={() => {
                setSelectedAccount(account);
                setError('');
              }}
            >
              <div className="account-info">
                <strong>{account.name_user}</strong>
                <span className="account-type">
                  {account.type_user === 'user' ? 'Usuario' :
                   account.type_user === 'seller' ? 'Vendedor' :
                   account.type_user === 'rider' ? 'Repartidor' :
                   account.type_user}
                </span>
              </div>
              {selectedAccount?.id_user === account.id_user && (
                <div className="checkmark">✓</div>
              )}
            </div>
          ))}
        </div>

        {selectedAccount && (
          <div className="password-section">
            <label htmlFor="password">Ingresa tu contraseña de 4 dígitos:</label>
            <input
              id="password"
              type="password"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              value={password}
              onChange={handlePasswordChange}
              onKeyPress={handleKeyPress}
              placeholder="••••"
              autoComplete="current-password"
              disabled={isLoading}
            />
            <p className="hint">
              Esta es la contraseña que usas para iniciar sesión en {selectedAccount.name_user}
            </p>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <div className="modal-actions">
          <button
            onClick={handleLink}
            disabled={isLoading || !selectedAccount || password.length !== 4}
            className="link-button"
          >
            {isLoading ? 'Vinculando...' : 'Vincular cuenta'}
          </button>
          <button
            onClick={onCancel}
            className="cancel-button"
            disabled={isLoading}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleLinkingModal;
