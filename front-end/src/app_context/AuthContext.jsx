// magazine-front/src/app_context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (err) {
        console.error('Error parsing stored user:', err);
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axiosInstance.post('/user/login', {
        name_user: username,
        pass_user: password
      });

      if (response.data.error) {
        return { error: response.data.error };
      }

      const user = response.data.data;
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));

      return { success: true, user };
    } catch (err) {
      console.error('Login error:', err);
      return { error: 'Error al iniciar sesión' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const register = async (userData) => {
    try {
      const response = await axiosInstance.post('/user/register', userData);

      if (response.data.error) {
        return { error: response.data.error };
      }

      return { success: true, data: response.data.data };
    } catch (err) {
      console.error('Registration error:', err);
      return { error: 'Error al registrarse' };
    }
  };

  // Set user directly (for OAuth or other external auth)
  const setUser = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData));
  };

  // Debug logging
  console.log('AuthContext - currentUser:', currentUser);
  console.log('AuthContext - currentUser?.is_editor:', currentUser?.is_editor);
  console.log('AuthContext - isEditor calculation:', currentUser?.is_editor === true || currentUser?.is_editor === 1);

  // Returns true if the current user is listed as an author of the given article.
  // Checks both the multi-author `authors` array and the legacy `author_id` field.
  const isArticleAuthor = (article) => {
    if (!currentUser || !article) return false;
    const authors = article.authors || [];
    if (authors.some(a => a.id_user === currentUser.id_user)) return true;
    if (article.author_id && article.author_id === currentUser.id_user) return true;
    return false;
  };

  // Coerce 1/true into a real boolean — Sequelize returns booleans inconsistently.
  const flag = (v) => v === true || v === 1;
  const isEditor = flag(currentUser?.is_editor);
  const isAdmin = flag(currentUser?.is_admin);
  const isSuperAdmin = flag(currentUser?.is_super_admin);
  const isPremiumReader = flag(currentUser?.is_premium_reader);

  const value = {
    currentUser,
    loading,
    login,
    logout,
    register,
    setUser,
    setCurrentUser,
    isAuthenticated: !!currentUser,
    isEditor,
    isAdmin,
    isSuperAdmin,
    isPremiumReader,
    // True if this user can publish without going through the approval flow.
    // Admins and super admins publish directly; editors must submit for approval.
    canPublishDirectly: isAdmin || isSuperAdmin,
    // True if this user can create articles at all (admin, editor, or super admin).
    canCreateContent: isEditor || isAdmin || isSuperAdmin,
    isArticleAuthor
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
