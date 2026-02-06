/**
 * Import Preview Card Component
 * Shows preview of parsed CSV before import
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ImportPreview } from '@/types'

interface ImportPreviewCardProps {
  preview: ImportPreview
  onConfirm: (data: { listTitle: string; templateType: string }) => void
  isProcessing: boolean
}

export function ImportPreviewCard({ preview, onConfirm, isProcessing }: ImportPreviewCardProps) {
  const [listTitle, setListTitle] = useState('')
  const [templateType, setTemplateType] = useState<'city_guide' | 'travel_itinerary' | 'minimalist'>('city_guide')

  const handleConfirm = () => {
    if (!listTitle.trim()) {
      alert('Please enter a title for your guide')
      return
    }
    onConfirm({ listTitle, templateType })
  }

  return (
    <div className="space-y-6">
      {/* Preview Stats */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Import Preview</CardTitle>
          <CardDescription>
            Review your locations before importing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="text-3xl font-bold text-[var(--accent-primary)]">
                {preview.totalRows}
              </div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">
                Total Rows
              </div>
            </div>
            
            <div className="text-center p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {preview.validRows}
              </div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">
                Valid Locations
              </div>
            </div>
            
            <div className="text-center p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="text-3xl font-bold text-orange-600">
                {preview.duplicates}
              </div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">
                Duplicates
              </div>
            </div>
            
            <div className="text-center p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <div className="text-3xl font-bold text-[var(--accent-primary)]">
                ${preview.costEstimate?.totalCost || 0}
              </div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">
                Est. API Cost
              </div>
            </div>
          </div>

          {/* Location Preview List */}
          <div className="mt-6">
            <div className="text-sm font-medium text-[var(--text-primary)] mb-3">
              Location Preview (first 5):
            </div>
            <div className="space-y-2">
              {preview.locations.slice(0, 5).map((location, index) => (
                <div 
                  key={index}
                  className="p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg"
                >
                  <div className="font-medium text-[var(--text-primary)]">
                    {location.name}
                  </div>
                  {location.address && (
                    <div className="text-sm text-[var(--text-secondary)] mt-1">
                      {location.address}
                    </div>
                  )}
                  {location.comment && (
                    <div className="text-sm text-[var(--text-tertiary)] mt-1 italic">
                      "{location.comment}"
                    </div>
                  )}
                </div>
              ))}
            </div>
            {preview.locations.length > 5 && (
              <div className="text-sm text-[var(--text-secondary)] mt-3 text-center">
                + {preview.locations.length - 5} more locations
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Configure Your Guide</CardTitle>
          <CardDescription>
            Choose a title and template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* List Title */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Guide Title *
              </label>
              <input
                type="text"
                value={listTitle}
                onChange={(e) => setListTitle(e.target.value)}
                placeholder="e.g., Best Coffee Shops in SF"
                className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] text-[var(--text-primary)]"
                disabled={isProcessing}
              />
            </div>

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Template Style
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: 'city_guide', label: 'City Guide', icon: '🏙️', desc: 'Organized by category' },
                  { value: 'travel_itinerary', label: 'Travel Itinerary', icon: '✈️', desc: 'Day-by-day timeline' },
                  { value: 'minimalist', label: 'Minimalist', icon: '✨', desc: 'Simple list' },
                ].map((template) => (
                  <button
                    key={template.value}
                    type="button"
                    onClick={() => setTemplateType(template.value as any)}
                    disabled={isProcessing}
                    className={`
                      p-4 rounded-lg border-2 text-left transition-all
                      ${templateType === template.value
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                        : 'border-[var(--border-color)] hover:border-[var(--accent-primary)]'
                      }
                    `}
                  >
                    <div className="text-2xl mb-2">{template.icon}</div>
                    <div className="font-medium text-[var(--text-primary)]">
                      {template.label}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      {template.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="primary"
                size="lg"
                onClick={handleConfirm}
                isLoading={isProcessing}
                disabled={!listTitle.trim() || isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Processing...' : `Import ${preview.validRows} Locations`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

