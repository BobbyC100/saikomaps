'use client';

import { useState } from 'react';
import AddLocationModal from '@/components/AddLocationModal';

export default function TestAddLocationPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Only accessible in development
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    window.location.href = '/';
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Test Add Location Feature
        </h1>
        
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="font-semibold text-blue-900 mb-2">Demo Mode - How to test:</h2>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Click the &quot;Add Location&quot; button below</li>
            <li>Try pasting a Google Maps URL (get one from google.com/maps)</li>
            <li>Or try searching for a place (e.g., &quot;Bacchanal New Orleans&quot;)</li>
            <li>Select a place and click &quot;Add to Guide&quot; (won&apos;t actually save in demo mode)</li>
          </ol>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-coral-500 hover:bg-coral-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            style={{ backgroundColor: '#f59e8d' }}
          >
            🗺️ Add Location
          </button>

          <div className="text-center text-sm text-gray-500">
            Using test list slug: <code className="bg-gray-100 px-2 py-1 rounded">test-guide</code>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Example URLs to try:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 break-all">
                https://www.google.com/maps/place/Bacchanal+Fine+Wine+%26+Spirits
              </code>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-500">•</span>
              <span className="text-gray-600">Or search: &quot;Blue Bottle Coffee San Francisco&quot;</span>
            </div>
          </div>
        </div>
      </div>

      <AddLocationModal
        listSlug="test-guide"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          alert('✅ Demo successful! In production, this would save to the database.\n\nLocation: ' + (document.querySelector('[data-place-name]')?.textContent || 'Selected place'));
        }}
      />
    </div>
  );
}
