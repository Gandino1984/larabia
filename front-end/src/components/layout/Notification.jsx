// magazine-front/src/components/layout/Notification.jsx
import { useUI } from '../../app_context/UIContext';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import './Notification.css';

function Notification() {
  const { notification, clearNotification } = useUI();

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle size={24} />;
      case 'error':
        return <AlertCircle size={24} />;
      case 'info':
        return <Info size={24} />;
      default:
        return <Info size={24} />;
    }
  };

  return (
    <div className={`notification notification-${notification.type}`}>
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-message">{notification.message}</div>
      <button className="notification-close" onClick={clearNotification}>
        <X size={20} />
      </button>
    </div>
  );
}

export default Notification;
