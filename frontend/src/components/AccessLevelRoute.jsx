import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toAccessLevel } from '../lib/accessLevel';

export function AccessLevelRoute({ minLevel = 1, children }) {
  const { user } = useAuth();
  const currentLevel = toAccessLevel(user?.nivel_acesso) ?? 1;

  if (currentLevel < minLevel) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
