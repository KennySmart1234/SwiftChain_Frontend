import api from '@/lib/api';
import { adminRefundService } from '@/services/adminRefundService';
import { exportDataService } from '@/services/exportDataService';

jest.mock('@/lib/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const mockApi = api as unknown as { get: jest.Mock; post: jest.Mock };

describe('adminRefundService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('builds query params and omits empty filters', () => {
    expect(adminRefundService.buildParams({ status: 'all', search: '  ' })).toEqual({ limit: 20 });
    expect(
      adminRefundService.buildParams(
        { status: 'pending', dateFrom: '2026-01-01', dateTo: '2026-02-01', search: ' x ' },
        'cur',
        10
      )
    ).toEqual({
      limit: 10,
      status: 'pending',
      dateFrom: '2026-01-01',
      dateTo: '2026-02-01',
      search: 'x',
      cursor: 'cur',
    });
  });

  it('fetches refunds from /admin/refunds with filters as query params', async () => {
    const payload = { refunds: [], pagination: { nextCursor: null, total: 0, limit: 20 } };
    mockApi.get.mockResolvedValue({ data: { success: true, data: payload } });
    await expect(adminRefundService.getRefunds({ status: 'approved' })).resolves.toEqual(payload);
    expect(mockApi.get).toHaveBeenCalledWith('/admin/refunds', {
      params: { limit: 20, status: 'approved' },
    });
  });

  it('throws the server message when the response is unsuccessful', async () => {
    mockApi.get.mockResolvedValue({ data: { success: false, message: 'nope' } });
    await expect(adminRefundService.getRefunds({})).rejects.toThrow('nope');
  });

  it('posts ids for bulk review', async () => {
    mockApi.post.mockResolvedValue({
      data: { success: true, data: { successCount: 1, errorCount: 0 } },
    });
    await expect(adminRefundService.bulkMarkReviewed(['a'])).resolves.toEqual({
      successCount: 1,
      errorCount: 0,
    });
    expect(mockApi.post).toHaveBeenCalledWith('/admin/refunds/bulk-review', { ids: ['a'] });
  });

  it('throws when bulk review is unsuccessful', async () => {
    mockApi.post.mockResolvedValue({ data: { success: false } });
    await expect(adminRefundService.bulkMarkReviewed(['a'])).rejects.toThrow(
      'Failed to mark refunds as reviewed'
    );
  });

  it('fetches a timeline with an encoded id', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true, data: { events: [] } } });
    await adminRefundService.getRefundTimeline('a/b');
    expect(mockApi.get).toHaveBeenCalledWith('/admin/refunds/a%2Fb/timeline');
  });

  it('throws when the timeline request is unsuccessful', async () => {
    mockApi.get.mockResolvedValue({ data: { success: false } });
    await expect(adminRefundService.getRefundTimeline('a')).rejects.toThrow(
      'Failed to fetch refund timeline'
    );
  });
});

describe('exportDataService CSV export', () => {
  it('writes a header and escapes commas, quotes and newlines', () => {
    const csv = exportDataService.toCsv(
      [{ a: 'x,y', b: 'say "hi"', c: 'l1\nl2' }],
      ['a', 'b', 'c']
    );
    expect(csv).toBe('a,b,c\n"x,y","say ""hi""","l1\nl2"');
  });

  it('neutralises spreadsheet formula injection', () => {
    const csv = exportDataService.toCsv([{ a: '=SUM(A1)', b: '@cmd' }], ['a', 'b']);
    expect(csv).toBe("a,b\n'=SUM(A1),'@cmd");
  });

  it('renders null and undefined as empty cells', () => {
    expect(exportDataService.toCsv([{ a: null }], ['a', 'b'])).toBe('a,b\n,');
  });

  it('downloads a CSV file via an anchor element', () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    exportDataService.exportToCsv([{ a: 1 }], ['a'], 'out.csv');
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
