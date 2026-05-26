// magazine-front/src/components/google-auth/GoogleSignIn.jsx
import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../../utils/axiosConfig.js';
import './GoogleSignIn.css';

export const GoogleSignIn = ({ onSuccess, onError, onNeedsLinking, onNeedsSelection, onNeedsTypeSelection, isRegisterMode = false }) => {
  const hiddenGoogleButtonRef = useRef(null);
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

          console.log('✅ Google Sign-In initialized');

          // Render Google's native button in hidden container
          if (hiddenGoogleButtonRef.current) {
            window.google.accounts.id.renderButton(hiddenGoogleButtonRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: isRegisterMode ? 'signup_with' : 'signin_with',
              locale: 'es'
            });
            console.log('✅ Hidden Google button rendered');

            // Add small delay before marking as initialized to ensure button is fully rendered
            setTimeout(() => {
              setIsInitialized(true);
              console.log('✅ Google Sign-In ready to use');
            }, 200);
          } else {
            setIsInitialized(true);
          }
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

    // Cleanup
    return () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleGoogleButtonClick = () => {
    if (!isInitialized) {
      console.log('Google Sign-In not initialized yet');
      return;
    }

    console.log('Triggering Google Sign-In...');

    try {
      // Try multiple methods to trigger Google Sign-In
      let triggered = false;

      // Method 1: Try to click the rendered button with multiple selectors
      if (hiddenGoogleButtonRef.current) {
        const selectors = [
          'div[role="button"]',
          'button',
          'div.nsm7Bb-HzV7m-LgbsSe',
          '[data-idom-class]',
          'iframe'
        ];

        for (const selector of selectors) {
          const element = hiddenGoogleButtonRef.current.querySelector(selector);
          if (element) {
            console.log('✓ Found Google button element with selector:', selector);
            if (element.tagName === 'IFRAME') {
              console.log('⚠️ Element is iframe, using prompt() instead');
              break;
            }
            element.click();
            triggered = true;
            break;
          }
        }
      }

      // Method 2: Use Google's prompt() API as primary fallback
      if (!triggered) {
        console.log('⚠️ Could not find clickable button element, using prompt() API');
        window.google.accounts.id.prompt((notification) => {
          console.log('Google prompt notification:', notification);
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            const reason = notification.getNotDisplayedReason() || notification.getSkippedReason();
            console.log('Prompt not displayed, reason:', reason);
          }
        });
        triggered = true;
      }

      if (!triggered) {
        console.error('❌ Could not trigger Google Sign-In by any method');
        onErrorRef.current?.('Error al iniciar Google Sign-In. Por favor, recarga la página e intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error triggering Google Sign-In:', error);
      onErrorRef.current?.('Error al abrir Google Sign-In. Por favor, intenta de nuevo.');
    }
  };

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
      {/* Hidden Google native button for triggering auth flow */}
      <div ref={hiddenGoogleButtonRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}></div>

      {/* Custom styled button */}
      <button
        onClick={handleGoogleButtonClick}
        disabled={!isInitialized || isLoading}
        className={`custom-google-button ${isLoading ? 'loading' : ''}`}
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
      </button>

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
