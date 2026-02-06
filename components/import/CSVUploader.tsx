/**
 * CSV Uploader Component
 * Drag-and-drop file upload for CSV import
 */

'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ImportPreview } from '@/types'

interface CSVUploaderProps {
  onPreview: (preview: ImportPreview) => void
  isLoading?: boolean
}

export function CSVUploader({ onPreview, isLoading }: CSVUploaderProps) {
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null)
    
    if (acceptedFiles.length === 0) {
      setError('Please upload a CSV file')
      return
    }

    const uploadedFile = acceptedFiles[0]
    setFile(uploadedFile)

    // Preview the CSV
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)

      const response = await fetch('/api/import/preview', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to preview CSV')
      }

      onPreview(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview CSV')
    }
  }, [onPreview])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
    disabled: isLoading,
  })

  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle>Upload Google Takeout CSV</CardTitle>
        <CardDescription>
          Import your saved places from Google Maps
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-colors
            ${isDragActive 
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5' 
              : 'border-[var(--border-color)] hover:border-[var(--accent-primary)]'
            }
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            {/* Upload Icon */}
            <div className="mx-auto w-16 h-16 text-[var(--text-tertiary)]">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            {file ? (
              <>
                <div className="text-[var(--text-primary)] font-medium">
                  ✓ {file.name}
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Drop a different file or click to change
                </p>
              </>
            ) : (
              <>
                <div className="text-[var(--text-primary)] font-medium">
                  {isDragActive ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  or click to browse
                </p>
              </>
            )}

            <div className="text-xs text-[var(--text-tertiary)]">
              Supports .csv files up to 10MB
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              {error}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 space-y-3 text-sm text-[var(--text-secondary)]">
          <div className="font-medium text-[var(--text-primary)]">
            How to get your Google Takeout CSV:
          </div>
          <ol className="list-decimal list-inside space-y-2 pl-2">
            <li>Go to <a href="https://takeout.google.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline">Google Takeout</a></li>
            <li>Select "Saved" (under Google Maps)</li>
            <li>Click "Next" and choose "Export once"</li>
            <li>Download and extract the zip file</li>
            <li>Upload the "Saved Places.csv" file here</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}

