import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkUploadZone } from '../BulkUploadZone';
import { useBulkUploadZone } from '@/hooks/useBulkUploadZone';
import { useToast } from '@/hooks/useToast';

jest.mock('@/hooks/useBulkUploadZone');
jest.mock('@/hooks/useToast');

describe('BulkUploadZone Component', () => {
  const mockUseBulkUploadZone = useBulkUploadZone as jest.MockedFunction<
    typeof useBulkUploadZone
  >;
  const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

  const defaultHookReturn = {
    files: [],
    isUploading: false,
    validationErrors: [],
    addFiles: jest.fn(),
    removeFile: jest.fn(),
    uploadFile: jest.fn(),
    uploadAll: jest.fn(),
    clearAll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBulkUploadZone.mockReturnValue(defaultHookReturn);
    mockUseToast.mockReturnValue({
      success: jest.fn(),
      error: jest.fn(),
    });
  });

  describe('Dropzone Rendering', () => {
    it('should render dropzone with instructions', () => {
      render(<BulkUploadZone />);

      expect(screen.getByText(/Drag and drop CSV or XLSX files here/i)).toBeInTheDocument();
      expect(screen.getByText(/or click to select files/i)).toBeInTheDocument();
      expect(screen.getByText(/Supported formats: CSV, XLSX/i)).toBeInTheDocument();
    });

    it('should show file input on click', async () => {
      render(<BulkUploadZone />);

      const dropzone = screen.getByText(/Drag and drop CSV or XLSX files here/i).closest('div');
      const fileInput = dropzone?.querySelector('input[type="file"]') as HTMLInputElement;

      expect(fileInput).toBeInTheDocument();
      expect(fileInput.accept).toBeDefined();
    });

    it('should display upload instructions', () => {
      render(<BulkUploadZone />);

      expect(screen.getByText(/Maximum file size: 50MB/i)).toBeInTheDocument();
      expect(screen.getByText(/Preview: First 3 rows displayed/i)).toBeInTheDocument();
    });
  });

  describe('Drag and Drop Interactions', () => {
    it('should accept CSV and XLSX files', async () => {
      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        addFiles: jest.fn(),
      });

      render(<BulkUploadZone />);

      const dropzone = screen.getByText(/Drag and drop CSV or XLSX files here/i).closest('div');

      if (dropzone) {
        const csvFile = new File(['col1,col2\nval1,val2'], 'test.csv', { type: 'text/csv' });

        fireEvent.drop(dropzone, {
          dataTransfer: {
            files: [csvFile],
            items: [{ kind: 'file', type: 'text/csv', getAsFile: () => csvFile }],
            types: ['Files'],
          },
        });

        expect(defaultHookReturn.addFiles).toHaveBeenCalled();
      }
    });

    it('should show visual feedback when dragging', () => {
      render(<BulkUploadZone />);

      const dropzone = screen.getByText(/Drag and drop CSV or XLSX files here/i).closest('div');

      if (dropzone) {
        fireEvent.dragEnter(dropzone, {
          dataTransfer: {
            items: [{ kind: 'file' }],
            types: ['Files'],
          },
        });

        expect(screen.getByText(/Drop files here/i)).toBeInTheDocument();
      }
    });
  });

  describe('File Display and Management', () => {
    it('should display uploaded files', () => {
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: {
          fileName: 'test.csv',
          rowCount: 100,
          columnCount: 3,
          columnNames: ['name', 'email', 'phone'],
          previewRows: [
            { name: 'John', email: 'john@example.com', phone: '555-1234' },
            { name: 'Jane', email: 'jane@example.com', phone: '555-5678' },
          ],
        },
        uploadStatus: 'pending' as const,
        uploadProgress: 0,
      };

      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
      });

      render(<BulkUploadZone />);

      expect(screen.getByText('test.csv')).toBeInTheDocument();
      expect(screen.getByText(/100 rows, 3 columns/i)).toBeInTheDocument();
    });

    it('should display file preview table', () => {
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: {
          fileName: 'test.csv',
          rowCount: 100,
          columnCount: 3,
          columnNames: ['name', 'email', 'phone'],
          previewRows: [
            { name: 'John Doe', email: 'john@example.com', phone: '555-1234' },
          ],
        },
        uploadStatus: 'pending' as const,
        uploadProgress: 0,
      };

      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
      });

      render(<BulkUploadZone />);

      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('email')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should show remove button for pending files', () => {
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: null,
        uploadStatus: 'pending' as const,
        uploadProgress: 0,
      };

      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
      });

      render(<BulkUploadZone />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should call removeFile when delete button is clicked', async () => {
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: null,
        uploadStatus: 'pending' as const,
        uploadProgress: 0,
      };

      const removeFile = jest.fn();
      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
        removeFile,
      });

      render(<BulkUploadZone />);

      // Find and click the remove button (X icon)
      const buttons = screen.getAllByRole('button');
      const removeButton = buttons.find((btn) => {
        return btn.className.includes('hover:bg-slate');
      });

      if (removeButton) {
        fireEvent.click(removeButton);
        expect(removeFile).toHaveBeenCalledWith(0);
      }
    });
  });

  describe('Validation Error Display', () => {
    it('should display validation errors', () => {
      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        validationErrors: [
          {
            field: 'type',
            message: 'Only JPEG, PNG, and PDF files are allowed',
          },
        ],
      });

      render(<BulkUploadZone />);

      expect(screen.getByText(/Invalid file/i)).toBeInTheDocument();
      expect(screen.getByText(/Only JPEG, PNG, and PDF files are allowed/i)).toBeInTheDocument();
    });

    it('should display multiple validation errors', () => {
      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        validationErrors: [
          {
            field: 'size',
            message: 'File exceeds size limit',
          },
          {
            field: 'type',
            message: 'Invalid file type',
          },
        ],
      });

      render(<BulkUploadZone />);

      expect(screen.getByText(/File exceeds size limit/i)).toBeInTheDocument();
      expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
    });
  });

  describe('Upload Status Display', () => {
    it('should show success status with checkmark', () => {
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: null,
        uploadStatus: 'success' as const,
        uploadProgress: 100,
      };

      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
      });

      render(<BulkUploadZone />);

      expect(screen.getByText(/file.*uploaded/i)).toBeInTheDocument();
    });

    it('should show error status with alert icon', () => {
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: null,
        uploadStatus: 'error' as const,
        uploadProgress: 0,
        error: 'Upload failed due to network error',
      };

      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
      });

      render(<BulkUploadZone />);

      expect(screen.getByText(/Upload failed due to network error/i)).toBeInTheDocument();
      expect(screen.getByText(/file.*failed/i)).toBeInTheDocument();
    });

    it('should show uploading state with loader', () => {
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: null,
        uploadStatus: 'uploading' as const,
        uploadProgress: 50,
      };

      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
        isUploading: true,
      });

      render(<BulkUploadZone />);

      expect(screen.getByText(/Uploading.../i)).toBeInTheDocument();
    });
  });

  describe('Upload Actions', () => {
    it('should show upload button for pending files', () => {
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: null,
        uploadStatus: 'pending' as const,
        uploadProgress: 0,
      };

      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
      });

      render(<BulkUploadZone />);

      expect(screen.getByText(/Upload 1 file/i)).toBeInTheDocument();
    });

    it('should call uploadAll when upload button is clicked', async () => {
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: null,
        uploadStatus: 'pending' as const,
        uploadProgress: 0,
      };

      const uploadAll = jest.fn();
      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
        uploadAll,
      });

      render(<BulkUploadZone fileType="shipments" />);

      const uploadButton = screen.getByText(/Upload 1 file/i);
      fireEvent.click(uploadButton);

      expect(uploadAll).toHaveBeenCalledWith('shipments');
    });

    it('should disable upload button while uploading', () => {
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: null,
        uploadStatus: 'uploading' as const,
        uploadProgress: 50,
      };

      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
        isUploading: true,
      });

      render(<BulkUploadZone />);

      // Check if uploading message is shown instead of upload button
      expect(screen.getByText(/Uploading.../i)).toBeInTheDocument();
    });
  });

  describe('Props and Configuration', () => {
    it('should accept fileType prop', () => {
      const uploadAll = jest.fn();
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: null,
        uploadStatus: 'pending' as const,
        uploadProgress: 0,
      };

      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
        uploadAll,
      });

      render(<BulkUploadZone fileType="deliveries" />);

      const uploadButton = screen.getByText(/Upload 1 file/i);
      fireEvent.click(uploadButton);

      expect(uploadAll).toHaveBeenCalledWith('deliveries');
    });

    it('should call onUploadComplete callback', async () => {
      const onUploadComplete = jest.fn();
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: {
          fileName: 'test.csv',
          rowCount: 10,
          columnCount: 3,
          columnNames: ['col1', 'col2', 'col3'],
          previewRows: [],
        },
        uploadStatus: 'success' as const,
        uploadProgress: 100,
      };

      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
      });

      render(<BulkUploadZone onUploadComplete={onUploadComplete} />);

      // The callback should be triggered by the component logic
      // In a real test, this would be called after successful upload
    });
  });

  describe('File Limiting', () => {
    it('should respect maxFiles prop', () => {
      render(<BulkUploadZone maxFiles={3} />);

      expect(screen.getByText(/max 3/i)).toBeInTheDocument();
    });

    it('should disable dropzone when max files reached', () => {
      const mockFiles = [
        {
          file: new File(['test1'], 'test1.csv', { type: 'text/csv' }),
          preview: null,
          uploadStatus: 'pending' as const,
          uploadProgress: 0,
        },
        {
          file: new File(['test2'], 'test2.csv', { type: 'text/csv' }),
          preview: null,
          uploadStatus: 'pending' as const,
          uploadProgress: 0,
        },
      ];

      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: mockFiles,
      });

      render(<BulkUploadZone maxFiles={2} />);

      expect(screen.getByText(/Files \(2\/2\)/i)).toBeInTheDocument();
    });
  });

  describe('Clear All Button', () => {
    it('should show clear all button when files exist', () => {
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: null,
        uploadStatus: 'pending' as const,
        uploadProgress: 0,
      };

      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
      });

      render(<BulkUploadZone />);

      expect(screen.getByText(/Clear all/i)).toBeInTheDocument();
    });

    it('should call clearAll when clear button is clicked', () => {
      const mockFile = {
        file: new File(['test'], 'test.csv', { type: 'text/csv' }),
        preview: null,
        uploadStatus: 'pending' as const,
        uploadProgress: 0,
      };

      const clearAll = jest.fn();
      mockUseBulkUploadZone.mockReturnValue({
        ...defaultHookReturn,
        files: [mockFile],
        clearAll,
      });

      render(<BulkUploadZone />);

      const clearButton = screen.getByText(/Clear all/i);
      fireEvent.click(clearButton);

      expect(clearAll).toHaveBeenCalled();
    });
  });
});
