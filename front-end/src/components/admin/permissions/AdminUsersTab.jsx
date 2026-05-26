import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../../utils/axiosConfig';
import { useAuth } from '../../../app_context/AuthContext';
import { useUI } from '../../../app_context/UIContext';
import './AdminUsersTab.css';

const ROLES = [
  { key: 'is_editor', label: 'Editor', help: 'Puede crear artículos y enviarlos para aprobación.' },
  { key: 'is_premium_reader', label: 'Premium', help: 'Puede leer artículos marcados como premium.' },
  { key: 'is_super_admin', label: 'Super admin', help: 'Control total. Concede con cuidado.' }
];

function AdminUsersTab() {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useUI();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [savingByKey, setSavingByKey] = useState({}); // { "<id>:<role>": true }

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
      showError(err.response?.data?.error || 'Error al cargar usuarios');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [buildAuthHeader, showError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
        showSuccess(res.data.success || 'Rol actualizado');
      }
    } catch (err) {
      showError(err.response?.data?.error || 'Error al actualizar el rol');
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
          placeholder="Buscar por nombre o email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Buscar</button>
        {query && (
          <button
            type="button"
            className="admin-users__clear"
            onClick={() => { setQuery(''); fetchUsers(''); }}
          >
            Limpiar
          </button>
        )}
      </form>

      {loading ? (
        <p className="admin-users__loading">Cargando usuarios…</p>
      ) : users.length === 0 ? (
        <p className="admin-users__empty">No hay usuarios que coincidan.</p>
      ) : (
        <div className="admin-users__list" role="list">
          {users.map((user) => (
            <article key={user.id_user} className="admin-user-row" role="listitem">
              <header className="admin-user-row__head">
                <h3>{user.name_user}</h3>
                <p className="admin-user-row__email">{user.email_user}</p>
                <p className="admin-user-row__meta">
                  id #{user.id_user} · {user.auth_provider}
                  {flagOn(user.email_verified) ? ' · email verificado' : ' · email pendiente'}
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
                      title={isSelfSuperAdminRow ? 'No puedes modificar tu propio super-admin' : role.help}
                    >
                      <input
                        type="checkbox"
                        checked={value}
                        disabled={saving || isSelfSuperAdminRow}
                        onChange={() => handleToggle(user, role.key, value)}
                      />
                      <span className="admin-role-toggle__label">
                        {role.label}{saving ? '…' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AdminUsersTab;
