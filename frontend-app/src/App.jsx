import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from './components/ui/Toast';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Services from './pages/Services';
import Profile from './pages/Profile';
import Establishment from './pages/Establishment';
import Reports from './pages/Reports';
import Billing from './pages/Billing';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<Login />}    />
            <Route path="/register" element={<Register />} />

            {/* Protected */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard"     element={<Dashboard />}     />
              <Route path="/agenda"        element={<Agenda />}        />
              <Route path="/services"      element={<Services />}      />
              <Route path="/profile"       element={<Profile />}       />
              <Route path="/establishment" element={<Establishment />} />
              <Route path="/reports"      element={<Reports />}      />
              <Route path="/billing"      element={<Billing />}      />
            </Route>

            {/* Redirect root */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
