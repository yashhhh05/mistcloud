import apiClient from './axios';
import { User } from '../types';

export interface SignupParams {
  fullName: string;
  email: string;
  password: string;
}

export interface SigninParams {
  email: string;
  password: string;
}

export interface VerifyOTPParams {
  accountId: string;
  password: string; // The 6-digit OTP code
}

export interface VerifyOTPResponse {
  token: string;
  sessionId: string;
  user: User;
}

// 1. Sign up new user
export const signup = async (data: SignupParams): Promise<{ accountId: string }> => {
  const response = await apiClient.post<{ accountId: string }>('/auth/signup', data);
  return response.data;
};

// 2. Sign in existing user
export const signin = async (data: SigninParams): Promise<{ accountId: string }> => {
  const response = await apiClient.post<{ accountId: string }>('/auth/signin', data);
  return response.data;
};

// 3. Verify OTP code and retrieve JWT session
export const verifyOTP = async (data: VerifyOTPParams): Promise<VerifyOTPResponse> => {
  const response = await apiClient.post<VerifyOTPResponse>('/auth/verify', data);
  return response.data;
};

// 4. Resend 6-digit OTP
export const resendOTP = async (email: string): Promise<{ accountId: string }> => {
  const response = await apiClient.post<{ accountId: string }>('/auth/resend-otp', { email });
  return response.data;
};

// 5. Get current authenticated user profile
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
};

// 6. Get user by ID (for populating file owners)
export const getUserById = async (id: string): Promise<User> => {
  const response = await apiClient.get<User>(`/auth/users/${id}`);
  return response.data;
};
