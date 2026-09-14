import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { JwtPayloadData } from '../types';
import env from '../config/env.config';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as unknown as jwt.SignOptions['expiresIn'],
  });
};

export const verifyJwtToken = (token: string): JwtPayloadData => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayloadData;
};
