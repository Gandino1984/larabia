// magazine-front/src/components/google-auth/AccountSelectionModal.jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const accountsList = accounts || linkedAccounts || [];

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectAccount = async () => {
    console.log('=== SELECT ACCOUNT START ===');

    if (!selectedAccount) {
      setError(t('auth.linking.pickAccount', 'Por favor selecciona una cuenta'));
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
        onSuccess(result.data.data, result.data.message, result.data.code);
      } else {
        setError(t('auth.unexpectedResponse', 'Respuesta inesperada del servidor'));
      }
    } catch (err) {
      console.error('Selection error:', err);
      const errorMessage = err.response?.data?.error ||
                          err.response?.data?.details ||
                          t('auth.select.error', 'Error al seleccionar cuenta');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onCancel} aria-label={t('common.buttons.close', 'Cerrar')}>
          <X size={24} />
        </button>

        <h2>{t('auth.select.title', 'Selecciona tu cuenta')}</h2>

        <div className="modal-info">
          <p>
            {t('auth.select.count', { count: accountsList.length })}
          </p>
          <p>{t('auth.select.which', '¿Con cuál deseas iniciar sesión?')}</p>
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
                <span className="account-type">{t('auth.account', 'Cuenta')}</span>
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
            {isLoading ? t('auth.select.entering', 'Entrando...') : t('auth.select.continue', 'Continuar')}
          </button>
          <button
            onClick={onCancel}
            className="cancel-button"
            disabled={isLoading}
          >
            {t('common.buttons.cancel', 'Cancelar')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSelectionModal;
