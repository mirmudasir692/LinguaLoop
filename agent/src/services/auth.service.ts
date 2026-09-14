import User from '../models/User';
import { IUserProfile, UserProfile } from '../models/User-Profile';
import type { AuthResponseData, IUser, RegisterInput } from '../types';
import { generateToken } from '../utils/authUtils';

export const registerUser = async (userData: RegisterInput): Promise<AuthResponseData> => {
  const { name, email, password } = userData;

  if (!name || !email || !password) {
    throw new Error('Please provide name, email, and password');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
  });

  await upsertUserProfile(user._id.toString(), {
    age: userData.age || '',
    studyStandard: userData.studyStandard || '',
    englishRating: userData.englishRating || 'Intermediate',
    learningGoal: userData.learningGoal || '',
    hobbies: userData.hobbies || '',
    isOnboarded: true,
  });

  const token = generateToken(user._id.toString());

  return {
    user: {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token,
  };
};

export const loginUser = async (email: string, password: string): Promise<AuthResponseData> => {
  if (!email || !password) {
    throw new Error('Please provide email and password');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user._id.toString());

  return {
    user: {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token,
  };
};

export const getCurrentUser = async (userId: string): Promise<IUser | null> => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

export const logoutUser = async (): Promise<{ message: string }> => {
  return { message: 'Logged out successfully' };
};

export const getUserProfile = async (userId: string): Promise<IUserProfile | null> => {
  return UserProfile.findOne({ userId });
};

export const upsertUserProfile = async (
  userId: string,
  data: Partial<IUserProfile>
): Promise<IUserProfile> => {
  const existing = await getUserProfile(userId);
  const mergedData = { ...existing?.toObject(), ...data };

  const requiredFields = ['age', 'studyStandard', 'englishRating', 'learningGoal', 'hobbies'];
  const isComplete = requiredFields.every((field) => mergedData[field]);

  return UserProfile.findOneAndUpdate(
    { userId },
    { $set: { ...data, isOnboarded: isComplete } },
    { new: true, upsert: true }
  );
};
