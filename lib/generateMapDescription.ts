import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function generateMapDescription(mapData: {
  title: string;
  places: { name: string; category: string; neighborhood?: string }[];
}): Promise<string> {
  const placeList = mapData.places
    .map((p) => `${p.name} (${p.category}${p.neighborhood ? `, ${p.neighborhood}` : ''})`)
    .join(', ');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 150,
    system: `You write one-sentence descriptions for curated location maps. Your voice is relaxed West Coast — Los Angeles, specifically. Not surfer cliché, not trying hard. Just the natural cadence of someone from the eastside who knows their neighborhood and doesn't need to oversell anything. Think: a friend texting you where to go. Periods, not exclamation marks. You might say "worth it" or "go early" or "the real one" but never "hidden gem" or "must-visit" or "curated collection." No superlatives. No "whether you're a foodie." No "discover" or "explore." One sentence, occasionally two. Never three. Slightly opinionated is good. Dry is good. The description should complement the map title, not restate it.`,
    messages: [
      {
        role: 'user',
        content: `Write a one-sentence description for a map called "${mapData.title}" featuring these places: ${placeList}`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text.trim() : '';
}
