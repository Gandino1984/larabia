// magazine-front/src/components/layout/MoreDropdown.jsx
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import './MoreDropdown.css';

function MoreDropdown({ onGaleriaClick, onInternacionalClick, onContactoClick, onEditorialClick, onNewsletterClick, onMicroAbiertoClick, onHumorClick }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const menuItems = [
    { key: 'contact', label: t('header.nav.contact'), onClick: onContactoClick },
    { key: 'newsletter', label: t('header.nav.newsletter'), onClick: onNewsletterClick },
    { key: 'editorial', label: t('header.nav.editorial'), onClick: onEditorialClick },
    { key: 'internacional', label: t('header.nav.internacional'), onClick: onInternacionalClick },
    { key: 'humor', label: t('header.nav.humor'), onClick: onHumorClick },
    { key: 'microAbierto', label: t('header.nav.microAbierto'), onClick: onMicroAbiertoClick },
    { key: 'gallery', label: t('header.nav.gallery'), onClick: onGaleriaClick }
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuItemClick = (onClick) => {
    onClick();
    setIsOpen(false);
  };

  return (
    <div className="more-dropdown" ref={dropdownRef}>
      <button
        className="more-dropdown-btn nav-link"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('header.nav.more')}
      >
        <span>{t('header.nav.more')}</span>
        <ChevronDown size={16} className={`chevron-icon ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="more-dropdown-menu">
          {menuItems.map((item) => (
            <button
              key={item.key}
              className="more-dropdown-item"
              onClick={() => handleMenuItemClick(item.onClick)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MoreDropdown;
