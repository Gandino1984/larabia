// front-end/src/components/layout/LoadingScreen.jsx
import { useEffect, useState } from 'react';
import { useMetadata } from '../../app_context/MetadataContext';
import './LoadingScreen.css';

/**
 * Reads the magazine name + light logo from MetadataContext so a custom logo
 * uploaded by the super admin shows on the splash. Falls back to LaRabia
 * defaults via MetadataContext.DEFAULTS — animations are unchanged.
 */
function LoadingScreenLogo() {
  const { metadata, resolveLogoUrl } = useMetadata();
  const src = resolveLogoUrl(metadata.logo_light) || '/LogoLaRabiaWhite.png';
  return <img src={src} alt={metadata.name || 'La Rabia'} className="logo-image" />;
}

function LoadingScreen({ isLoading, progress, onLoadingComplete }) {
  const [showSlogan, setShowSlogan] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  // Show slogan after logo fades in
  useEffect(() => {
    const sloganTimer = setTimeout(() => {
      setShowSlogan(true);
    }, 1200);

    return () => clearTimeout(sloganTimer);
  }, []);

  // Handle loading completion
  useEffect(() => {
    console.log('LoadingScreen effect - isLoading:', isLoading, 'fadeOut:', fadeOut);
    if (!isLoading && !fadeOut) {
      console.log('LoadingScreen: Starting fade out animation');
      // Start fade out animation
      setFadeOut(true);

      // Complete loading after fade out animation
      const completeTimer = setTimeout(() => {
        console.log('LoadingScreen: Calling onLoadingComplete');
        onLoadingComplete();
      }, 1000);

      return () => {
        console.log('LoadingScreen: Cleanup - cancelling timeout');
        clearTimeout(completeTimer);
      };
    }
  }, [isLoading, onLoadingComplete]); // Removed fadeOut from dependencies

  return (
    <div className={`loading-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="loading-content">
        <div className="loading-logo fade-in">
          <LoadingScreenLogo />
        </div>

        <p className={`loading-slogan ${showSlogan ? 'visible' : ''}`}>
          Nos habrá seguido la rabia ese día
        </p>

        {/* Progress indicator */}
        {progress > 0 && progress < 100 && (
          <div className="loading-progress-wrapper">
            <div className="loading-progress">
              <div
                className="loading-progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="loading-progress-pct">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadingScreen;
