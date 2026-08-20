import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const signup = useAuthStore((state) => state.signup);
  const logout = useAuthStore((state) => state.logout);
  const checkSession = useAuthStore((state) => state.checkSession);
  const setError = useAuthStore((state) => state.setError);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

  return {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    checkSession,
    setError,
    updateProfile,
    loginWithGoogle
  };
}
