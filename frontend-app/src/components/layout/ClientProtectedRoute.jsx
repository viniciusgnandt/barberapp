import { Navigate } from 'react-router-dom';
import { useClientAuth } from '../../context/ClientAuthContext';

export default function ClientProtectedRoute({ children }) {
  const { client, loading } = useClientAuth();
  if (loading) return null;
  if (!client) return <Navigate to="/client/login" replace />;
  return children;
}
