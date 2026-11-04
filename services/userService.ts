import axios from '@/lib/httpClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  profileImage?: string;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  profileImage?: File | string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * userService — responsible for all user-related API communication.
 * Follows the Strict Layered Architecture: Component -> Hook -> Service.
 */
export const userService = {
  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    const { data } = await axios.get<ApiResponse<UserProfile>>(`${API_BASE_URL}/api/user/profile`);
    return data;
  },

  async updateProfile(profileData: UpdateProfileData): Promise<ApiResponse<UserProfile>> {
    // If there's a file, we might need FormData
    let payload: any = profileData;
    
    if (profileData.profileImage instanceof File) {
      const formData = new FormData();
      if (profileData.name) formData.append('name', profileData.name);
      if (profileData.phone) formData.append('phone', profileData.phone);
      formData.append('profileImage', profileData.profileImage);
      payload = formData;
    }

    const { data } = await axios.patch<ApiResponse<UserProfile>>(
      `${API_BASE_URL}/api/user/profile`,
      payload,
      {
        headers: {
          'Content-Type': profileData.profileImage instanceof File ? 'multipart/form-data' : 'application/json',
        },
      }
    );
    return data;
  },

  async changePassword(passwordData: ChangePasswordData): Promise<ApiResponse<void>> {
    const { data } = await axios.post<ApiResponse<void>>(
      `${API_BASE_URL}/api/user/change-password`,
      passwordData
    );
    return data;
  },
};
