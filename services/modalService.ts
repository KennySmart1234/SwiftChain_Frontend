/**
 * Modal Service
 * Manages modal state and backend API integration
 * Follows the Service pattern for clean separation of concerns
 */

import axios from '@/lib/httpClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * Modal configuration types
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalPosition = 'center' | 'top' | 'bottom';

/**
 * Modal instance configuration
 */
export interface ModalConfig {
  id: string;
  title?: string;
  content?: React.ReactNode;
  size?: ModalSize;
  position?: ModalPosition;
  closeable?: boolean;
  backdrop?: boolean;
  focusTrap?: boolean;
  onClose?: () => void;
  onConfirm?: () => void | Promise<void>;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

/**
 * Modal template from backend API
 */
export interface ModalTemplate {
  id: string;
  name: string;
  title: string;
  content: string;
  size: ModalSize;
  position: ModalPosition;
  closeable: boolean;
  backdropBlur: boolean;
  focusTrap: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * API Response type
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Modal callback function type
 */
type ModalCallback = (config: ModalConfig | null) => void;

/**
 * Modal Service - manages modal state and lifecycle
 * Follows the Service pattern for clean separation of concerns
 */
class ModalService {
  private listeners: Set<ModalCallback> = new Set();
  private currentModal: ModalConfig | null = null;
  private modalStack: ModalConfig[] = [];

  /**
   * Subscribe to modal events
   * @param callback - Function to call when modal state changes
   * @returns Unsubscribe function
   */
  subscribe(callback: ModalCallback): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Emit modal state change to all listeners
   * @param config - Modal configuration (null to close)
   */
  private emit(config: ModalConfig | null): void {
    this.currentModal = config;
    this.listeners.forEach((callback) => callback(config));
  }

  /**
   * Open a modal with configuration
   * @param config - Modal configuration
   */
  open(config: ModalConfig): void {
    // Push to stack for nested modals
    this.modalStack.push(config);
    this.emit(config);
  }

  /**
   * Close the current modal
   * @param callback - Optional callback after close
   */
  close(callback?: () => void): void {
    if (this.modalStack.length > 0) {
      const closingModal = this.modalStack.pop();
      closingModal?.onClose?.();

      // Show previous modal if in stack
      if (this.modalStack.length > 0) {
        this.emit(this.modalStack[this.modalStack.length - 1]);
      } else {
        this.emit(null);
      }
    }

    callback?.();
  }

  /**
   * Close all modals
   */
  closeAll(): void {
    this.modalStack = [];
    this.emit(null);
  }

  /**
   * Get current modal
   */
  getCurrentModal(): ModalConfig | null {
    return this.currentModal;
  }

  /**
   * Check if any modal is open
   */
  isOpen(): boolean {
    return this.currentModal !== null;
  }

  /**
   * Get modal stack depth (for nesting)
   */
  getStackDepth(): number {
    return this.modalStack.length;
  }

  /**
   * Fetch modal templates from backend API
   * @returns Promise with modal templates
   */
  async fetchModalTemplates(): Promise<ApiResponse<ModalTemplate[]>> {
    try {
      const { data } = await axios.get<ApiResponse<ModalTemplate[]>>(
        `${API_BASE_URL}/api/modals/templates`
      );
      return data;
    } catch (error: any) {
      console.error('Failed to fetch modal templates:', error.message);
      return {
        success: false,
        message: 'Failed to fetch modal templates',
        data: [],
      };
    }
  }

  /**
   * Fetch a specific modal template by ID
   * @param templateId - ID of the template
   */
  async fetchModalTemplate(templateId: string): Promise<ApiResponse<ModalTemplate>> {
    try {
      const { data } = await axios.get<ApiResponse<ModalTemplate>>(
        `${API_BASE_URL}/api/modals/templates/${templateId}`
      );
      return data;
    } catch (error: any) {
      console.error('Failed to fetch modal template:', error.message);
      return {
        success: false,
        message: 'Failed to fetch modal template',
      };
    }
  }

  /**
   * Fetch modal configuration from backend
   * @returns Promise with modal config
   */
  async getModalConfig(): Promise<ApiResponse<{ defaultSize: ModalSize; enableAnimations: boolean }>> {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/modals/config`
      );
      return data;
    } catch (error: any) {
      console.error('Failed to fetch modal config:', error.message);
      return {
        success: false,
        message: 'Failed to fetch configuration',
        data: {
          defaultSize: 'md',
          enableAnimations: true,
        },
      };
    }
  }

  /**
   * Submit modal action to backend
   * @param modalId - ID of the modal
   * @param action - Action name
   * @param data - Optional data to submit
   */
  async submitModalAction(
    modalId: string,
    action: string,
    data?: any
  ): Promise<ApiResponse<any>> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/modals/${modalId}/action`,
        { action, data }
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to submit modal action:', error.message);
      return {
        success: false,
        message: 'Failed to submit action',
      };
    }
  }
}

// Export singleton instance
export const modalService = new ModalService();
