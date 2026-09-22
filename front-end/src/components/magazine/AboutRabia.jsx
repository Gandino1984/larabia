// magazine-front/src/components/magazine/AboutRabia.jsx
//
// "Sobre La Rabia" — a dedicated static page reached from the "Más" dropdown.
// Content is driven by i18n keys (about.*) so it stays translatable and easy to
// update. The magazine logo comes from the site metadata.
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useUI } from '../../app_context/UIContext';
import { useMetadata } from '../../app_context/MetadataContext';
import './AboutRabia.css';

function AboutRabia() {
  const { t } = useTranslation();
  const { navigateToHome } = useUI();
  const { metadata, resolveLogoUrl } = useMetadata();
  const logoSrc = resolveLogoUrl(metadata.logo_light) || '/LogoLaRabiaWhite.png';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Body paragraphs — returnObjects gives the array from the locale file.
  const paragraphs = t('about.body', { returnObjects: true });
  const body = Array.isArray(paragraphs) ? paragraphs : [];

  return (
    <div className="about-page">
      <div className="about-container">
        <button className="about-back" onClick={navigateToHome} aria-label={t('about.back')}>
          <ArrowLeft size={18} />
          <span>{t('about.back')}</span>
        </button>

        <header className="about-header">
          <img src={logoSrc} alt={metadata.name || 'La Rabia'} className="about-logo" />
          <h1 className="about-title">{t('about.title')}</h1>
          <p className="about-intro">{t('about.intro')}</p>
        </header>

        <div className="about-body">
          {body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AboutRabia;
