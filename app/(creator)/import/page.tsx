'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import CSVUpload from '@/components/forms/CSVUpload';
import type { ImportStep, UploadCSVResponse } from '@/types/import';


export default function ImportPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<ImportStep>('UPLOAD');
  const [fileId, setFileId] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUploadComplete = async (result: UploadCSVResponse) => {
    setFileId(result.fileId);
    setIsProcessing(true);

    try {
      // Use AbortController to allow up to 55s (server has 60s maxDuration)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55_000);

      const response = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: result.fileId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to parse CSV');
      }

      const data = await response.json();
      setParseResult(data);
      
      // Save locations to localStorage for setup page
      if (data.locations && Array.isArray(data.locations)) {
        localStorage.setItem('importedLocations', JSON.stringify(data.locations));
      }
      
      // Show preview inline (no step change needed)
    } catch (error) {
      console.error('Parse error:', error);
      const message = error instanceof Error 
        ? (error.name === 'AbortError' 
          ? 'Request timed out. Try a smaller CSV file (under 2MB recommended).' 
          : error.message)
        : 'Failed to parse CSV';
      alert('Failed to parse CSV: ' + message);
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center">
          <h1 className="text-5xl font-serif font-semibold text-text-primary mb-4">
            Import Locations
          </h1>
          <p className="text-lg text-text-secondary">
            Upload your Google Maps saved places CSV file
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-bg-secondary border border-border-light rounded-lg p-8">
          <h2 className="text-2xl font-serif font-semibold mb-6">Upload Your CSV File</h2>
          <CSVUpload
            onUploadComplete={handleUploadComplete}
            onError={(error) => alert('Upload failed: ' + error.message)}
          />
          
          {isProcessing && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-sm text-blue-800 font-medium">Parsing your CSV...</p>
              <p className="text-xs text-blue-600 mt-1">Large files may take 30–60 seconds</p>
            </div>
          )}
        </div>

        {/* Preview Section - Shows inline after upload */}
        {parseResult && (
          <div className="space-y-6">
            <div className="bg-bg-secondary border border-border-light rounded-lg p-8">
              <h2 className="text-2xl font-serif font-semibold mb-6">Preview</h2>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-bg-tertiary rounded-lg p-4">
                  <div className="text-sm text-text-tertiary mb-1">Total Rows</div>
                  <div className="text-3xl font-serif font-semibold">{parseResult.totalRows}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-700 mb-1">Valid</div>
                  <div className="text-3xl font-serif font-semibold text-green-700">{parseResult.validRows}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm text-red-700 mb-1">Invalid</div>
                  <div className="text-3xl font-serif font-semibold text-red-700">{parseResult.invalidRows}</div>
                </div>
              </div>

              <div className="border border-border-light rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-bg-tertiary">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">Note</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {parseResult.locations.slice(0, 10).map((location: any, idx: number) => (
                      <tr key={idx} className="hover:bg-bg-tertiary/50">
                        <td className="px-4 py-3 text-sm text-text-primary">{location.Title}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{location.Note || '—'}</td>
                        <td className="px-4 py-3 text-sm text-text-tertiary truncate max-w-xs">{location.URL || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <button
                  onClick={() => {
                    setParseResult(null);
                    setFileId(null);
                  }}
                  className="px-6 py-3 border border-border-light rounded-lg hover:bg-bg-tertiary"
                >
                  ← Upload Different File
                </button>
                <button
                  onClick={() => router.push('/setup')}
                  className="px-8 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary font-semibold"
                >
                  Looks Good →
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
