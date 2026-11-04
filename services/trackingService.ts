/**
 * Tracking Service
 * Handles API calls for delivery route tracking and map data
 */

import axios, { isAxiosError } from '@/lib/httpClient';
import { RouteData, RouteResult } from '@/types/tracking';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Get route tracking data for a delivery
 * @param deliveryId - The delivery ID to fetch route for
 * @returns Promise resolving to RouteData
 * @throws Error if API request fails
 */
export async function getDeliveryRoute(deliveryId: string): Promise<RouteData> {
  if (!deliveryId) {
    throw new Error('Delivery ID is required');
  }

  try {
    const response = await axios.get<RouteResult>(
      `${API_BASE_URL}/api/deliveries/${deliveryId}/route`,
      {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error(`Delivery not found: ${deliveryId}`);
      }
      if (error.response?.status === 403) {
        throw new Error('Unauthorized to access this delivery');
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - unable to fetch route');
      }
      throw new Error(error.response?.data?.error || 'Failed to fetch route data');
    }
    throw error;
  }
}

/**
 * Get current location for a delivery in transit
 * @param deliveryId - The delivery ID
 * @returns Promise resolving to current coordinates
 * @throws Error if API request fails
 */
export async function getCurrentLocation(
  deliveryId: string
): Promise<{ latitude: number; longitude: number }> {
  if (!deliveryId) {
    throw new Error('Delivery ID is required');
  }

  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/deliveries/${deliveryId}/location`,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(error.response?.data?.error || 'Failed to fetch current location');
    }
    throw error;
  }
}

/**
 * Calculate route between two coordinates
 * @param origin - Starting coordinate
 * @param destination - Ending coordinate
 * @returns Promise resolving to route waypoints
 * @throws Error if calculation fails
 */
export async function calculateRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<Array<{ latitude: number; longitude: number }>> {
  if (!origin || !destination) {
    throw new Error('Origin and destination coordinates are required');
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/routes/calculate`, {
      params: {
        origin_lat: origin.latitude,
        origin_lng: origin.longitude,
        dest_lat: destination.latitude,
        dest_lng: destination.longitude,
      },
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    return response.data.data.waypoints || [];
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(error.response?.data?.error || 'Failed to calculate route');
    }
    throw error;
  }
}
