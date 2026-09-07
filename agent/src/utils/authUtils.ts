import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { JwtPayloadData } from '../types';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign({ id: userId }, secret, { expiresIn: expiresIn as any });
};

export const verifyJwtToken = (token: string): JwtPayloadData => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';
  return jwt.verify(token, secret) as JwtPayloadData;
};
