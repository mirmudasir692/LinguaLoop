export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  age?: string;
  studyStandard?: string;
  englishRating?: string;
  learningGoal?: string;
  hobbies?: string;
}

export interface AuthResponseData {
  user: User;
  token: string;
}

export interface ProfileResponseData {
  user: User;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
}

export type AuthResponse = ApiResponse<AuthResponseData>;
export type ProfileResponse = ApiResponse<ProfileResponseData>;
export type LogoutResponse = ApiResponse<null>;

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
}
