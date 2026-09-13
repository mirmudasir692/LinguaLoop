import type { NextFunction, Request, Response } from 'express';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from '../services/auth.service';
import type { ApiResponse, AuthenticatedRequest, AuthResponseData } from '../types';

export const register = async (
  req: Request,
  res: Response<ApiResponse<AuthResponseData>>,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, age, studyStandard, englishRating, learningGoal, hobbies } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
        data: null,
      });
      return;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
        data: null,
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
        data: null,
      });
      return;
    }

    const authData = await registerUser({
      name,
      email,
      password,
      age,
      studyStandard,
      englishRating,
      learningGoal,
      hobbies,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: authData,
    });
  } catch (error: any) {
    if (error.message === 'User already exists with this email') {
      res.status(409).json({
        success: false,
        message: error.message,
        data: null,
      });
      return;
    }
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response<ApiResponse<AuthResponseData>>,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
        data: null,
      });
      return;
    }

    const authData = await loginUser(email, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: authData,
    });
  } catch (error: any) {
    if (error.message === 'Invalid email or password') {
      res.status(401).json({
        success: false,
        message: error.message,
        data: null,
      });
      return;
    }
    next(error);
  }
};

export const logout = async (
  _req: Request,
  res: Response<ApiResponse<null>>,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await logoutUser();
    res.status(200).json({
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId || (req.user && req.user._id.toString());

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized access',
        data: null,
      });
      return;
    }

    const user = await getCurrentUser(userId);

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user,
      },
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({
        success: false,
        message: error.message,
        data: null,
      });
      return;
    }
    next(error);
  }
};
