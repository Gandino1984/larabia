// magazine-front/src/components/google-auth/GoogleSignIn.jsx
import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../../utils/axiosConfig.js';
import './GoogleSignIn.css';

export const GoogleSignIn = ({ onSuccess, onError, onNeedsLinking, onNeedsSelection, onNeedsTypeSelection, isRegisterMode = false }) => {
  // stackRef = the positioned wrapper we measure to size Google's button.
  // googleButtonRef = where Google renders its REAL button, overlaid transparently
  // on top of our custom-looking button so a genuine user tap hits Google directly.
  // (A synthetic .click() forwarded to a hidden button never opens the popup on
  // mobile — the button is a cross-origin iframe — and prompt()/One Tap is
  // unreliable there, which is why the old approach did nothing on phones.)
  const stackRef = useRef(null);
  const googleButtonRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use refs to avoid re-initializing when callbacks change
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onNeedsLinkingRef = useRef(onNeedsLinking);
  const onNeedsSelectionRef = useRef(onNeedsSelection);
  const onNeedsTypeSelectionRef = useRef(onNeedsTypeSelection);

  // Update refs when props change
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onNeedsLinkingRef.current = onNeedsLinking;
    onNeedsSelectionRef.current = onNeedsSelection;
    onNeedsTypeSelectionRef.current = onNeedsTypeSelection;
  });

  useEffect(() => {
    // Render (or re-render) Google's native button sized to our wrapper so the
    // transparent overlay lines up with the visible custom button.
    const renderGoogleButton = () => {
      if (!googleButtonRef.current) return;
      const measured = stackRef.current?.offsetWidth || 320;
      // Google caps renderButton width at 400px.
      const width = Math.min(400, Math.max(200, Math.floor(measured)));
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: isRegisterMode ? 'signup_with' : 'signin_with',
        locale: 'es',
        width
      });
    };

    // Wait for Google library to load
    const initializeGoogleSignIn = () => {
      if (window.google && window.google.accounts) {
        console.log('✅ Google Identity Services loaded');

        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

        if (!clientId) {
          console.error('❌ VITE_GOOGLE_CLIENT_ID is not set in environment');
          onErrorRef.current?.('Configuración de Google Sign-In no encontrada');
          return;
        }

        console.log('Initializing Google Sign-In with Client ID:', clientId.substring(0, 20) + '...');

        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: isRegisterMode ? 'signup' : 'signin'
          });

          renderGoogleButton();
          setIsInitialized(true);
          console.log('✅ Google Sign-In ready to use');
        } catch (error) {
          console.error('Error initializing Google Sign-In:', error);
          onErrorRef.current?.('Error al inicializar Google Sign-In');
        }
      } else {
        // Google library not loaded yet, retry
        setTimeout(initializeGoogleSignIn, 100);
      }
    };

    initializeGoogleSignIn();

    // Keep the overlaid Google button matched to the wrapper width on resize /
    // orientation change so the tap target stays aligned.
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.google && window.google.accounts) renderGoogleButton();
      }, 200);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
      if (window.google && window.google.accounts) {
        window.google.accounts.id.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleCredentialResponse = async (response) => {
    console.log('=== GOOGLE SIGN-IN RESPONSE ===');
    console.log('Credential received:', response.credential ? 'Yes' : 'No');
    console.log('Register mode:', isRegisterMode);

    setIsLoading(true);

    try {
      const result = await axiosInstance.post('/user/google-auth', {
        idToken: response.credential,
        isRegisterMode: isRegisterMode,
        selectedType: 'user' // Magazine only supports user type
      });

      console.log('Backend response:', result.data);

      if (result.data.needsSelection) {
        console.log('📋 Multiple accounts linked - selection needed');
        onNeedsSelectionRef.current?.(result.data);
      } else if (result.data.needsLinking) {
        console.log('📧 Account linking needed');
        onNeedsLinkingRef.current?.(result.data);
      } else if (result.data.needsTypeSelection) {
        console.log('👤 New user - type selection needed');
        onNeedsTypeSelectionRef.current?.(result.data);
      } else if (result.data.data) {
        console.log('✅ Google auth successful');
        onSuccessRef.current?.(result.data.data, result.data.message);
      } else {
        console.error('Unexpected response format:', result.data);
        onErrorRef.current?.('Respuesta inesperada del servidor');
      }
    } catch (error) {
      console.error('Google auth error:', error);

      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.details ||
                          'Error al autenticar con Google';

      console.error('Error message:', errorMessage);
      onErrorRef.current?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="google-signin-container">
      <div className="google-button-stack" ref={stackRef}>
        {/* Visible custom button — purely decorative. The real (transparent)
            Google button sits on top and receives the actual tap/click. */}
        <div
          className={`custom-google-button ${(!isInitialized || isLoading) ? 'disabled' : ''} ${isLoading ? 'loading' : ''}`}
          aria-hidden="true"
        >
          <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="button-text">
            ENTRAR CON GOOGLE
          </span>
        </div>

        {/* Real Google button rendered here, overlaid transparently on top. */}
        <div
          ref={googleButtonRef}
          className={`google-button-overlay ${isLoading ? 'disabled' : ''}`}
        ></div>
      </div>

      {isLoading && (
        <div className="loading-text">
          Autenticando con Google...
        </div>
      )}

      {!isInitialized && !isLoading && (
        <div className="loading-text">
          Cargando Google Sign-In...
        </div>
      )}
    </div>
  );
};

export default GoogleSignIn;
