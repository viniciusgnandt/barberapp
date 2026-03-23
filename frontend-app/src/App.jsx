import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, fontFamily: 'monospace', background: '#1a1a2e', color: '#e2e8f0', minHeight: '100vh' }}>
        <h2 style={{ color: '#f87171', marginBottom: 16 }}>Erro de Renderização</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{this.state.error?.message}{'\n\n'}{this.state.error?.stack}</pre>
      </div>
    );
    return this.props.children;
  }
}
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ClientAuthProvider } from './context/ClientAuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Toaster } from './components/ui/Toast';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ClientProtectedRoute from './components/layout/ClientProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import ClientLayout from './components/layout/ClientLayout';

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
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Services from './pages/Services';
import Profile from './pages/Profile';
import Establishment from './pages/Establishment';

// Reports module
import ReportsIndex from './pages/reports/ReportsIndex';
import OverviewReport from './pages/reports/OverviewReport';
import ServicesReport from './pages/reports/ServicesReport';
import SalesReport from './pages/reports/SalesReport';
import FinancialReport from './pages/reports/FinancialReport';
import ProfessionalsReport from './pages/reports/ProfessionalsReport';
import AgendaReport from './pages/reports/AgendaReport';
import ClientsReport from './pages/reports/ClientsReport';
import StockReport from './pages/reports/StockReport';
import ReceptionReport from './pages/reports/ReceptionReport';
import PerformanceReport from './pages/reports/PerformanceReport';
import CustomReport from './pages/reports/CustomReport';
import FinOverviewReport from './pages/reports/FinOverviewReport';
import FinFluxoReport from './pages/reports/FinFluxoReport';
import FinTaxasReport from './pages/reports/FinTaxasReport';
import FinReceitasReport from './pages/reports/FinReceitasReport';
import CliRecorrenciaReport from './pages/reports/CliRecorrenciaReport';
import CliLtvReport from './pages/reports/CliLtvReport';
import Billing from './pages/Billing';
import Clients from './pages/Clients';
import Stock from './pages/Stock';
import Appearance from './pages/Appearance';
import Settings, { SettingsIndex } from './pages/Settings';
import Landing from './pages/Landing';
import Team from './pages/Team';
import Business from './pages/Business';
import ReceptionAI from './pages/ReceptionAI';
import UsageSettings from './pages/UsageSettings';
import PlanSelection from './pages/PlanSelection';

// Financial module
import FinancialIndex from './pages/financial/FinancialIndex';
import CashRegister from './pages/financial/CashRegister';
import CashHistory from './pages/financial/CashHistory';
import FinancialTabs from './pages/financial/Tabs';
import Commissions from './pages/financial/Commissions';
import Transactions from './pages/financial/Transactions';
import FinancialInvoices   from './pages/financial/Invoices';
import FinancialSettings  from './pages/financial/FinancialSettings';

// Platform admin
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminClients from './pages/admin/AdminClients';
import AdminAI from './pages/admin/AdminAI';
import AdminAdmins from './pages/admin/AdminAdmins';

// Client portal
import ClientLogin from './pages/client/ClientLogin';
import ClientRegister from './pages/client/ClientRegister';
import ClientForgotPassword from './pages/client/ClientForgotPassword';
import ClientHome from './pages/client/ClientHome';
import EstablishmentDetail from './pages/client/EstablishmentDetail';
import MyAppointments from './pages/client/MyAppointments';
import ClientSettings from './pages/client/ClientSettings';

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <ClientAuthProvider>
      <AuthProvider>
        <ThemeSync />
        <BrowserRouter>
          <Routes>
            {/* Landing page */}
            <Route path="/" element={<Landing />} />

            {/* Public */}
            <Route path="/login"           element={<Login />}           />
            <Route path="/register"        element={<Register />}        />
            <Route path="/forgot-password" element={<ForgotPassword />}  />
            <Route path="/reset-password"  element={<ResetPassword />}   />
            <Route path="/verify-email"    element={<VerifyEmail />}     />

            {/* Protected — main app */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/agenda"    element={<Agenda />}    />
              <Route path="/services"  element={<Services />}  />

              {/* Reports module */}
              <Route path="/relatorios" element={<ReportsIndex />}>
                <Route index                  element={<OverviewReport />}       />
                <Route path="servicos"        element={<ServicesReport />}       />
                <Route path="vendas"          element={<SalesReport />}          />
                <Route path="financeiro"      element={<FinancialReport />}      />
                <Route path="profissionais"   element={<ProfessionalsReport />}  />
                <Route path="agenda"          element={<AgendaReport />}         />
                <Route path="clientes"        element={<ClientsReport />}        />
                <Route path="estoque"         element={<StockReport />}          />
                <Route path="recepcao"        element={<ReceptionReport />}      />
                <Route path="desempenho"      element={<PerformanceReport />}    />
                <Route path="personalizado"   element={<CustomReport />}         />
                <Route path="fin-overview"   element={<FinOverviewReport />}    />
                <Route path="fin-fluxo"      element={<FinFluxoReport />}       />
                <Route path="fin-taxas"      element={<FinTaxasReport />}       />
                <Route path="fin-receitas"   element={<FinReceitasReport />}    />
                <Route path="cli-recorrencia" element={<CliRecorrenciaReport />} />
                <Route path="cli-ltv"        element={<CliLtvReport />}         />
              </Route>
              <Route path="/clients"   element={<Clients />}   />
              <Route path="/stock"     element={<Stock />}     />
              <Route path="/business"   element={<Business />}    />
              <Route path="/reception" element={<ReceptionAI />} />

              {/* Financial module */}
              <Route path="/financeiro" element={<FinancialIndex />}>
                <Route index                element={<CashRegister />}      />
                <Route path="historico"     element={<CashHistory />}       />
                <Route path="comandas"      element={<FinancialTabs />}     />
                <Route path="comissoes"     element={<Commissions />}       />
                <Route path="lancamentos"   element={<Transactions />}      />
                <Route path="notas"          element={<FinancialInvoices />} />
                <Route path="configuracoes" element={<FinancialSettings />} />
              </Route>

              <Route path="/settings"  element={<Settings />}>
                <Route index                element={<SettingsIndex />}  />
                <Route path="account"       element={<Profile />}        />
                <Route path="appearance"    element={<Appearance />}     />
                <Route path="establishment" element={<Establishment />}  />
                <Route path="team"          element={<Team />}           />
                <Route path="billing"       element={<Billing />}        />
                <Route path="billing/plans" element={<PlanSelection />}  />
                <Route path="usage"         element={<UsageSettings />}  />
              </Route>
            </Route>

            {/* Platform admin panel */}
            <Route path="/painel-administrativo/login" element={<AdminLogin />} />
            <Route path="/painel-administrativo" element={<AdminLayout />}>
              <Route index              element={<AdminDashboard />} />
              <Route path="clientes"    element={<AdminClients />}   />
              <Route path="ia"          element={<AdminAI />}        />
              <Route path="admins"      element={<AdminAdmins />}    />
            </Route>

            {/* Client portal — public */}
            <Route path="/client/login"            element={<ClientLogin />}           />
            <Route path="/client/register"         element={<ClientRegister />}        />
            <Route path="/client/forgot-password"  element={<ClientForgotPassword />}  />

            {/* Client portal — protected */}
            <Route element={<ClientProtectedRoute><ClientLayout /></ClientProtectedRoute>}>
              <Route path="/client"                  element={<ClientHome />}         />
              <Route path="/client/shop/:id"         element={<EstablishmentDetail />} />
              <Route path="/client/appointments"     element={<MyAppointments />}     />
              <Route path="/client/settings"         element={<ClientSettings />}     />
            </Route>

            {/* Qualquer rota desconhecida → landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
      </ClientAuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
