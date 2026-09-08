import { Request } from 'express';
import { IUser } from './user.types';

export interface AuthenticatedRequest<
  P = {},
  ResBody = any,
  ReqBody = any,
  ReqQuery = qs.ParsedQs
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  userId: string;
  user?: IUser
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
}