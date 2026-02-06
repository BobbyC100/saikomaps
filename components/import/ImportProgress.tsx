/**
 * Import Progress Component
 * Real-time progress tracking for CSV import
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ImportProgress as ImportProgressType } from '@/types'

interface ImportProgressProps {
  jobId: string
  onComplete: (listId: string, slug: string) => void
}

export function ImportProgress({ jobId, onComplete }: ImportProgressProps) {
  const [progress, setProgress] = useState<ImportProgressType | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/import/status/${jobId}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to check import status')
        }

        const jobData = result.data
        setProgress(jobData)

        // If completed, stop polling and trigger callback
        if (jobData.status === 'completed') {
          clearInterval(interval)
          setTimeout(() => {
            onComplete(jobData.list.id, jobData.list.slug)
          }, 1000)
        }

        // If failed, stop polling and show error
        if (jobData.status === 'failed') {
          clearInterval(interval)
          setError('Import failed. Please try again.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        clearInterval(interval)
      }
    }

    // Initial check
    checkStatus()

    // Poll every 2 seconds
    interval = setInterval(checkStatus, 2000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [jobId, onComplete])

  if (error) {
    return (
      <Card variant="bordered">
        <CardContent className="py-12 text-center">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <div className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Import Failed
          </div>
          <div className="text-[var(--text-secondary)]">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!progress) {
    return (
      <Card variant="bordered">
        <CardContent className="py-12 text-center">
          <div className="animate-spin h-12 w-12 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full mx-auto"></div>
          <div className="mt-4 text-[var(--text-secondary)]">
            Initializing import...
          </div>
        </CardContent>
      </Card>
    )
  }

  const isComplete = progress.status === 'completed'
  const percentage = progress.percentage || 0

  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle>
          {isComplete ? '✓ Import Complete!' : 'Importing Locations...'}
        </CardTitle>
        <CardDescription>
          {isComplete
            ? 'Your guide has been created successfully'
            : 'Enriching locations with Google Places data'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--text-secondary)]">
                {progress.processedLocations} of {progress.totalLocations} locations
              </span>
              <span className="font-medium text-[var(--accent-primary)]">
                {percentage}%
              </span>
            </div>
            <div className="w-full h-4 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {progress.processedLocations}
              </div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">
                Processed
              </div>
            </div>
            
            {progress.failedLocations > 0 && (
              <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {progress.failedLocations}
                </div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">
                  Failed
                </div>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {isComplete ? (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                🎉 All locations have been imported and enriched with photos, hours, and details!
              </p>
            </div>
          ) : (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ⏳ This may take a few minutes. We're fetching data from Google Places API...
              </p>
            </div>
          )}

          {/* Error Log */}
          {progress.errorLog && Array.isArray(progress.errorLog) && progress.errorLog.length > 0 && (
            <div className="mt-4">
              <details className="text-sm">
                <summary className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  View errors ({progress.errorLog.length})
                </summary>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {progress.errorLog.map((error: any, index: number) => (
                    <div
                      key={index}
                      className="p-2 bg-[var(--bg-tertiary)] rounded text-xs"
                    >
                      <div className="font-medium">{error.location}</div>
                      <div className="text-[var(--text-tertiary)]">{error.error}</div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* Completion Action */}
          {isComplete && progress.list && (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => onComplete(progress.list!.id, progress.list!.slug)}
            >
              View Your Guide →
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

