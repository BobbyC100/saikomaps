'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center p-8">
          <h2 className="text-xl font-semibold text-[#2D2D2D] mb-2">
            Something went wrong
          </h2>
          <p className="text-[#6B6B6B] mb-6 text-center max-w-md">
            {error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#E07A5F' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
