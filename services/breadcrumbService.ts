import axios from '@/lib/httpClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface BreadcrumbData {
  label: string;
  href: string;
}

// Route-level mapping for certain parent routes to more friendly child labels
const routeLabelMap: Record<string, (id?: string) => string | null> = {
  // For escrow routes we prefer a generic action label instead of raw resource name
  escrow: () => 'View Contract',
  // Example: shipments/123 -> View Shipment
  shipments: () => 'View Shipment',
  deliveries: () => 'View Delivery',
};

export const breadcrumbService = {
  async getResourceName(type: string, id: string): Promise<string> {
    try {
      const response = await axios.get(`${API_URL}/${type}/${id}`);
      return response.data.name || response.data.title || id;
    } catch (error) {
      console.error(`Error fetching ${type} name:`, error);
      return id; // Fallback to ID
    }
  },

  /**
   * Returns a human-friendly label for a child segment under a parent route.
   * If a mapping exists in `routeLabelMap` the mapped label will be used.
   * Otherwise, falls back to fetching the resource name from the backend.
   */
  async getLabelForChild(parent: string, id: string): Promise<string> {
    const mapper = routeLabelMap[parent];
    if (mapper) {
      try {
        const mapped = mapper(id);
        if (mapped) return mapped;
      } catch (e) {
        // ignore mapper errors and fallback to fetch
        console.error('Error running mapper for', parent, e);
      }
    }

    // Fallback to backend lookup
    return this.getResourceName(parent, id);
  }
};
