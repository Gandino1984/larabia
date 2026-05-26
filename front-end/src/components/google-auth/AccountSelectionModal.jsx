// magazine-front/src/components/google-auth/AccountSelectionModal.jsx
import { useState } from 'react';
import axiosInstance from '../../utils/axiosConfig.js';
import { X, CheckCircle2 } from 'lucide-react';
import './GoogleLinkingModal.css';

export const AccountSelectionModal = ({
  googleUser,
  linkedAccounts,
  accounts,
  onSuccess,
  onCancel
}) => {
  const accountsList = accounts || linkedAccounts || [];

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectAccount = async () => {
    console.log('=== SELECT ACCOUNT START ===');

    if (!selectedAccount) {
      setError('Por favor selecciona una cuenta');
      return;
    }

    setIsLoading(true);
    setError('');

    console.log('Selecting account:', {
      userId: selectedAccount.id_user,
      accountName: selectedAccount.name_user,
      googleId: googleUser.sub
    });

    try {
      const result = await axiosInstance.post('/user/select-google-account', {
        userId: selectedAccount.id_user,
        googleId: googleUser.sub
      });

      console.log('Selection result:', result.data);

      if (result.data.error) {
        setError(result.data.error);
      } else if (result.data.data) {
        console.log('✅ Account selected successfully');
        onSuccess(result.data.data, result.data.message);
      } else {
        setError('Respuesta inesperada del servidor');
      }
    } catch (err) {
      console.error('Selection error:', err);
      const errorMessage = err.response?.data?.error ||
                          err.response?.data?.details ||
                          'Error al seleccionar cuenta';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onCancel}>
          <X size={24} />
        </button>

        <h2>Selecciona tu cuenta</h2>

        <div className="modal-info">
          <p>
            Tienes <strong>{accountsList.length} cuentas</strong> con este correo.
          </p>
          <p>¿Con cuál deseas iniciar sesión?</p>
        </div>

        <div className="accounts-list">
          {accountsList.map(account => (
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
                <div className="checkmark">
                  <CheckCircle2 size={20} />
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        <div className="modal-actions">
          <button
            onClick={handleSelectAccount}
            disabled={isLoading || !selectedAccount}
            className="link-button"
          >
            {isLoading ? 'Entrando...' : 'Continuar'}
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

export default AccountSelectionModal;
