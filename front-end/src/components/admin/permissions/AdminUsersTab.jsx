import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../../utils/axiosConfig';
import { useAuth } from '../../../app_context/AuthContext';
import { useUI } from '../../../app_context/UIContext';
import './AdminUsersTab.css';

const ROLES = [
  { key: 'is_editor', i18n: 'editor', label: 'Editor', help: 'Puede crear artículos y enviarlos para aprobación.' },
  { key: 'is_premium_reader', i18n: 'premium', label: 'Premium', help: 'Puede leer artículos marcados como premium.' },
  { key: 'is_super_admin', i18n: 'superAdmin', label: 'Super admin', help: 'Control total. Concede con cuidado.' }
];

function AdminUsersTab() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useUI();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [savingByKey, setSavingByKey] = useState({}); // { "<id>:<role>": true }
  // Subscriptions by user id: { paid, complimentary } (GET /subscription/admin).
  const [subs, setSubs] = useState({});

  const buildAuthHeader = useCallback(() => ({
    headers: { 'x-user-id': currentUser?.id_user }
  }), [currentUser]);

  const fetchUsers = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/user/list', {
        ...buildAuthHeader(),
        params: q ? { q } : undefined
      });
      if (res.data.error) {
        showError(res.data.error);
        setUsers([]);
      } else {
        setUsers(res.data.data || []);
      }
    } catch (err) {
      showError(err.response?.data?.error || t('admin.users.loadError', 'Error al cargar usuarios'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [buildAuthHeader, showError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    axiosInstance.get('/subscription/admin', buildAuthHeader())
      .then((res) => setSubs(Object.fromEntries((res.data?.data || []).map((s) => [s.user_id, s]))))
      .catch(() => setSubs({}));
  }, [buildAuthHeader]);

  // A complimentary subscription: a subscriber like a paying one (badge,
  // workshops), without Stripe.
  const handleComplimentary = async (user, on) => {
    const key = `${user.id_user}:complimentary`;
    setSavingByKey((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await axiosInstance.patch(
        `/subscription/complimentary/${user.id_user}`,
        { complimentary: on },
        buildAuthHeader()
      );
      setSubs((prev) => ({ ...prev, [user.id_user]: res.data.data }));
      showSuccess(res.data.success || t('admin.users.complimentarySaved', 'Suscripción actualizada'));
    } catch (err) {
      showError(err.response?.data?.error || t('admin.users.complimentaryError', 'No se pudo cambiar la suscripción'));
    } finally {
      setSavingByKey((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(query.trim());
  };

  const handleToggle = async (user, role, currentValue) => {
    const newValue = !currentValue;
    const key = `${user.id_user}:${role}`;
    setSavingByKey((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await axiosInstance.patch(
        '/user/grant-role',
        { id_user: user.id_user, role, value: newValue },
        buildAuthHeader()
      );
      if (res.data.error) {
        showError(res.data.error);
      } else {
        // Optimistic — update the row locally with whatever the server returned
        setUsers((prev) =>
          prev.map((u) =>
            u.id_user === user.id_user ? { ...u, [role]: newValue } : u
          )
        );
        showSuccess(res.data.success || t('admin.users.roleUpdated', 'Rol actualizado'));
      }
    } catch (err) {
      showError(err.response?.data?.error || t('admin.users.roleError', 'Error al actualizar el rol'));
    } finally {
      setSavingByKey((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const flagOn = (v) => v === true || v === 1;

  return (
    <section className="admin-users">
      <form className="admin-users__search" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder={t('admin.users.searchPlaceholder', 'Buscar por nombre o email…')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">{t('common.buttons.search', 'Buscar')}</button>
        {query && (
          <button
            type="button"
            className="admin-users__clear"
            onClick={() => { setQuery(''); fetchUsers(''); }}
          >
            {t('admin.users.clear', 'Limpiar')}
          </button>
        )}
      </form>

      {loading ? (
        <p className="admin-users__loading">{t('admin.users.loading', 'Cargando usuarios…')}</p>
      ) : users.length === 0 ? (
        <p className="admin-users__empty">{t('admin.users.empty', 'No hay usuarios que coincidan.')}</p>
      ) : (
        <div className="admin-users__list" role="list">
          {users.map((user) => (
            <article key={user.id_user} className="admin-user-row" role="listitem">
              <header className="admin-user-row__head">
                <h3>{user.name_user}</h3>
                <p className="admin-user-row__email">{user.email_user}</p>
                <p className="admin-user-row__meta">
                  id #{user.id_user} · {user.auth_provider}
                  {' · '}{flagOn(user.email_verified) ? t('admin.users.emailVerified', 'email verificado') : t('admin.users.emailPending', 'email pendiente')}
                </p>
              </header>

              <div className="admin-user-row__roles">
                {ROLES.map((role) => {
                  const value = flagOn(user[role.key]);
                  const saving = savingByKey[`${user.id_user}:${role.key}`];
                  const isSelfSuperAdminRow =
                    role.key === 'is_super_admin' &&
                    parseInt(user.id_user) === parseInt(currentUser?.id_user);

                  return (
                    <label
                      key={role.key}
                      className={`admin-role-toggle ${value ? 'is-on' : ''} ${isSelfSuperAdminRow ? 'is-locked' : ''}`}
                      title={isSelfSuperAdminRow ? t('admin.users.ownSuperAdmin', 'No puedes modificar tu propio super-admin') : t(`admin.users.role.${role.i18n}.help`, role.help)}
                    >
                      <input
                        type="checkbox"
                        checked={value}
                        disabled={saving || isSelfSuperAdminRow}
                        onChange={() => handleToggle(user, role.key, value)}
                      />
                      <span className="admin-role-toggle__label">
                        {t(`admin.users.role.${role.i18n}`, role.label)}{saving ? '…' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="admin-user-row__subscription">
                {subs[user.id_user]?.paid && (
                  <span className="admin-user-row__paid" title={t('admin.users.paidHelp', 'Paga su suscripción con Stripe.')}>
                    {t('admin.users.paid', 'Suscripción de pago')}
                  </span>
                )}
                {(() => {
                  const on = !!subs[user.id_user]?.complimentary;
                  const saving = savingByKey[`${user.id_user}:complimentary`];
                  return (
                    <label
                      className={`admin-role-toggle ${on ? 'is-on' : ''}`}
                      title={t('admin.users.complimentaryHelp', 'Suscriptor/a sin pagar: mismo distintivo y talleres que una suscripción de pago.')}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={saving}
                        onChange={() => handleComplimentary(user, !on)}
                      />
                      <span className="admin-role-toggle__label">
                        {t('admin.users.complimentary', 'Suscripción de cortesía')}{saving ? '…' : ''}
                      </span>
                    </label>
                  );
                })()}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AdminUsersTab;
