import api from '@/lib/api';
import { auditService } from '@/services/auditService';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('auditService.getAuditEvents', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests the first page without a cursor', async () => {
    const page = { events: [], nextCursor: 'c2', totalCount: 0 };
    mockedApi.get.mockResolvedValueOnce({ data: page });

    await expect(auditService.getAuditEvents({ cursor: null, limit: 25 })).resolves.toEqual(page);
    expect(mockedApi.get).toHaveBeenCalledWith('/api/audit/events', { params: { limit: 25 } });
  });

  it('passes the cursor for subsequent pages', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { events: [], nextCursor: null, totalCount: 0 } });

    await auditService.getAuditEvents({ cursor: 'c2', limit: 10 });
    expect(mockedApi.get).toHaveBeenCalledWith('/api/audit/events', { params: { limit: 10, cursor: 'c2' } });
  });

  it('propagates API errors to the caller', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'));
    await expect(auditService.getAuditEvents({ limit: 10 })).rejects.toThrow('Network Error');
  });
});
