import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../app_context/AuthContext';
import { useUI } from '../../../app_context/UIContext';
import { usePendingReview } from '../../../app_context/PendingReviewContext';
import AdminUsersTab from './AdminUsersTab';
import AdminPendingTab from './AdminPendingTab';
import AdminProposalsTab from './AdminProposalsTab';
import AdminHeroTab from './AdminHeroTab';
import AdminMetadataTab from './AdminMetadataTab';
import AdminAppearanceTab from './AdminAppearanceTab';
import AdminNavTab from './AdminNavTab';
import AdminWorkshopsTab from './AdminWorkshopsTab';
import AdminGalleryTab from './AdminGalleryTab';
import './AdminPage.css';

const TABS = [
  { key: 'users', label: 'Usuarios' },
  { key: 'pending', label: 'Pendientes de aprobación' },
  { key: 'proposals', label: 'Propuestas' },
  { key: 'hero', label: 'Portada' },
  { key: 'metadata', label: 'Datos de la revista' },
  { key: 'workshops', label: 'Talleres' },
  { key: 'gallery', label: 'Galería' },
  { key: 'appearance', label: 'Apariencia' },
  { key: 'navigation', label: 'Navegación' }
  // labels: admin.tabs.<key> (Spanish here as the default)
];

function AdminPage() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAuth();
  const { navigateToHome, adminTab } = useUI();
  const { totalPending, newProposals, galleryPending } = usePendingReview();
  const [activeTab, setActiveTab] = useState(adminTab || 'users');

  if (!isSuperAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-page__denied">
          <h2>{t('admin.page.restricted', 'Acceso restringido')}</h2>
          <p>{t('admin.page.restrictedText', 'Esta sección solo está disponible para el super-administrador.')}</p>
          <button className="admin-page__back" onClick={navigateToHome}>{t('common.buttons.backToHome', 'Volver al inicio')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1>{t('header.admin.title', 'Administración')}</h1>
        <p className="admin-page__subtitle">{t('admin.page.subtitle', 'Gestiona usuarios, revisa lo pendiente y configura la revista')}</p>
      </header>

      <nav className="admin-page__tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`admin-page__tab ${activeTab === tab.key ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {t(`admin.tabs.${tab.key}`, tab.label)}
            {tab.key === 'pending' && totalPending > 0 && (
              <span className="admin-page__tab-badge">{totalPending}</span>
            )}
            {tab.key === 'proposals' && newProposals > 0 && (
              <span className="admin-page__tab-badge">{newProposals}</span>
            )}
            {tab.key === 'gallery' && galleryPending > 0 && (
              <span className="admin-page__tab-badge">{galleryPending}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="admin-page__body">
        {activeTab === 'users' && <AdminUsersTab />}
        {activeTab === 'pending' && <AdminPendingTab />}
        {activeTab === 'proposals' && <AdminProposalsTab />}
        {activeTab === 'hero' && <AdminHeroTab />}
        {activeTab === 'metadata' && <AdminMetadataTab />}
        {activeTab === 'workshops' && <AdminWorkshopsTab />}
        {activeTab === 'gallery' && <AdminGalleryTab />}
        {activeTab === 'appearance' && <AdminAppearanceTab />}
        {activeTab === 'navigation' && <AdminNavTab />}
      </main>
    </div>
  );
}

export default AdminPage;
