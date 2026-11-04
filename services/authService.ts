import axios from '@/lib/httpClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'customer' | 'driver' | 'admin';
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * authService — responsible for all authentication-related API communication.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export const authService = {
  /**
   * Login user with email and password
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise with login response containing auth token
   */
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    try {
      const { data } = await axios.post<ApiResponse<LoginResponse>>(
        `${API_BASE_URL}/api/auth/login`,
        {
          email,
          password,
        }
      );
      return data;
    } catch (error: any) {
      // Re-throw with proper error structure
      throw error;
    }
  },

  /**
   * Logout user and clear authentication token
   */
  async logout(): Promise<ApiResponse<null>> {
    try {
      const { data } = await axios.post<ApiResponse<null>>(
        `${API_BASE_URL}/api/auth/logout`
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Request password reset
   * @param email - User's email address
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<null>> {
    try {
      const { data } = await axios.post<ApiResponse<null>>(
        `${API_BASE_URL}/api/auth/forgot-password`,
        { email }
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Reset password with token
   * @param token - Password reset token
   * @param newPassword - New password
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<null>> {
    try {
      const { data } = await axios.post<ApiResponse<null>>(
        `${API_BASE_URL}/api/auth/reset-password`,
        { token, newPassword }
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<ApiResponse<LoginResponse['user']>> {
    try {
      const { data } = await axios.get<ApiResponse<LoginResponse['user']>>(
        `${API_BASE_URL}/api/auth/me`
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  },
};
