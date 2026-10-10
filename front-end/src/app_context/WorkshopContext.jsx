// magazine-front/src/app_context/WorkshopContext.jsx
//
// Workshops (talleres): super admins create/manage; paying subscribers (and
// the magazine team) see the calendar and reserve a capacity-limited spot —
// general workshops and children's workshops (audience_workshop).
// The server answers 403 + code 'login_required' | 'subscription_required'
// when the reader can't access them; that is kept in `accessError`.
import { createContext, useContext, useState, useCallback } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

const WorkshopContext = createContext(null);

export const WorkshopProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useUI();
  const [workshops, setWorkshops] = useState([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accessError, setAccessError] = useState(null);

  const authHeader = useCallback(
    () => ({ headers: { 'x-user-id': currentUser?.id_user } }),
    [currentUser]
  );

  const fetchWorkshops = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/magazine-workshop', authHeader());
      setAccessError(null);
      setWorkshops(res.data?.data || []);
      return { success: true, data: res.data?.data || [] };
    } catch (err) {
      setWorkshops([]);
      const code = err.response?.status === 403 ? err.response?.data?.code : null;
      if (code) { setAccessError(code); return { error: err.response.data.error, code }; }
      console.error('fetchWorkshops error:', err);
      return { error: 'Error al cargar talleres' };
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  const fetchWorkshopById = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/magazine-workshop/by-id/${id}`, authHeader());
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      setSelectedWorkshop(res.data.data);
      return { success: true, data: res.data.data };
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al cargar el taller';
      showError(msg);
      return { error: msg };
    } finally {
      setLoading(false);
    }
  }, [authHeader, showError]);

  const createWorkshop = useCallback(async (data) => {
    try {
      const res = await axiosInstance.post('/magazine-workshop/create', data, authHeader());
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      showSuccess(res.data.success || 'Taller creado');
      await fetchWorkshops();
      return { success: true, data: res.data.data };
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al crear el taller';
      showError(msg);
      return { error: msg };
    }
  }, [authHeader, showSuccess, showError, fetchWorkshops]);

  const updateWorkshop = useCallback(async (id, data) => {
    try {
      const res = await axiosInstance.patch(`/magazine-workshop/update/${id}`, data, authHeader());
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      showSuccess(res.data.success || 'Taller actualizado');
      await fetchWorkshops();
      return { success: true, data: res.data.data };
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al actualizar el taller';
      showError(msg);
      return { error: msg };
    }
  }, [authHeader, showSuccess, showError, fetchWorkshops]);

  const deleteWorkshop = useCallback(async (id) => {
    try {
      const res = await axiosInstance.delete(`/magazine-workshop/remove-by-id/${id}`, authHeader());
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      showSuccess(res.data.message || 'Taller eliminado');
      await fetchWorkshops();
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al eliminar el taller';
      showError(msg);
      return { error: msg };
    }
  }, [authHeader, showSuccess, showError, fetchWorkshops]);

  const uploadWorkshopCover = useCallback(async (id, file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await axiosInstance.post('/magazine-workshop/upload-cover-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'x-workshop-id': id, 'x-user-id': currentUser?.id_user }
      });
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      return { success: true, data: res.data.data };
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al subir la imagen';
      showError(msg);
      return { error: msg };
    }
  }, [currentUser, showError]);

  const reserveWorkshop = useCallback(async (id) => {
    try {
      const res = await axiosInstance.post(`/magazine-workshop/reserve/${id}`, {}, authHeader());
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      showSuccess(res.data.success || 'Reserva confirmada');
      return { success: true, data: res.data.data };
    } catch (err) {
      const code = err.response?.status === 403 ? err.response?.data?.code : null;
      const msg = err.response?.data?.error || 'Error al reservar';
      // Not allowed to book: the caller guides the reader (login / subscribe).
      if (code) return { error: msg, code };
      showError(msg);
      return { error: msg };
    }
  }, [authHeader, showSuccess, showError]);

  const cancelWorkshopReservation = useCallback(async (id) => {
    try {
      const res = await axiosInstance.delete(`/magazine-workshop/reserve/${id}`, authHeader());
      if (res.data?.error) { showError(res.data.error); return { error: res.data.error }; }
      showSuccess(res.data.success || 'Reserva cancelada');
      return { success: true, data: res.data.data };
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al cancelar la reserva';
      showError(msg);
      return { error: msg };
    }
  }, [authHeader, showSuccess, showError]);

  const value = {
    workshops, selectedWorkshop, setSelectedWorkshop, loading, accessError,
    fetchWorkshops, fetchWorkshopById,
    createWorkshop, updateWorkshop, deleteWorkshop, uploadWorkshopCover,
    reserveWorkshop, cancelWorkshopReservation
  };

  return <WorkshopContext.Provider value={value}>{children}</WorkshopContext.Provider>;
};

export const useWorkshop = () => {
  const ctx = useContext(WorkshopContext);
  if (!ctx) throw new Error('useWorkshop must be used within a WorkshopProvider');
  return ctx;
};

export default WorkshopContext;
