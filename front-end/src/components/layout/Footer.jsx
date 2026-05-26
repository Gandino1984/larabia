// magazine-front/src/components/layout/Footer.jsx
import { useTranslation } from 'react-i18next';
import { useUI } from '../../app_context/UIContext';
import './Footer.css';

function Footer() {
  const { t } = useTranslation();
  const { openContactModal, openNewsletterModal } = useUI();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <img src="/LogoLaRabiaWhite.png" alt="La Rabia" className="footer-logo" />
            <p>{t('footer.description')}</p>
          </div>

          <div className="footer-section footer-info">
            <div className="footer-subsection">
              <h4>{t('footer.contact')}</h4>
              <p>{t('footer.location')}</p>
              <button className="footer-contact-btn" onClick={openContactModal}>
                Escríbenos un correo
              </button>
              <button className="footer-contact-btn" onClick={openNewsletterModal}>
                {t('footer.newsletter')}
              </button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
