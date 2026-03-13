import { createContext, useContext, useState, useEffect } from 'react';
import { Auth } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Perfis disponíveis para o email logado (carregados após autenticação)
  const [profiles, setProfiles] = useState([]);

  // Estado temporário enquanto o usuário escolhe entre múltiplos perfis no login
  const [pendingSelection, setPendingSelection] = useState(null);
  // { email, password, profiles: [...] }

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token  = localStorage.getItem('token');
    if (stored && token) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  // Busca todos os perfis do usuário logado
  useEffect(() => {
    if (!user) { setProfiles([]); return; }
    Auth.getProfiles().then(r => {
      if (r.ok) setProfiles(r.data?.profiles || []);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const login = async (email, password) => {
    const r = await Auth.login(email, password);
    if (!r.ok) return r;

    if (r.data.needsSelection) {
      // Múltiplos perfis — aguarda seleção
      setPendingSelection({ email, password, profiles: r.data.profiles });
      return { ok: true, needsSelection: true };
    }

    // Login direto (perfil único)
    localStorage.setItem('token', r.data.token);
    localStorage.setItem('user',  JSON.stringify(r.data.user));
    setUser(r.data.user);
    return { ok: true };
  };

  const selectProfile = async (profileId) => {
    if (!pendingSelection) return { ok: false, data: { message: 'Nenhuma seleção pendente.' } };
    const { email, password } = pendingSelection;
    const r = await Auth.selectProfile(email, password, profileId);
    if (r.ok) {
      localStorage.setItem('token', r.data.token);
      localStorage.setItem('user',  JSON.stringify(r.data.user));
      setUser(r.data.user);
      setPendingSelection(null);
    }
    return r;
  };

  const switchProfile = async (profileId) => {
    const r = await Auth.switchProfile(profileId);
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
    setProfiles([]);
    setPendingSelection(null);
  };

  const cancelSelection = () => setPendingSelection(null);

  const updateUser = (patch) => {
    setUser(prev => {
      const updated = { ...prev, ...patch };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user, loading, profiles, pendingSelection,
      login, register, logout, updateUser,
      selectProfile, switchProfile, cancelSelection,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
