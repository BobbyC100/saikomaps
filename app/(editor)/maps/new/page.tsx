'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewMapPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreating || error) return;

    const createAndRedirect = async () => {
      setIsCreating(true);
      setError(null);
      try {
        const res = await fetch('/api/maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: '' }),
        });

        const json = await res.json();
        if (!res.ok) {
          const msg = json.details ? `${json.error}: ${json.details}` : (json.error || 'Failed to create map');
          throw new Error(msg);
        }

        router.replace(`/maps/${json.data.id}/edit`);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to create map');
        setIsCreating(false);
      }
    };

    createAndRedirect();
  }, [router, isCreating, error]);

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--parchment)] flex items-center justify-center p-6" suppressHydrationWarning>
        <div className="text-center max-w-md">
          <p className="text-[var(--error)] mb-4">{error}</p>
          <p className="text-sm text-[var(--charcoal)]/60 mb-4">
            If the database isn&apos;t set up, run: <code className="bg-[var(--warm-white)] px-1 rounded-xl">npm run db:seed-demo</code>
          </p>
          <Link href="/" className="text-[var(--charcoal)] hover:text-[var(--charcoal)]/80 font-medium text-sm">Go home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--parchment)] flex items-center justify-center" suppressHydrationWarning>
      <p className="text-[var(--charcoal)]/60">Creating your map...</p>
    </div>
  );
}
