import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSpring, animated } from '@react-spring/web';
import { X, User, Camera, Eye, Upload, Loader } from 'lucide-react';
import { UserInfoCardUtils } from './UserInfoCardUtils.jsx';
import './UserInfoCard.css';

const UserInfoCard = ({ user, onClose, isOwner }) => {
  const [showActionsPopup, setShowActionsPopup] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const fileInputRef = useRef(null);

  const {
    getImageUrl,
    handleImageUpload,
    uploadProgress,
    localImageUrl
  } = UserInfoCardUtils();

  // Slide-in animation
  const cardAnimation = useSpring({
    from: { opacity: 0, transform: 'translate(-50%, -50%) scale(0.9)' },
    to: { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
    config: { tension: 280, friction: 30 }
  });

  const backdropAnimation = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: { tension: 280, friction: 30 }
  });

  const handleImageClick = () => {
    if (isOwner) {
      setShowActionsPopup(!showActionsPopup);
    } else if (user?.image_user) {
      setShowImageModal(true);
    }
  };

  const handleViewImage = () => {
    setShowActionsPopup(false);
    setShowImageModal(true);
  };

  const handleUploadClick = () => {
    setShowActionsPopup(false);
    fileInputRef.current?.click();
  };

  const imageUrl = getImageUrl(user?.image_user);
  const displayImageUrl = localImageUrl || imageUrl;

  return createPortal(
    <>
      <animated.div
        className="user-card-backdrop"
        style={backdropAnimation}
        onClick={onClose}
      />
      <animated.div className="user-info-card" style={cardAnimation}>
        <button className="user-card-close-button" onClick={onClose} type="button">
          <X size={20} />
        </button>

        <div className="card-content">
          {/* Profile Section */}
          <div className="profile-section">
            <div
              className="profile-image-container"
              onClick={handleImageClick}
            >
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="loader">
                  <Loader className="loader-icon" />
                  <div className="progress-container">
                    <div
                      className="progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="progress-text">{uploadProgress}%</span>
                </div>
              )}

              {displayImageUrl ? (
                <img
                  src={displayImageUrl}
                  alt={user?.name_user}
                  className="profile-image"
                />
              ) : (
                <div className="placeholder-image">
                  <User className="placeholder-icon" />
                </div>
              )}

              {isOwner && (
                <div className="edit-overlay">
                  <Camera className="edit-icon" />
                </div>
              )}
            </div>

            {/* Actions Popup */}
            {showActionsPopup && (
              <div className="actions-popup">
                {user?.image_user && (
                  <button
                    className="action-button"
                    onClick={handleViewImage}
                    type="button"
                  >
                    <Eye className="action-icon" />
                    <span className="action-text">Ver imagen</span>
                  </button>
                )}
                <button
                  className="action-button"
                  onClick={handleUploadClick}
                  type="button"
                >
                  <Upload className="action-icon" />
                  <span className="action-text">
                    {user?.image_user ? 'Cambiar' : 'Subir'}
                  </span>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </div>

          {/* User Info */}
          <div className="user-info">
            <div className="user-info-header">
              <div className="user-name-container">
                <h2 className="user-name">{user?.name_user}</h2>
                <p className="user-type">
                  {(user?.is_editor === true || user?.is_editor === 1) ? 'Productor multimedia y editor' : 'Reader'}
                </p>
              </div>
            </div>

            <p className="user-email">{user?.email_user}</p>

            {user?.phone_user && (
              <p className="user-phone">
                Teléfono: {user.phone_user}
              </p>
            )}

            {user?.location_user && user.location_user !== 'No especificada' && (
              <p className="user-location">
                Ubicación: {user.location_user}
              </p>
            )}
          </div>
        </div>

        {/* Image Modal */}
        {showImageModal && displayImageUrl && createPortal(
          <>
            <div
              className="image-modal-backdrop"
              onClick={() => setShowImageModal(false)}
            />
            <div className="image-modal">
              <button
                className="image-modal-close"
                onClick={() => setShowImageModal(false)}
                type="button"
              >
                <X size={24} />
              </button>
              <img
                src={displayImageUrl}
                alt={user?.name_user}
                className="image-modal-img"
              />
            </div>
          </>,
          document.body
        )}
      </animated.div>
    </>,
    document.body
  );
};

export default UserInfoCard;
