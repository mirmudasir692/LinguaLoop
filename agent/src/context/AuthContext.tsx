import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authService from '../services/authService';
import type {
  AuthContextType,
  LoginCredentials,
  RegisterCredentials,
  User,
} from '../types/auth';
import { getToken, removeToken, setToken } from '../utils/storage';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await authService.logout();
      }
    } catch {
      // Ignore network errors during logout
    } finally {
      removeToken();
      setTokenState(null);
      setUser(null);
    }
  }, [token]);

  const fetchCurrentUser = useCallback(async () => {
    const storedToken = getToken();
    if (!storedToken) {
      setUser(null);
      setTokenState(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.getProfile();
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        setTokenState(storedToken);
      } else {
        removeToken();
        setTokenState(null);
        setUser(null);
      }
    } catch {
      removeToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials);
      if (response.success && response.data) {
        const { user: loggedInUser, token: receivedToken } = response.data;
        setToken(receivedToken);
        setTokenState(receivedToken);
        setUser(loggedInUser);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      const message = authService.getErrorMessage(error, 'Login failed. Please check your credentials.');
      throw new Error(message);
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      const response = await authService.register(credentials);
      if (response.success && response.data) {
        const { user: registeredUser, token: receivedToken } = response.data;
        setToken(receivedToken);
        setTokenState(receivedToken);
        setUser(registeredUser);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      const message = authService.getErrorMessage(error, 'Registration failed. Please try again.');
      throw new Error(message);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
    }),
    [user, token, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
export { useAuth } from './useAuth';

