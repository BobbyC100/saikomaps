import { permanentRedirect } from 'next/navigation';

/**
 * Redirect /group/[slug] → /actor/[slug] (308 permanent)
 * Preserves legacy "Part of X family" links.
 */
export default async function GroupRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/actor/${slug}`);
}
