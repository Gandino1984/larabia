import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSpring, animated } from '@react-spring/web';
import { X, User, Camera, Eye, Upload, Loader, LogOut, Medal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserInfoCardUtils } from './UserInfoCardUtils.jsx';
import axiosInstance from '../../utils/axiosConfig';
import { useSubscription } from '../../app_context/SubscriptionContext';
import '../common/SubscriberMark.css';
import './UserInfoCard.css';

const UserInfoCard = ({ user, bioText, onClose, isOwner, onLogout }) => {
  const { t } = useTranslation();
  const [showActionsPopup, setShowActionsPopup] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const fileInputRef = useRef(null);

  // Paid-subscriber badge: own card from the subscription context, anyone
  // else's from the public status endpoint.
  const subscription = useSubscription();
  const [otherIsSubscriber, setOtherIsSubscriber] = useState(false);
  useEffect(() => {
    if (isOwner || !user?.id_user) return undefined;
    let cancelled = false;
    axiosInstance.get(`/subscription/status/${user.id_user}`)
      .then((res) => { if (!cancelled) setOtherIsSubscriber(!!res.data?.data?.active); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOwner, user?.id_user]);
  const isSubscriber = isOwner ? !!subscription?.isSubscriber : otherIsSubscriber;

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

              {isSubscriber && (
                <span
                  className="subscriber-avatar__mark subscriber-avatar__mark--framed"
                  role="img"
                  aria-label={t('subscription.markTitle', 'Suscriptor/a de La Rabia')}
                >
                  <Medal strokeWidth={2.4} />
                </span>
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
                  {(() => {
                    const on = (v) => v === true || v === 1;
                    if (on(user?.is_super_admin)) return 'Editor general';
                    if (on(user?.is_admin)) return 'Admin';
                    if (on(user?.is_editor)) return 'Productor multimedia y editor';
                    return 'Reader';
                  })()}
                </p>
                {isSubscriber && (
                  <span className="user-subscriber-badge">
                    <Medal size={14} strokeWidth={2.4} />
                    {t('subscription.badge', 'Suscriptor/a')}
                  </span>
                )}
                {isOwner && subscription?.mine?.status && (
                  <button
                    type="button"
                    className="user-subscription-manage"
                    onClick={subscription.openPortal}
                    disabled={subscription.busy}
                  >
                    {t('subscription.manage', 'Gestionar suscripción')}
                  </button>
                )}
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

            {bioText && bioText.trim() && (
              <p className="user-bio">{bioText}</p>
            )}
          </div>

          {isOwner && onLogout && (
            <button
              className="user-card-logout"
              type="button"
              onClick={() => { onClose?.(); onLogout(); }}
            >
              <LogOut size={18} />
              <span>{t('common.buttons.logout')}</span>
            </button>
          )}
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
