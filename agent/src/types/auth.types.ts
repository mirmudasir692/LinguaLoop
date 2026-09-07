import { Request } from 'express';
import { IUser, IUserResponse } from './user.types';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponseData {
  user: IUserResponse;
  token: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface JwtPayloadData {
  id: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  userId?: string;
}
