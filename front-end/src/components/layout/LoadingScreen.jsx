// magazine-front/src/components/layout/LoadingScreen.jsx
import { useEffect, useState } from 'react';
import './LoadingScreen.css';

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
          <img
            src="/LogoLaRabiaWhite.png"
            alt="La Rabia"
            className="logo-image"
          />
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
