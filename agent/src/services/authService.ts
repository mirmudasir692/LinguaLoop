import axios from 'axios';
import api from '../utils/api';
import type {
  ApiResponse,
  AuthResponse,
  LoginCredentials,
  LogoutResponse,
  ProfileResponse,
  RegisterCredentials,
} from '../types/auth';

export const getErrorMessage = (error: unknown, fallbackMessage = 'An unexpected error occurred'): string => {
  if (axios.isAxiosError(error)) {
    const errorData = error.response?.data as ApiResponse<unknown> | undefined;
    if (errorData?.message) {
      return errorData.message;
    }
    if (error.message) {
      return error.message;
    }
  } else if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
};

export const register = async (data: RegisterCredentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/api/auth/register', data);
  return response.data;
};

export const login = async (data: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/api/auth/login', data);
  return response.data;
};

export const logout = async (): Promise<LogoutResponse> => {
  const response = await api.post<LogoutResponse>('/api/auth/logout');
  return response.data;
};

export const getProfile = async (): Promise<ProfileResponse> => {
  const response = await api.get<ProfileResponse>('/api/auth/me');
  return response.data;
};

