import axios from '@/lib/httpClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface RegistrationData {
  role: 'customer' | 'driver' | 'admin';
  email: string;
  password: string;
  fullName: string;
  phone: string;
  businessName?: string;
  businessRegistration?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  vehicleType?: string;
  vehicleRegistration?: string;
  vehicleModel?: string;
}

export interface RegistrationResponse {
  id: string;
  email: string;
  role: string;
  status: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * registrationService — responsible for all registration-related API communication.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export const registrationService = {
  /**
   * Register a new user
   * @param data - Registration data including role, personal details, and optional driver details
   * @returns Promise with registration response
   */
  async register(data: RegistrationData): Promise<ApiResponse<RegistrationResponse>> {
    try {
      const { data: response } = await axios.post<
        ApiResponse<RegistrationResponse>
      >(`${API_BASE_URL}/api/auth/register`, data);
      return response;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Validate email availability
   * @param email - Email to check
   * @returns Promise indicating if email is available
   */
  async validateEmailAvailability(
    email: string
  ): Promise<ApiResponse<{ available: boolean }>> {
    try {
      const { data } = await axios.post<ApiResponse<{ available: boolean }>>(
        `${API_BASE_URL}/api/auth/validate-email`,
        { email }
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Validate license number for driver registration
   * @param licenseNumber - Driver license number
   * @returns Promise indicating if license is valid
   */
  async validateLicense(
    licenseNumber: string
  ): Promise<ApiResponse<{ valid: boolean }>> {
    try {
      const { data } = await axios.post<ApiResponse<{ valid: boolean }>>(
        `${API_BASE_URL}/api/auth/validate-license`,
        { licenseNumber }
      );
      return data;
    } catch (error: any) {
      throw error;
    }
  },
};
