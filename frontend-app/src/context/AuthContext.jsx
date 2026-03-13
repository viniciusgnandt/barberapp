import { createContext, useContext, useState, useEffect } from 'react';
import { Auth } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const r = await Auth.login(email, password);
    if (r.ok) {
      localStorage.setItem('token', r.data.token);
      localStorage.setItem('user',  JSON.stringify(r.data.user));
      setUser(r.data.user);
    }
    return r;
  };

  const register = async (name, email, password, role, barbershopName, barbershopId) => {
    return Auth.register(name, email, password, role, barbershopName, barbershopId);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  // Atualiza campos do usuário em memória e no localStorage sem novo login
  const updateUser = (patch) => {
    setUser(prev => {
      const updated = { ...prev, ...patch };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
