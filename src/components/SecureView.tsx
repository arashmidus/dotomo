import { View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { AuthScreen } from '../screens/AuthScreen';

interface SecureViewProps {
  children: React.ReactNode;
}

export function SecureView({ children }: SecureViewProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <>{children}</>;
} 