import { useAuth } from './useAuth';

export function useUserRole() {
  const { user } = useAuth();
  const role = user?.role || 'agent';

  return {
    isDeveloper: role === 'developer',
    isAdmin: role === 'admin' || role === 'developer',
    isAgent: role === 'agent',
  };
}