'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import type { UploadCSVResponse } from '@/types/import';

interface CSVUploadProps {
  onUploadComplete: (result: UploadCSVResponse) => void;
  onError: (error: Error) => void;
}

export default function CSVUpload({ onUploadComplete, onError }: CSVUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.timeout = 65_000; // 65s to match server maxDuration
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const response: UploadCSVResponse = JSON.parse(xhr.responseText);
        onUploadComplete(response);
      } else {
        setError('Upload failed');
        onError(new Error('Upload failed'));
      }
      setIsUploading(false);
    });

    xhr.addEventListener('error', () => {
      setError('Upload failed');
      onError(new Error('Upload failed'));
      setIsUploading(false);
    });

    xhr.addEventListener('timeout', () => {
      setError('Upload timed out. Try a smaller file (under 2MB recommended).');
      onError(new Error('Upload timed out'));
      setIsUploading(false);
    });

    xhr.open('POST', '/api/import/upload');
    xhr.send(formData);
  }, [onUploadComplete, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-accent-primary bg-accent-primary/5' : 'border-border-light hover:border-accent-primary/50'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div>
            <div className="text-lg font-medium text-text-primary mb-2">Uploading...</div>
            <div className="text-2xl font-semibold text-accent-primary">{uploadProgress}%</div>
          </div>
        ) : (
          <div>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-lg font-medium text-text-primary mb-2">Drag and drop your CSV file here</p>
            <p className="text-sm text-text-secondary">or click to browse</p>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
