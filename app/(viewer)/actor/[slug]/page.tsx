'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { GlobalHeader } from '@/components/layouts/GlobalHeader';
import { GlobalFooter } from '@/components/layouts/GlobalFooter';

interface ActorPlace {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  neighborhood: string | null;
}

interface ActorPageData {
  actor: {
    id: string;
    name: string;
    slug: string | null;
    website: string | null;
    description: string | null;
  };
  places: ActorPlace[];
}

export default function ActorPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<ActorPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not-found' | 'server-error' | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/actors/${slug}`, {
      cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'default',
      headers: process.env.NODE_ENV === 'development' ? { 'Cache-Control': 'no-cache' } : undefined,
    })
      .then(async (res) => {
        if (res.status === 404) {
          setError('not-found');
          return null;
        }
        if (!res.ok) {
          setError('server-error');
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json?.success && json?.data) setData(json.data);
        else if (json === null) {}
        else setError('not-found');
      })
      .catch((err) => {
        console.error('Failed to load actor:', err);
        setError('server-error');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E1' }}>
        <GlobalHeader variant="immersive" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#C3B091] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p style={{ color: '#36454F', opacity: 0.7 }}>Loading...</p>
          </div>
        </main>
        <GlobalFooter variant="minimal" />
      </div>
    );
  }

  if (error === 'not-found' || !data) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E1' }}>
        <GlobalHeader variant="immersive" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <h1 className="text-[#36454F] text-2xl font-semibold mb-3">Operator Not Found</h1>
            <p className="text-[#36454F] opacity-70 mb-6">
              We couldn&apos;t find an operator with the slug &quot;{slug}&quot;.
            </p>
            <Link href="/" className="inline-block px-6 py-3 bg-[#C3B091] text-white rounded-lg hover:bg-[#B39F7F] transition-colors">
              Browse Maps
            </Link>
          </div>
        </main>
        <GlobalFooter variant="minimal" />
      </div>
    );
  }

  const { actor, places } = data;
  const operatorPlaces = places;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E1' }}>
      <GlobalHeader variant="immersive" />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <div className="mb-8">
          <h1 className="text-[#36454F] text-2xl md:text-3xl font-semibold mb-2">{actor.name}</h1>
          {actor.description && (
            <p className="text-[#36454F] opacity-80 leading-relaxed">{actor.description}</p>
          )}
          {actor.website && (
            <a
              href={actor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-[#C3B091] hover:underline"
            >
              {actor.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          )}
        </div>

        <section>
          <h2 className="text-[#36454F] text-lg font-medium mb-4">
            Places ({operatorPlaces.length})
          </h2>
          {operatorPlaces.length === 0 ? (
            <p className="text-[#36454F] opacity-70">No places linked yet.</p>
          ) : (
            <ul className="space-y-3">
              {operatorPlaces.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/place/${p.slug}`}
                    className="block p-4 rounded-lg bg-white/60 hover:bg-white/80 transition-colors border border-[#e8e2d8]"
                  >
                    <span className="font-medium text-[#36454F]">{p.name}</span>
                    {(p.category || p.neighborhood) && (
                      <span className="ml-2 text-sm opacity-70">
                        {[p.category, p.neighborhood].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <GlobalFooter variant="minimal" />
    </div>
  );
}
