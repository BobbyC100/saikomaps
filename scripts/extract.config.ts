/**
 * SaikoAI Batch Extraction — Config
 * API key via ANTHROPIC_API_KEY env var (standard SDK behavior).
 */

export const config = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  inputDir: 'data/input',
  outputDir: 'data/output',
  delayBetweenCalls: 2000,
  promptVersion: 'v2.2',
} as const;
