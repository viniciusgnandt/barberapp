import { createContext, useContext, useState, useEffect } from 'react';
import { Portal } from '../utils/api';

const ClientAuthContext = createContext(null);

export function ClientAuthProvider({ children }) {
  const [client,  setClient]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('clientUser');
    const token  = localStorage.getItem('clientToken');
    if (stored && token) setClient(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (phone, password) => {
    const r = await Portal.Auth.login(phone, password);
    if (r.ok) {
      localStorage.setItem('clientToken', r.data.token);
      localStorage.setItem('clientUser',  JSON.stringify(r.data.user));
      setClient(r.data.user);
    }
    return r;
  };

  const register = async (name, phone, password) => {
    const r = await Portal.Auth.register(name, phone, password);
    if (r.ok) {
      localStorage.setItem('clientToken', r.data.token);
      localStorage.setItem('clientUser',  JSON.stringify(r.data.user));
      setClient(r.data.user);
    }
    return r;
  };

  const logout = () => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientUser');
    setClient(null);
  };

  const updateClient = (patch) => {
    setClient(prev => {
      const updated = { ...prev, ...patch };
      localStorage.setItem('clientUser', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <ClientAuthContext.Provider value={{ client, loading, login, register, logout, updateClient }}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) throw new Error('useClientAuth must be inside ClientAuthProvider');
  return ctx;
}
