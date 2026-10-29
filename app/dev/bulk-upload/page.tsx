'use client';

import React, { useState } from 'react';
import { BulkUploadZone } from '@/components/shipment/BulkUploadZone';

/**
 * Development page for testing BulkUploadZone component.
 * 
 * This page demonstrates the drag-and-drop file upload functionality
 * for bulk CSV/XLSX imports with:
 * - File validation (CSV/XLSX only)
 * - Preview generation (first 3 rows)
 * - Upload state management
 * - Error handling with toast notifications
 * 
 * Access at: http://localhost:3000/dev/bulk-upload
 */
export default function BulkUploadDevPage() {
  const [uploadedCount, setUploadedCount] = useState(0);
  const [selectedFileType, setSelectedFileType] = useState<'shipments' | 'deliveries' | 'orders'>(
    'shipments',
  );

  const handleUploadComplete = (uploadId: string) => {
    setUploadedCount((prev) => prev + 1);
    console.log('Upload completed:', uploadId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            Bulk Upload Zone - Dev Testing
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Test the drag-and-drop file upload component for bulk CSV/XLSX imports
          </p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Configuration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Upload Type:
              </label>
              <div className="flex gap-4">
                {(['shipments', 'deliveries', 'orders'] as const).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fileType"
                      value={type}
                      checked={selectedFileType === type}
                      onChange={(e) => setSelectedFileType(e.target.value as any)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {uploadedCount > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-800 dark:text-green-200 text-sm">
                ✓ {uploadedCount} upload{uploadedCount > 1 ? 's' : ''} completed successfully
              </div>
            )}
          </div>
        </div>

        {/* Upload Zone */}
        <BulkUploadZone
          fileType={selectedFileType}
          onUploadComplete={handleUploadComplete}
          maxFiles={5}
        />

        {/* Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">📋 CSV Format</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Use comma-separated values with a header row:
            </p>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
              <div>name,email,phone</div>
              <div>John Doe,john@example.com,555-1234</div>
              <div>Jane Smith,jane@example.com,555-5678</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">📊 XLSX Format</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Excel files with headers in the first row:
            </p>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded text-xs text-slate-700 dark:text-slate-300">
              <div className="font-semibold mb-2">Sheet 1 (first sheet will be used)</div>
              <table className="w-full text-left border-collapse">
                <tbody>
                  <tr className="border-b">
                    <td className="border-r pr-2">name</td>
                    <td className="border-r px-2">email</td>
                    <td className="pl-2">phone</td>
                  </tr>
                  <tr>
                    <td className="border-r pr-2">John</td>
                    <td className="border-r px-2">john@...</td>
                    <td className="pl-2">555-1234</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">✨ Features</h3>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <li>✓ Drag & drop support</li>
              <li>✓ CSV & XLSX validation</li>
              <li>✓ Preview first 3 rows</li>
              <li>✓ File size limit: 50MB</li>
              <li>✓ Max files: 5</li>
              <li>✓ Error handling</li>
            </ul>
          </div>
        </div>

        {/* Test Cases */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            💡 Test Cases
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Valid CSV Upload</p>
                <p className="text-slate-600 dark:text-slate-400">
                  Drag a CSV file with headers and data rows
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Valid XLSX Upload</p>
                <p className="text-slate-600 dark:text-slate-400">
                  Drag an XLSX file with properly formatted data
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-xl">❌</span>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Invalid File Type</p>
                <p className="text-slate-600 dark:text-slate-400">
                  Try uploading a PNG, PDF, or other non-CSV/XLSX file (should show error)
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-xl">❌</span>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Empty File</p>
                <p className="text-slate-600 dark:text-slate-400">
                  Try uploading a CSV with no data rows (should show error)
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-xl">📤</span>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Preview Display</p>
                <p className="text-slate-600 dark:text-slate-400">
                  Verify that the first 3 rows are displayed in a preview table
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-xl">📊</span>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Column Metadata</p>
                <p className="text-slate-600 dark:text-slate-400">
                  Verify that row count and column names are correctly displayed
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Development Notes */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
            ℹ️ Development Notes
          </h2>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
            <li>
              <strong>Component Location:</strong>{' '}
              <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                components/shipment/BulkUploadZone.tsx
              </code>
            </li>
            <li>
              <strong>Hook Location:</strong>{' '}
              <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                hooks/useBulkUploadZone.ts
              </code>
            </li>
            <li>
              <strong>Service Location:</strong>{' '}
              <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                services/bulkUploadService.ts
              </code>
            </li>
            <li>
              <strong>Tests:</strong> Full unit and integration test coverage included
            </li>
            <li>
              <strong>API Endpoint:</strong>{' '}
              <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                POST /api/upload/bulk-csv
              </code>{' '}
              - Update this endpoint in bulkUploadService if different
            </li>
            <li>
              <strong>Architecture:</strong> Component → Hook → Service pattern
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
