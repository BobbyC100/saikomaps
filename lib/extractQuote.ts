/**
 * Quote Extraction Utility
 * Extracts displayable quotes from editorial source content
 */

interface Source {
  publication?: string;
  content?: string;
  url?: string;
  trust_level?: string;
  name?: string;
}

interface ExtractedQuote {
  quote: string;
  source: string;
  url?: string;
}

/**
 * Extract a display quote from sources array
 * Priority: editorial sources first, then by content quality
 */
export function extractQuoteFromSources(sources: Source[]): ExtractedQuote | null {
  if (!sources || sources.length === 0) return null;
  
  // Sort by trust level (editorial first)
  const sortedSources = [...sources].sort((a, b) => {
    const trustOrder: Record<string, number> = { editorial: 0, aggregator: 1, user: 2 };
    const aOrder = trustOrder[a.trust_level || ''] ?? 3;
    const bOrder = trustOrder[b.trust_level || ''] ?? 3;
    return aOrder - bOrder;
  });
  
  // Find first source with content
  const sourceWithContent = sortedSources.find(s => s.content && s.content.length > 50);
  if (!sourceWithContent) return null;
  
  const quote = extractBestSentences(sourceWithContent.content!);
  if (!quote) return null;
  
  return {
    quote,
    source: sourceWithContent.publication || sourceWithContent.name || 'Editorial',
    url: sourceWithContent.url,
  };
}

/**
 * Extract 1-2 compelling sentences from article content
 * Aims for 100-200 characters
 */
function extractBestSentences(content: string): string | null {
  if (!content) return null;
  
  // Clean the content
  const cleaned = content
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
  
  // Split into sentences (basic approach)
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length === 0) {
    // Fallback: just truncate at word boundary
    return truncateQuote(cleaned, 180);
  }
  
  // Strategy 1: Find a sentence that starts with a descriptor
  // These tend to be more quotable than "I went to..." sentences
  const goodStarters = sentences.filter(s => {
    const trimmed = s.trim();
    return (
      /^(The|This|It's|A |An |Their|Here|With|At|From)/i.test(trimmed) &&
      trimmed.length > 40 &&
      trimmed.length < 200
    );
  });
  
  if (goodStarters.length > 0) {
    // Return first good sentence, maybe with second if short
    let quote = goodStarters[0].trim();
    if (quote.length < 100 && goodStarters.length > 1) {
      quote += ' ' + goodStarters[1].trim();
    }
    return truncateQuote(quote, 200);
  }
  
  // Strategy 2: Just take first 1-2 sentences
  let quote = sentences[0]?.trim();
  if (!quote) return truncateQuote(cleaned, 200);
  
  if (quote.length < 80 && sentences.length > 1) {
    const secondSentence = sentences[1]?.trim();
    if (secondSentence) {
      quote += ' ' + secondSentence;
    }
  }
  
  return truncateQuote(quote, 200);
}

/**
 * Ensure quote is within display limits
 */
function truncateQuote(quote: string, maxLength: number = 200): string {
  if (quote.length <= maxLength) return quote;
  
  // Try to end at a sentence boundary
  const truncated = quote.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclaim = truncated.lastIndexOf('!');
  
  const lastBoundary = Math.max(lastPeriod, lastQuestion, lastExclaim);
  
  if (lastBoundary > maxLength * 0.6) {
    return truncated.slice(0, lastBoundary + 1);
  }
  
  // Fallback: end at word boundary with ellipsis
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.slice(0, lastSpace) + '…';
}
