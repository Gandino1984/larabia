import { useState } from 'react';
import { useAuth } from '../../../app_context/AuthContext';
import { useUI } from '../../../app_context/UIContext';
import AdminUsersTab from './AdminUsersTab';
import AdminPendingTab from './AdminPendingTab';
import AdminMetadataTab from './AdminMetadataTab';
import AdminAppearanceTab from './AdminAppearanceTab';
import './AdminPage.css';

const TABS = [
  { key: 'users', label: 'Usuarios' },
  { key: 'pending', label: 'Pendientes de aprobación' },
  { key: 'metadata', label: 'Datos de la revista' },
  { key: 'appearance', label: 'Apariencia' }
];

function AdminPage() {
  const { isSuperAdmin } = useAuth();
  const { navigateToHome } = useUI();
  const [activeTab, setActiveTab] = useState('users');

  if (!isSuperAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-page__denied">
          <h2>Acceso restringido</h2>
          <p>Esta sección solo está disponible para el super-administrador.</p>
          <button className="admin-page__back" onClick={navigateToHome}>Volver al inicio</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1>Administración</h1>
        <p className="admin-page__subtitle">Gestiona usuarios y revisa artículos pendientes</p>
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
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="admin-page__body">
        {activeTab === 'users' && <AdminUsersTab />}
        {activeTab === 'pending' && <AdminPendingTab />}
        {activeTab === 'metadata' && <AdminMetadataTab />}
        {activeTab === 'appearance' && <AdminAppearanceTab />}
      </main>
    </div>
  );
}

export default AdminPage;
