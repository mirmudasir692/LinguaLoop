import type { NextFunction, Response } from 'express';
import User from '../models/User';
import type { ApiResponse, AuthenticatedRequest } from '../types';
import { verifyJwtToken } from '../utils/authUtils';

export type { AuthenticatedRequest };

export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
      data: null,
    });
    return;
  }

  try {
    const decoded = verifyJwtToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid token. User does not exist.',
        data: null,
      });
      return;
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (_error: unknown) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      data: null,
    });
  }
};

export const protectRoute = verifyToken;
