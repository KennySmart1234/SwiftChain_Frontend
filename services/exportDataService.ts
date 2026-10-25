import api from '@/lib/api';

export interface ExportDataResponse {
  success: boolean;
  message?: string;
  data?: {
    user: Record<string, unknown>;
    deliveries: Record<string, unknown>[];
    transactions: Record<string, unknown>[];
    disputes: Record<string, unknown>[];
  };
}

/**
 * exportDataService — handles GDPR-compliant data export.
 * Retrieves all user account and delivery data for download.
 */
export const exportDataService = {
  /**
   * Fetches all user data for export.
   * Returns account information, deliveries, transactions, and disputes.
   */
  async exportUserData(): Promise<ExportDataResponse> {
    try {
      const { data } = await api.get<ExportDataResponse>('/api/export/user-data');
      return data;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to export data',
      };
    }
  },

  /**
   * Generates a downloadable JSON blob from API response data.
   * @param data - The exported data object
   * @param filename - Name for the downloaded file
   */
  generateAndDownloadJSON(data: Record<string, unknown>, filename: string = 'swiftchain-data.json'): void {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to generate download');
    }
  },
  /**
   * Serialises rows to RFC 4180 CSV. Values starting with a formula character
   * are prefixed with a quote to prevent spreadsheet formula injection.
   */
  toCsv(rows: Record<string, unknown>[], columns: string[]): string {
    const escape = (value: unknown): string => {
      let text = value === null || value === undefined ? '' : String(value);
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const header = columns.map(escape).join(',');
    const lines = rows.map((row) => columns.map((c) => escape(row[c])).join(','));
    return [header, ...lines].join('\n');
  },

  /**
   * Exports the given rows as a downloadable CSV file.
   */
  exportToCsv(
    rows: Record<string, unknown>[],
    columns: string[],
    filename: string = 'swiftchain-export.csv'
  ): void {
    const blob = new Blob([exportDataService.toCsv(rows, columns)], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
