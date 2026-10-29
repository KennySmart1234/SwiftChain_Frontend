import {
  render,
  screen,
  within,
  renderHook,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import CustomsDocumentationManager from '@/components/shipments/CustomsDocumentationManager';
import {
  daysUntilExpiry as realDaysUntilExpiry,
  getExpiryUrgency as realGetExpiryUrgency,
  useCustomsDocs as useCustomsDocsHook,
} from '@/hooks/useCustomsDocs';
import { customsDocsService } from '@/services/customsDocsService';
import type { CustomsDocument } from '@/types/customsDocumentation';

jest.mock('@/hooks/useCustomsDocs', () => ({
  ...jest.requireActual('@/hooks/useCustomsDocs'),
  useCustomsDocs: jest.fn(),
}));

jest.mock('@/services/customsDocsService', () => ({
  customsDocsService: {
    listDocuments: jest.fn(),
    uploadDocument: jest.fn(),
    deleteDocument: jest.fn(),
  },
}));

const mockedUseCustomsDocs = useCustomsDocsHook as unknown as jest.Mock;
const mockedService = customsDocsService as jest.Mocked<
  typeof customsDocsService
>;

const NOW = new Date();
const DAY_MS = 86_400_000;

function isoInDays(days: number): string {
  return new Date(NOW.getTime() + days * DAY_MS).toISOString();
}

function makeDocument(overrides: Partial<CustomsDocument> = {}): CustomsDocument {
  return {
    id: 'doc_1',
    shipmentId: 'SW-1042',
    type: 'commercial_invoice',
    filename: 'commercial-invoice.pdf',
    fileSize: 204_800,
    mimeType: 'application/pdf',
    status: 'verified',
    issuedAt: isoInDays(-30),
    expiresAt: isoInDays(120),
    uploadedAt: NOW.toISOString(),
    ...overrides,
  };
}

const INVOICE = makeDocument({
  id: 'doc_1',
  filename: 'commercial-invoice.pdf',
  status: 'verified',
  expiresAt: isoInDays(120),
});

const PACKING_LIST = makeDocument({
  id: 'doc_2',
  type: 'packing_list',
  filename: 'packing-list.pdf',
  status: 'pending',
  expiresAt: isoInDays(21),
});

const BILL_OF_LADING = makeDocument({
  id: 'doc_3',
  type: 'bill_of_lading',
  filename: 'bill-of-lading.pdf',
  status: 'verified',
  expiresAt: isoInDays(4),
});

const CERTIFICATE = makeDocument({
  id: 'doc_4',
  type: 'certificate_of_origin',
  filename: 'certificate-of-origin.pdf',
  status: 'expired',
  expiresAt: isoInDays(-3),
});

const DECLARATION = makeDocument({
  id: 'doc_5',
  type: 'customs_declaration',
  filename: 'customs-declaration.pdf',
  status: 'verified',
  expiresAt: null,
});

const ALL_DOCUMENTS = [
  INVOICE,
  PACKING_LIST,
  BILL_OF_LADING,
  CERTIFICATE,
  DECLARATION,
];

function applyFilter(documents: CustomsDocument[], filter: string) {
  if (filter === 'all') return documents;
  return documents.filter((doc) => doc.type === filter);
}

function mockHook(overrides: Record<string, unknown> = {}) {
  const filter = (overrides.typeFilter as string) ?? 'all';
  const documents = (overrides.documents as CustomsDocument[]) ?? [];

  return {
    documents,
    filteredDocuments: applyFilter(documents, filter),
    isLoading: false,
    isError: false,
    errorMessage: null,
    typeFilter: filter,
    setTypeFilter: jest.fn(),
    isUploading: false,
    uploadError: null,
    daysUntilExpiry: (doc: CustomsDocument) =>
      realDaysUntilExpiry(doc.expiresAt, NOW),
    getExpiryUrgency: (doc: CustomsDocument) =>
      realGetExpiryUrgency(doc, NOW),
    uploadDocument: jest.fn().mockResolvedValue(undefined),
    refetch: jest.fn(),
    clearUploadError: jest.fn(),
    ...overrides,
  };
}

describe('CustomsDocumentationManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('document rendering', () => {
    it('renders a card per document with its type label and status', () => {
      mockedUseCustomsDocs.mockReturnValue(
        mockHook({ documents: [INVOICE, PACKING_LIST] })
      );

      render(<CustomsDocumentationManager shipmentId="SW-1042" />);

      const invoiceCard = screen.getByTestId('customs-doc-card-doc_1');
      expect(within(invoiceCard).getByText('commercial-invoice.pdf')).toBeInTheDocument();
      expect(within(invoiceCard).getByText('Commercial Invoice')).toBeInTheDocument();
      expect(within(invoiceCard).getByText('verified')).toBeInTheDocument();

      const packingCard = screen.getByTestId('customs-doc-card-doc_2');
      expect(within(packingCard).getByText('packing-list.pdf')).toBeInTheDocument();
      expect(within(packingCard).getByText('Packing List')).toBeInTheDocument();
      expect(within(packingCard).getByText('pending')).toBeInTheDocument();

      expect(screen.getByText('2 documents on file')).toBeInTheDocument();
    });

    it('renders every supported document type label', () => {
      mockedUseCustomsDocs.mockReturnValue(
        mockHook({ documents: ALL_DOCUMENTS })
      );

      render(<CustomsDocumentationManager />);

      // Scoped to each card: the filter dropdown renders the same labels.
      const labelIn = (id: string) =>
        within(screen.getByTestId(`customs-doc-card-${id}`)).getByText(
          /Commercial Invoice|Packing List|Bill of Lading|Certificate of Origin|Customs Declaration/
        );

      expect(labelIn('doc_1')).toHaveTextContent('Commercial Invoice');
      expect(labelIn('doc_2')).toHaveTextContent('Packing List');
      expect(labelIn('doc_3')).toHaveTextContent('Bill of Lading');
      expect(labelIn('doc_4')).toHaveTextContent('Certificate of Origin');
      expect(labelIn('doc_5')).toHaveTextContent('Customs Declaration');
    });

    it('shows a loading skeleton while documents are being fetched', () => {
      mockedUseCustomsDocs.mockReturnValue(
        mockHook({ isLoading: true, documents: [] })
      );

      render(<CustomsDocumentationManager />);

      expect(screen.getByTestId('customs-docs-loading')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading customs documents')).toBeInTheDocument();
    });
  });

  describe('expiry warnings', () => {
    it('marks a lapsed document as expired using red styling', () => {
      mockedUseCustomsDocs.mockReturnValue(mockHook({ documents: [CERTIFICATE] }));

      render(<CustomsDocumentationManager />);

      const badge = screen.getByTestId('customs-doc-expiry-doc_4');
      expect(badge).toHaveAttribute('data-urgency', 'expired');
      expect(badge).toHaveTextContent('Expired 3 day(s) ago');
      expect(badge.className).toContain('bg-red-100');
      expect(badge.className).toContain('text-red-800');
    });

    it('marks a document expiring within 7 days as critical using orange styling', () => {
      mockedUseCustomsDocs.mockReturnValue(mockHook({ documents: [BILL_OF_LADING] }));

      render(<CustomsDocumentationManager />);

      const badge = screen.getByTestId('customs-doc-expiry-doc_3');
      expect(badge).toHaveAttribute('data-urgency', 'critical');
      expect(badge).toHaveTextContent('Expires in 4 days');
      expect(badge.className).toContain('bg-orange-100');
      expect(badge.className).toContain('text-orange-800');
    });

    it('marks a document expiring within 30 days as a warning using amber styling', () => {
      mockedUseCustomsDocs.mockReturnValue(mockHook({ documents: [PACKING_LIST] }));

      render(<CustomsDocumentationManager />);

      const badge = screen.getByTestId('customs-doc-expiry-doc_2');
      expect(badge).toHaveAttribute('data-urgency', 'warning');
      expect(badge).toHaveTextContent('Expires in 21 days');
      expect(badge.className).toContain('bg-amber-100');
      expect(badge.className).toContain('text-amber-800');
    });

    it('marks a comfortably valid document with green styling', () => {
      mockedUseCustomsDocs.mockReturnValue(mockHook({ documents: [INVOICE] }));

      render(<CustomsDocumentationManager />);

      const badge = screen.getByTestId('customs-doc-expiry-doc_1');
      expect(badge).toHaveAttribute('data-urgency', 'valid');
      expect(badge).toHaveTextContent('Expires in 120 days');
      expect(badge.className).toContain('bg-emerald-50');
      expect(badge.className).toContain('text-emerald-800');
    });

    it('renders "Does not expire" for documents with no expiry date', () => {
      mockedUseCustomsDocs.mockReturnValue(mockHook({ documents: [DECLARATION] }));

      render(<CustomsDocumentationManager />);

      const badge = screen.getByTestId('customs-doc-expiry-doc_5');
      expect(badge).toHaveTextContent('Does not expire');
      expect(badge).toHaveAttribute('data-urgency', 'valid');
    });
  });

  describe('type filter', () => {
    it('offers an option for every document type plus "All documents"', () => {
      mockedUseCustomsDocs.mockReturnValue(
        mockHook({ documents: ALL_DOCUMENTS })
      );

      render(<CustomsDocumentationManager />);

      const select = screen.getByLabelText('Filter by type');
      expect(select).toHaveValue('all');
      expect(within(select).getAllByRole('option')).toHaveLength(6);
      expect(
        within(select).getByRole('option', { name: 'All documents' })
      ).toBeInTheDocument();
    });

    it('narrows the rendered cards to the selected document type', async () => {
      const setTypeFilter = jest.fn();
      mockedUseCustomsDocs.mockReturnValue(
        mockHook({
          documents: ALL_DOCUMENTS,
          typeFilter: 'bill_of_lading',
          setTypeFilter,
        })
      );

      render(<CustomsDocumentationManager />);

      expect(screen.getByTestId('customs-doc-card-doc_3')).toBeInTheDocument();
      expect(screen.queryByTestId('customs-doc-card-doc_1')).not.toBeInTheDocument();

      await userEvent.selectOptions(
        screen.getByLabelText('Filter by type'),
        'packing_list'
      );
      expect(setTypeFilter).toHaveBeenCalledWith('packing_list');
    });

    it('shows a filter-specific empty state when no documents match', () => {
      mockedUseCustomsDocs.mockReturnValue(
        mockHook({
          documents: ALL_DOCUMENTS,
          typeFilter: 'customs_declaration',
          filteredDocuments: [],
        })
      );

      render(<CustomsDocumentationManager />);

      expect(screen.getByTestId('customs-docs-empty')).toBeInTheDocument();
      expect(screen.getByText('No documents match this filter')).toBeInTheDocument();
    });
  });

  describe('upload via dropzone', () => {
    it('uploads a dropped file with the selected document type', async () => {
      const uploadDocument = jest.fn().mockResolvedValue(undefined);
      mockedUseCustomsDocs.mockReturnValue(
        mockHook({ documents: ALL_DOCUMENTS, uploadDocument })
      );

      render(<CustomsDocumentationManager shipmentId="SW-1042" />);

      await userEvent.selectOptions(
        screen.getByLabelText('Upload as'),
        'bill_of_lading'
      );

      const file = new File(['%PDF-1.4'], 'bol.pdf', {
        type: 'application/pdf',
      });
      await userEvent.upload(
        screen.getByLabelText('Upload customs document'),
        file
      );

      expect(uploadDocument).toHaveBeenCalledTimes(1);
      expect(uploadDocument).toHaveBeenCalledWith(file, 'bill_of_lading');
    });

    it('defaults to uploading as a commercial invoice', async () => {
      const uploadDocument = jest.fn().mockResolvedValue(undefined);
      mockedUseCustomsDocs.mockReturnValue(mockHook({ uploadDocument }));

      render(<CustomsDocumentationManager />);

      const file = new File(['data'], 'invoice.png', { type: 'image/png' });
      await userEvent.upload(
        screen.getByLabelText('Upload customs document'),
        file
      );

      expect(uploadDocument).toHaveBeenCalledWith(file, 'commercial_invoice');
    });

    it('disables the dropzone and surfaces upload errors', () => {
      mockedUseCustomsDocs.mockReturnValue(
        mockHook({
          isUploading: true,
          uploadError: 'File exceeds the 10MB limit',
        })
      );

      render(<CustomsDocumentationManager />);

      expect(screen.getByText('Uploading document…')).toBeInTheDocument();
      expect(screen.getByLabelText('Upload customs document')).toBeDisabled();
      expect(screen.getByText('File exceeds the 10MB limit')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders an empty state when the API returns no documents', () => {
      mockedUseCustomsDocs.mockReturnValue(mockHook({ documents: [] }));

      render(<CustomsDocumentationManager />);

      expect(screen.getByTestId('customs-docs-empty')).toBeInTheDocument();
      expect(screen.getByText('No customs documents yet')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Upload a commercial invoice, packing list or bill of lading/
        )
      ).toBeInTheDocument();
      expect(screen.getByText('0 documents on file')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders an error alert and retries on demand', async () => {
      const refetch = jest.fn();
      mockedUseCustomsDocs.mockReturnValue(
        mockHook({
          isError: true,
          errorMessage: 'Network request failed',
          refetch,
        })
      );

      render(<CustomsDocumentationManager />);

      expect(
        screen.getByText('Failed to load customs documents')
      ).toBeInTheDocument();
      expect(screen.getByText('Network request failed')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('falls back to a generic message when the API omits an error', () => {
      mockedUseCustomsDocs.mockReturnValue(
        mockHook({ isError: true, errorMessage: null })
      );

      render(<CustomsDocumentationManager />);

      expect(
        screen.getByText('Something went wrong. Please try again.')
      ).toBeInTheDocument();
    });
  });
});

describe('useCustomsDocs', () => {
  const actual = jest.requireActual<
    typeof import('@/hooks/useCustomsDocs')
  >('@/hooks/useCustomsDocs');

  function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('days until expiry', () => {
    const now = new Date('2026-03-01T12:00:00.000Z');

    it('computes whole days remaining for a future expiry date', () => {
      expect(actual.daysUntilExpiry('2026-03-11T23:59:00.000Z', now)).toBe(10);
    });

    it('returns 0 on the expiry day itself', () => {
      expect(actual.daysUntilExpiry('2026-03-01T00:30:00.000Z', now)).toBe(0);
    });

    it('returns a negative count once the document has lapsed', () => {
      expect(actual.daysUntilExpiry('2026-02-26T09:00:00.000Z', now)).toBe(-3);
    });

    it('returns null when the document has no expiry date', () => {
      expect(actual.daysUntilExpiry(null)).toBeNull();
    });

    it('returns null for an unparseable expiry date', () => {
      expect(actual.daysUntilExpiry('not-a-date')).toBeNull();
    });

    it('buckets urgency at the 7 and 30 day thresholds', () => {
      const build = (days: number) =>
        makeDocument({
          status: 'verified',
          expiresAt: new Date(now.getTime() + days * DAY_MS).toISOString(),
        });

      expect(actual.getExpiryUrgency(build(7), now)).toBe('critical');
      expect(actual.getExpiryUrgency(build(8), now)).toBe('warning');
      expect(actual.getExpiryUrgency(build(30), now)).toBe('warning');
      expect(actual.getExpiryUrgency(build(31), now)).toBe('valid');
      expect(actual.getExpiryUrgency(build(0), now)).toBe('expired');
      expect(
        actual.getExpiryUrgency(
          makeDocument({
            status: 'expired',
            expiresAt: new Date(now.getTime() + 90 * DAY_MS).toISOString(),
          }),
          now
        )
      ).toBe('expired');
    });

    it('treats a document with no expiry date as valid', () => {
      expect(
        actual.getExpiryUrgency(makeDocument({ expiresAt: null }), now)
      ).toBe('valid');
    });
  });

  describe('fetching and filtering', () => {
    it('narrows the document list to the selected type', async () => {
      mockedService.listDocuments.mockResolvedValue([INVOICE, PACKING_LIST]);

      const { result } = renderHook(() => actual.useCustomsDocs('SW-1042'), {
        wrapper,
      });

      await waitFor(() => expect(result.current.documents).toHaveLength(2));
      expect(result.current.filteredDocuments).toHaveLength(2);

      act(() => {
        result.current.setTypeFilter('packing_list');
      });

      await waitFor(() =>
        expect(result.current.filteredDocuments).toEqual([PACKING_LIST])
      );
    });

    it('scopes the request to the given shipment id', async () => {
      mockedService.listDocuments.mockResolvedValue([]);

      renderHook(() => actual.useCustomsDocs('SW-1042'), { wrapper });

      await waitFor(() =>
        expect(mockedService.listDocuments).toHaveBeenCalledWith(
          expect.objectContaining({ shipmentId: 'SW-1042' })
        )
      );
    });

    it('surfaces an error message and exposes refetch', async () => {
      mockedService.listDocuments.mockRejectedValue(
        new Error('Service unavailable')
      );

      const { result } = renderHook(() => actual.useCustomsDocs(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.errorMessage).toBe('Service unavailable');
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('upload', () => {
    it('builds FormData from the file and type, then refreshes the list', async () => {
      mockedService.listDocuments.mockResolvedValue([INVOICE]);
      mockedService.uploadDocument.mockResolvedValue(INVOICE);

      const appendSpy = jest.spyOn(FormData.prototype, 'append');

      const { result } = renderHook(() => actual.useCustomsDocs('SW-1042'), {
        wrapper,
      });
      await waitFor(() => expect(result.current.documents).toHaveLength(1));

      const file = new File(['%PDF-1.4'], 'bol.pdf', {
        type: 'application/pdf',
      });

      await result.current.uploadDocument(file, 'bill_of_lading');

      expect(mockedService.uploadDocument).toHaveBeenCalledTimes(1);
      const sent = mockedService.uploadDocument.mock.calls[0][0];
      expect(sent).toBeInstanceOf(FormData);
      expect(sent.get('document')).toBe(file);
      expect(sent.get('documentType')).toBe('bill_of_lading');
      expect(sent.get('shipmentId')).toBe('SW-1042');

      expect(appendSpy).toHaveBeenCalledWith('document', file);
      expect(appendSpy).toHaveBeenCalledWith('documentType', 'bill_of_lading');

      appendSpy.mockRestore();
    });

    it('omits shipmentId when the hook has no shipment scope', async () => {
      mockedService.listDocuments.mockResolvedValue([]);
      mockedService.uploadDocument.mockResolvedValue(INVOICE);

      const { result } = renderHook(() => actual.useCustomsDocs(), { wrapper });
      await waitFor(() => expect(mockedService.listDocuments).toHaveBeenCalled());

      const file = new File(['data'], 'x.png', { type: 'image/png' });
      await result.current.uploadDocument(file, 'packing_list');

      const sent = mockedService.uploadDocument.mock.calls[0][0];
      expect(sent.get('shipmentId')).toBeNull();
    });

    it('exposes an upload error message when the request fails', async () => {
      mockedService.listDocuments.mockResolvedValue([]);
      mockedService.uploadDocument.mockRejectedValue(
        new Error('File exceeds the 10MB limit')
      );

      const { result } = renderHook(() => actual.useCustomsDocs(), { wrapper });
      await waitFor(() => expect(mockedService.listDocuments).toHaveBeenCalled());

      const file = new File(['data'], 'x.pdf', { type: 'application/pdf' });
      await result.current
        .uploadDocument(file, 'commercial_invoice')
        .catch(() => undefined);

      await waitFor(() =>
        expect(result.current.uploadError).toBe('File exceeds the 10MB limit')
      );
      expect(result.current.isUploading).toBe(false);

      act(() => {
        result.current.clearUploadError();
      });
      await waitFor(() => expect(result.current.uploadError).toBeNull());
    });

    it('exposes expiry helpers bound to the current date', async () => {
      mockedService.listDocuments.mockResolvedValue([INVOICE]);

      const { result } = renderHook(() => actual.useCustomsDocs(), { wrapper });
      await waitFor(() => expect(result.current.documents).toHaveLength(1));

      expect(result.current.daysUntilExpiry(INVOICE)).toBe(120);
      expect(result.current.getExpiryUrgency(INVOICE)).toBe('valid');
    });

    it('re-fetches the list when refetch is invoked', async () => {
      mockedService.listDocuments.mockResolvedValue([]);

      const { result } = renderHook(() => actual.useCustomsDocs(), { wrapper });
      await waitFor(() =>
        expect(mockedService.listDocuments).toHaveBeenCalledTimes(1)
      );

      act(() => {
        result.current.refetch();
      });

      await waitFor(() =>
        expect(mockedService.listDocuments).toHaveBeenCalledTimes(2)
      );
    });
  });
});
