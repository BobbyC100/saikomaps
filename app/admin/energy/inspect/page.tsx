/**
 * Admin Energy Inspect — CTO Spec §9
 * Lookup by place_id (or slug): energy components, tag scores, version, confidence
 */

import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminEnergyInspectPage({ searchParams }: Props) {
  const { q } = await searchParams;

  if (!q?.trim()) {
    return (
      <div className="min-h-screen bg-[#F5F0E1] py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <header className="mb-10">
            <Link href="/admin/energy" className="text-[#5BA7A7] hover:underline text-sm mb-4 inline-block">
              ← Energy Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-[#36454F] mb-2">Inspect Place</h1>
            <p className="text-[#8B7355]">Enter place slug or ID</p>
          </header>

          <form action="/admin/energy/inspect" method="GET" className="flex gap-3">
            <input
              name="q"
              type="text"
              placeholder="e.g. uovo-pasadena-pasadena"
              className="flex-1 px-4 py-2 rounded-lg border border-[#C3B091]/40 bg-white text-[#36454F]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#5BA7A7] text-white rounded-lg hover:opacity-90"
            >
              Lookup
            </button>
          </form>
        </div>
      </div>
    );
  }

  const query = q.trim();
  const isUuid = /^[0-9a-f-]{36}$/i.test(query);

  const place = await db.entities.findFirst({
    where: isUuid ? { id: query } : { slug: query },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  if (!place) {
    return (
      <div className="min-h-screen bg-[#F5F0E1] py-12 px-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/admin/energy" className="text-[#5BA7A7] hover:underline text-sm mb-4 inline-block">
            ← Energy Dashboard
          </Link>
          <p className="text-[#8B7355]">Place not found: {q}</p>
          <Link href="/admin/energy/inspect" className="text-[#5BA7A7] hover:underline mt-4 inline-block">
            Try another
          </Link>
        </div>
      </div>
    );
  }

  const [energy, tags] = await Promise.all([
    db.energy_scores.findUnique({
      where: { entityId_version: { entityId: place.id, version: 'energy_v1' } },
    }),
    db.place_tag_scores.findUnique({
      where: { entityId_version: { entityId: place.id, version: 'tags_v1' } },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#F5F0E1] py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/energy" className="text-[#5BA7A7] hover:underline text-sm mb-4 inline-block">
          ← Energy Dashboard
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl font-bold text-[#36454F]">{place.name}</h1>
          <p className="text-[#8B7355] text-sm">{place.slug}</p>
        </header>

        <div className="space-y-8">
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#36454F] mb-4">Energy Score</h2>
            {energy ? (
              <div className="space-y-2 text-[#36454F]">
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Score</span>
                  <span className="font-mono font-bold">{energy.energy_score}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Confidence</span>
                  <span className="font-mono">{energy.energy_confidence}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Popularity</span>
                  <span className="font-mono">{energy.popularity_component ?? '—'} {energy.has_popularity && '✓'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Language</span>
                  <span className="font-mono">{energy.language_component ?? '—'} {energy.has_language && '✓'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Flags</span>
                  <span className="font-mono">{energy.flags_component ?? '—'} {energy.has_flags && '✓'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Sensory</span>
                  <span className="font-mono">{energy.sensory_component ?? '—'} {energy.has_sensory && '✓'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8B7355]">Version</span>
                  <span>{energy.version}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8B7355]">Computed at</span>
                  <span>{new Date(energy.computed_at).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <p className="text-[#8B7355]">No energy score for this place.</p>
            )}
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#36454F] mb-4">Tag Scores (0–1)</h2>
            {tags ? (
              <div className="space-y-2 text-[#36454F]">
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Cozy</span>
                  <span className="font-mono">{tags.cozy_score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Date night</span>
                  <span className="font-mono">{tags.date_night_score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Late night</span>
                  <span className="font-mono">{tags.late_night_score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">After work</span>
                  <span className="font-mono">{tags.after_work_score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B7355]">Scene</span>
                  <span className="font-mono">{tags.scene_score}</span>
                </div>
                <div className="flex justify-between text-sm mt-4">
                  <span className="text-[#8B7355]">Version</span>
                  <span>{tags.version}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8B7355]">Depends on</span>
                  <span>{tags.depends_on_energy_version}</span>
                </div>
              </div>
            ) : (
              <p className="text-[#8B7355]">No tag scores for this place.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
