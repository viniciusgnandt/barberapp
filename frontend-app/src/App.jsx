import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Toaster } from './components/ui/Toast';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Re-loads theme preferences from DB each time the logged-in user changes
function ThemeSync() {
  const { user }      = useAuth();
  const { loadFromDB } = useTheme();
  useEffect(() => { if (user) loadFromDB(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    document.title = user?.barbershopName || 'JubaOS';
  }, [user?.barbershopName]);
  return null;
}
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Services from './pages/Services';
import Profile from './pages/Profile';
import Establishment from './pages/Establishment';
import Reports from './pages/Reports';
import Billing from './pages/Billing';
import Clients from './pages/Clients';
import Stock from './pages/Stock';
import Sales from './pages/Sales';
import Appearance from './pages/Appearance';
import Settings, { SettingsIndex } from './pages/Settings';
import Landing from './pages/Landing';
import Team from './pages/Team';
import Business from './pages/Business';
import ReceptionAI from './pages/ReceptionAI';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemeSync />
        <BrowserRouter>
          <Routes>
            {/* Landing page */}
            <Route path="/" element={<Landing />} />

            {/* Public */}
            <Route path="/login"    element={<Login />}    />
            <Route path="/register" element={<Register />} />

            {/* Protected — main app */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agenda"    element={<Agenda />}    />
              <Route path="/services"  element={<Services />}  />
              <Route path="/reports"   element={<Reports />}   />
              <Route path="/clients"   element={<Clients />}   />
              <Route path="/sales"     element={<Sales />}     />
              <Route path="/stock"     element={<Stock />}     />
              <Route path="/business"   element={<Business />}    />
              <Route path="/reception" element={<ReceptionAI />} />
              <Route path="/settings"  element={<Settings />}>
                <Route index                element={<SettingsIndex />}  />
                <Route path="account"       element={<Profile />}        />
                <Route path="appearance"    element={<Appearance />}     />
                <Route path="establishment" element={<Establishment />}  />
                <Route path="team"          element={<Team />}           />
                <Route path="billing"       element={<Billing />}        />
              </Route>
            </Route>

            {/* Qualquer rota desconhecida → landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
