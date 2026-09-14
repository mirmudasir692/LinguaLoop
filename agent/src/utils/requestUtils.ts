import type { Response } from 'express';
import type { ApiResponse, AuthenticatedRequest } from '../types';

export const getAuthUserId = (req: AuthenticatedRequest): string => {
  return req.userId || req.user?._id?.toString() || '';
};

export const getParam = (param: string | string[] | undefined): string | undefined => {
  if (!param) return undefined;
  const value = Array.isArray(param) ? param[0] : param;
  return value.trim() || undefined;
};

export const sendSuccess = <T>(
  res: Response<ApiResponse<T>>,
  message: string,
  data: T,
  statusCode = 200
): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendBadRequest = (res: Response<ApiResponse>, message: string): void => {
  res.status(400).json({
    success: false,
    message,
    data: null,
  });
};

export const sendUnauthorized = (res: Response<ApiResponse>, message = 'Unauthorized'): void => {
  res.status(401).json({
    success: false,
    message,
    data: null,
  });
};
