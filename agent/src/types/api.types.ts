import { Request } from 'express';
import { IUser } from './user.types';

export interface AuthenticatedRequest<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = qs.ParsedQs,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  userId: string;
  user?: IUser;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
}
